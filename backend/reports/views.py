from calendar import monthrange
from datetime import date, timedelta

from django.core.cache import cache
from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import AppNotification
from accounts.permissions import IsManagerOrAbove

from attendance.models import Attendance, AttendanceCorrectionRequest, AttendanceCorrectionStatus
from attendance.utils import attendance_anomaly
from employees.models import Employee
from leave_management.models import LeaveRequest, LeaveStatus
from leave_management.leave_rules import employee_leave_balance_rows
from employees.org_scope import filter_by_employee_org, filter_employees_by_org, organization_id_from_request
from decimal import Decimal

from payroll.models import (
    EmployeeCompensation,
    PayrollEmployeeResult,
    PayrollRecord,
    PayrollRun,
    PayrollRunStatus,
)


def _next_birthday_date(dob: date, today: date) -> date:
    """Calendar date of the next occurrence of this month/day (handles Feb 29)."""
    m, d = dob.month, dob.day
    try:
        candidate = date(today.year, m, d)
    except ValueError:
        candidate = date(today.year, 2, 28)
    if candidate < today:
        try:
            return date(today.year + 1, m, d)
        except ValueError:
            return date(today.year + 1, 2, 28)
    return candidate


def _upcoming_birthdays(limit: int = 8, org_id: int | None = None) -> list[dict]:
    today = timezone.localdate()
    rows = []
    emp_qs = Employee.objects.select_related("user").filter(date_of_birth__isnull=False)
    emp_qs = filter_employees_by_org(emp_qs, org_id)
    for emp in emp_qs:
        dob = emp.date_of_birth
        nxt = _next_birthday_date(dob, today)
        u = emp.user
        name = f"{u.first_name} {u.last_name}".strip() or u.email
        rows.append(
            {
                "employee_code": emp.employee_code,
                "name": name,
                "designation": emp.designation or "",
                "date_of_birth": dob.isoformat(),
                "next_birthday": nxt.isoformat(),
                "days_until": (nxt - today).days,
            }
        )
    rows.sort(key=lambda r: (r["days_until"], r["name"]))
    return rows[:limit]


def _work_anniversaries(limit: int = 8, org_id: int | None = None) -> list[dict]:
    today = timezone.localdate()
    rows = []
    emp_qs = Employee.objects.select_related("user").filter(date_of_joining__isnull=False)
    emp_qs = filter_employees_by_org(emp_qs, org_id)
    for emp in emp_qs:
        doj = emp.date_of_joining
        years = today.year - doj.year - ((today.month, today.day) < (doj.month, doj.day))
        if years < 1:
            continue
        this_year_anniv = date(today.year, doj.month, min(doj.day, 28 if doj.month == 2 else doj.day))
        if this_year_anniv < today:
            next_anniv = date(today.year + 1, doj.month, min(doj.day, 28 if doj.month == 2 else doj.day))
        else:
            next_anniv = this_year_anniv
        rows.append(
            {
                "employee_code": emp.employee_code,
                "name": f"{emp.user.first_name} {emp.user.last_name}".strip() or emp.user.email,
                "designation": emp.designation or "",
                "department": emp.department or "",
                "profile_image": emp.profile_image.url if getattr(emp, "profile_image", None) else None,
                "date_of_joining": doj.isoformat(),
                "years_completed": years,
                "next_anniversary": next_anniv.isoformat(),
                "days_until": (next_anniv - today).days,
            }
        )
    rows.sort(key=lambda r: (r["days_until"], -r["years_completed"], r["name"]))
    return rows[:limit]


def _leave_balances_for_employee(employee) -> list[dict]:
    return employee_leave_balance_rows(employee)


def _employee_attendance_trend(employee, days: int = 14) -> list[dict]:
    from employees.week_schedule import is_weekend_day

    today = timezone.localdate()
    start = today - timedelta(days=days - 1)
    attendances = {
        a.date: a
        for a in Attendance.objects.filter(employee=employee, date__gte=start, date__lte=today)
    }
    trend = []
    d = start
    while d <= today:
        att = attendances.get(d)
        status = "weekend"
        if not is_weekend_day(employee, d):
            if not att or not att.check_in:
                status = "absent"
            else:
                anomaly = attendance_anomaly(att)
                if anomaly in ("late_checkin", "early_checkout", "short_hours"):
                    status = "late"
                elif anomaly == "missing_checkout":
                    status = "incomplete"
                else:
                    status = "present"
        trend.append({"date": d.isoformat(), "status": status})
        d += timedelta(days=1)
    return trend


_CORRECTION_TYPE_LABELS = {
    "mark_present": "Mark present",
    "mark_exact_time": "Exact time",
    "mark_leave": "Mark leave",
    "manual_review": "Manual review",
}


def _employee_display_name(emp: Employee) -> str:
    u = emp.user
    return f"{u.first_name} {u.last_name}".strip() or u.email


def _build_action_queue(
    *,
    org_id: int | None,
    active_employee_ids: list[int],
    leave_qs,
    pending_payroll_runs,
    today: date,
) -> dict:
    pending_leave_count = leave_qs.filter(status=LeaveStatus.PENDING).count()

    correction_qs = AttendanceCorrectionRequest.objects.filter(
        status=AttendanceCorrectionStatus.PENDING,
        attendance__employee_id__in=active_employee_ids,
    )
    correction_qs = filter_by_employee_org(correction_qs, org_id, employee_prefix="attendance__employee")
    pending_correction_count = correction_qs.count()

    pending_payroll_count = pending_payroll_runs.count()

    onboarding_qs = Employee.objects.filter(
        user__is_active=True,
        user__onboarding_pending=True,
    )
    onboarding_qs = filter_employees_by_org(onboarding_qs, org_id)
    onboarding_pending_count = onboarding_qs.count()

    counts = {
        "pending_leaves": pending_leave_count,
        "pending_attendance_corrections": pending_correction_count,
        "pending_payroll_runs": pending_payroll_count,
        "onboarding_pending": onboarding_pending_count,
    }
    total = sum(counts.values())

    items: list[dict] = []

    for lr in (
        leave_qs.filter(status=LeaveStatus.PENDING)
        .select_related("employee", "employee__user")
        .order_by("-created_at")[:4]
    ):
        u = lr.employee.user
        name = f"{u.first_name} {u.last_name}".strip() or u.email
        leave_label = str(lr.leave_type or "").replace("_", " ").title() or "Leave"
        items.append(
            {
                "key": f"leave-{lr.id}",
                "type": "leave",
                "title": name,
                "subtitle": f"{leave_label} · {lr.start_date:%b %d} – {lr.end_date:%b %d}",
                "href": "/leaves",
                "created_at": lr.created_at.isoformat(),
            }
        )

    for corr in (
        correction_qs.select_related(
            "attendance",
            "attendance__employee",
            "attendance__employee__user",
        ).order_by("-created_at")[:4]
    ):
        emp = corr.attendance.employee
        name = _employee_display_name(emp)
        att_date = corr.attendance.date
        req_label = _CORRECTION_TYPE_LABELS.get(corr.request_type, "Correction")
        items.append(
            {
                "key": f"correction-{corr.id}",
                "type": "attendance",
                "title": name,
                "subtitle": f"{req_label} · {att_date:%b %d, %Y}",
                "href": "/attendance?tab=approvals",
                "created_at": corr.created_at.isoformat(),
            }
        )

    for run in pending_payroll_runs.order_by("-updated_at", "-created_at")[:2]:
        period = date(run.period_year, run.period_month, 1).strftime("%B %Y")
        items.append(
            {
                "key": f"payroll-{run.id}",
                "type": "payroll",
                "title": f"Payroll · {period}",
                "subtitle": "Draft run needs review",
                "href": "/payroll?tab=runs",
                "created_at": (run.updated_at or run.created_at).isoformat(),
            }
        )

    for emp in onboarding_qs.select_related("user").order_by("-user__date_joined")[:3]:
        items.append(
            {
                "key": f"onboarding-{emp.id}",
                "type": "onboarding",
                "title": _employee_display_name(emp),
                "subtitle": "Invite pending · activate account",
                "href": "/employees",
                "created_at": emp.user.date_joined.isoformat() if emp.user.date_joined else today.isoformat(),
            }
        )

    items.sort(key=lambda row: row["created_at"], reverse=True)

    return {"total": total, "counts": counts, "items": items[:6]}


def _build_attendance_health(
    active_employees,
    active_employee_ids: list[int],
    leave_qs,
    att_qs_org,
    today: date,
) -> dict:
    """Month-to-date person-day mix: present, late check-in, absent, on approved leave."""
    from employees.week_schedule import is_weekend_day

    month_start = today.replace(day=1)
    headcount = len(active_employee_ids)
    empty = {
        "month_label": month_start.strftime("%B %Y"),
        "headcount": headcount,
        "working_slots": 0,
        "present_pct": 0,
        "late_pct": 0,
        "absent_pct": 0,
        "on_leave_pct": 0,
        "present_days": 0,
        "late_days": 0,
        "absent_days": 0,
        "on_leave_days": 0,
        "metrics": [],
    }
    if headcount == 0:
        return empty

    employees = list(active_employees.select_related("shift_template"))
    month_att = att_qs_org.filter(date__gte=month_start, date__lte=today).select_related("employee")
    att_map = {(a.employee_id, a.date): a for a in month_att}

    month_leaves = list(
        leave_qs.filter(
            status=LeaveStatus.APPROVED,
            start_date__lte=today,
            end_date__gte=month_start,
        ).values("employee_id", "start_date", "end_date")
    )

    def employee_on_leave(emp_id: int, d: date) -> bool:
        return any(
            row["employee_id"] == emp_id and row["start_date"] <= d <= row["end_date"] for row in month_leaves
        )

    present_days = 0
    late_days = 0
    absent_days = 0
    on_leave_days = 0

    d = month_start
    while d <= today:
        for emp in employees:
            if is_weekend_day(emp, d):
                continue
            if employee_on_leave(emp.id, d):
                on_leave_days += 1
                continue
            att = att_map.get((emp.id, d))
            if att and att.check_in:
                present_days += 1
                if attendance_anomaly(att) == "late_checkin":
                    late_days += 1
            else:
                absent_days += 1
        d += timedelta(days=1)

    working_slots = present_days + absent_days + on_leave_days

    def pct(part: int, whole: int) -> float:
        return round(100 * part / whole, 1) if whole else 0.0

    present_pct = pct(present_days, working_slots)
    absent_pct = pct(absent_days, working_slots)
    on_leave_pct = pct(on_leave_days, working_slots)
    late_pct = pct(late_days, present_days) if present_days else 0.0

    return {
        "month_label": month_start.strftime("%B %Y"),
        "headcount": headcount,
        "working_slots": working_slots,
        "present_pct": present_pct,
        "late_pct": late_pct,
        "absent_pct": absent_pct,
        "on_leave_pct": on_leave_pct,
        "present_days": present_days,
        "late_days": late_days,
        "absent_days": absent_days,
        "on_leave_days": on_leave_days,
        "metrics": [
            {"key": "present", "label": "Present", "pct": present_pct, "count": present_days},
            {"key": "late", "label": "Late arrival", "pct": late_pct, "count": late_days},
            {"key": "absent", "label": "Absent", "pct": absent_pct, "count": absent_days},
            {"key": "on_leave", "label": "On leave", "pct": on_leave_pct, "count": on_leave_days},
        ],
    }


def _build_payroll_snapshot(
    *,
    org_id: int | None,
    active_employee_ids: list[int],
    active_count: int,
    payroll_run: PayrollRun | None,
    payroll_results,
    pending_payroll_runs,
    today: date,
) -> dict:
    """Current-month pay run totals, setup gaps, and draft runs."""
    period_label = date(today.year, today.month, 1).strftime("%B %Y")

    missing_compensation = 0
    if org_id and active_employee_ids:
        with_comp = EmployeeCompensation.objects.filter(
            organization_id=org_id,
            employee_id__in=active_employee_ids,
        ).count()
        missing_compensation = max(active_count - with_comp, 0)

    net_total = Decimal("0")
    gross_total = Decimal("0")
    employees_in_run = 0
    employees_with_pay = 0
    on_hold = 0
    status = None
    run_id = None

    if payroll_run:
        status = payroll_run.status
        run_id = payroll_run.id
        agg = payroll_results.aggregate(net=Sum("net_pay"), gross=Sum("gross_prorated"))
        net_total = agg["net"] or Decimal("0")
        gross_total = agg["gross"] or Decimal("0")
        employees_in_run = payroll_results.count()
        employees_with_pay = payroll_results.filter(net_pay__gt=0).count()
        on_hold = payroll_results.filter(is_on_hold=True).count()

    draft_runs = [
        {
            "id": run.id,
            "period_label": date(run.period_year, run.period_month, 1).strftime("%b %Y"),
            "status": run.status,
        }
        for run in pending_payroll_runs.order_by("-period_year", "-period_month")[:4]
    ]

    return {
        "period_label": period_label,
        "has_run": payroll_run is not None,
        "run_id": run_id,
        "status": status,
        "net_payout": float(net_total),
        "gross_payout": float(gross_total),
        "employees_in_run": employees_in_run,
        "employees_with_pay": employees_with_pay,
        "employees_on_hold": on_hold,
        "missing_compensation": missing_compensation,
        "active_employees": active_count,
        "draft_runs_count": pending_payroll_runs.count(),
        "draft_runs": draft_runs,
    }


def _build_headcount_snapshot(active_employees, org_id: int | None, today: date, *, limit: int = 5) -> dict:
    """Active headcount, new joiners this month, and onboarding invites."""
    month_start = today.replace(day=1)
    all_employees = filter_employees_by_org(Employee.objects.select_related("user"), org_id)

    active_count = active_employees.count()
    onboarding_qs = all_employees.filter(user__onboarding_pending=True)
    onboarding_count = onboarding_qs.count()
    inactive_count = all_employees.filter(user__is_active=False, user__onboarding_pending=False).count()

    new_this_month_qs = active_employees.filter(
        Q(date_of_joining__gte=month_start, date_of_joining__lte=today)
        | Q(
            date_of_joining__isnull=True,
            user__date_joined__date__gte=month_start,
            user__date_joined__date__lte=today,
        )
    )
    new_this_month = new_this_month_qs.count()

    def join_label(emp: Employee) -> str:
        d = emp.date_of_joining
        if not d and emp.user.date_joined:
            d = timezone.localtime(emp.user.date_joined).date()
        return d.strftime("%b %d, %Y") if d else "—"

    recent_joiners = []
    for emp in new_this_month_qs.order_by("-date_of_joining", "-user__date_joined")[:limit]:
        recent_joiners.append(
            {
                "employee_id": emp.id,
                "name": _employee_display_name(emp),
                "designation": emp.designation or "",
                "department": emp.department or "",
                "detail": f"Joined {join_label(emp)}",
            }
        )

    pending_onboarding = []
    for emp in onboarding_qs.order_by("-user__date_joined")[:limit]:
        pending_onboarding.append(
            {
                "employee_id": emp.id,
                "name": _employee_display_name(emp),
                "designation": emp.designation or "",
                "department": emp.department or "",
                "detail": "Waiting to activate account",
            }
        )

    return {
        "month_label": month_start.strftime("%B %Y"),
        "active": active_count,
        "new_this_month": new_this_month,
        "onboarding_pending": onboarding_count,
        "inactive": inactive_count,
        "recent_joiners": recent_joiners,
        "pending_onboarding": pending_onboarding,
        "has_more_joiners": new_this_month > limit,
        "has_more_onboarding": onboarding_count > limit,
    }


def _build_team_pulse(att_today, leave_qs, today: date, *, limit: int = 14) -> dict:
    """Chronological feed of today's check-ins, check-outs, and leave requests."""
    events: list[dict] = []

    for att in att_today.filter(check_in__isnull=False).select_related("employee", "employee__user"):
        emp = att.employee
        late = attendance_anomaly(att) == "late_checkin"
        events.append(
            {
                "id": f"check-in-{att.id}",
                "type": "check_in",
                "at": att.check_in.isoformat(),
                "name": _employee_display_name(emp),
                "department": emp.department or "",
                "detail": "Checked in · late" if late else "Checked in",
            }
        )

    for att in att_today.filter(check_out__isnull=False).select_related("employee", "employee__user"):
        emp = att.employee
        events.append(
            {
                "id": f"check-out-{att.id}",
                "type": "check_out",
                "at": att.check_out.isoformat(),
                "name": _employee_display_name(emp),
                "department": emp.department or "",
                "detail": "Checked out",
            }
        )

    for lr in (
        leave_qs.filter(created_at__date=today)
        .select_related("employee", "employee__user")
        .order_by("-created_at")[:12]
    ):
        emp = lr.employee
        leave_label = str(lr.leave_type or "").replace("_", " ").title() or "Leave"
        status_label = str(lr.status or "").replace("_", " ").title()
        events.append(
            {
                "id": f"leave-{lr.id}",
                "type": "leave",
                "at": lr.created_at.isoformat(),
                "name": _employee_display_name(emp),
                "department": emp.department or "",
                "detail": f"{status_label} {leave_label} request",
                "status": lr.status,
            }
        )

    events.sort(key=lambda row: row["at"], reverse=True)
    trimmed = events[:limit]

    return {
        "date_label": today.strftime("%A, %b %d"),
        "total_events": len(events),
        "events": trimmed,
        "has_more": len(events) > limit,
    }


def _build_out_today(
    active_employees,
    leave_qs,
    att_today,
    today: date,
    *,
    limit_per_group: int = 6,
) -> dict:
    """Who is on approved leave, absent, or late today (scheduled workdays only)."""
    from employees.week_schedule import is_weekend_day

    employees = list(active_employees.select_related("user", "shift_template"))

    on_leave_ids: set[int] = set()
    on_leave_rows: list[dict] = []
    for lr in (
        leave_qs.filter(
            status=LeaveStatus.APPROVED,
            start_date__lte=today,
            end_date__gte=today,
        )
        .select_related("employee", "employee__user")
        .order_by("employee__user__first_name", "employee__user__last_name")
    ):
        emp = lr.employee
        if emp.id in on_leave_ids:
            continue
        on_leave_ids.add(emp.id)
        leave_label = str(lr.leave_type or "").replace("_", " ").title() or "Leave"
        on_leave_rows.append(
            {
                "employee_id": emp.id,
                "name": _employee_display_name(emp),
                "designation": emp.designation or "",
                "department": emp.department or "",
                "detail": f"{leave_label} · until {lr.end_date:%b %d}",
            }
        )

    present_ids = set(
        att_today.filter(check_in__isnull=False, check_out__isnull=False).values_list("employee_id", flat=True)
    )

    late_rows: list[dict] = []
    for att in att_today.filter(check_in__isnull=False).select_related("employee", "employee__user"):
        if attendance_anomaly(att) != "late_checkin":
            continue
        emp = att.employee
        check_in_label = timezone.localtime(att.check_in).strftime("%I:%M %p").lstrip("0") if att.check_in else ""
        late_rows.append(
            {
                "employee_id": emp.id,
                "name": _employee_display_name(emp),
                "designation": emp.designation or "",
                "department": emp.department or "",
                "detail": f"Late · in at {check_in_label}" if check_in_label else "Late check-in",
            }
        )
    late_rows.sort(key=lambda row: row["name"].lower())

    absent_rows: list[dict] = []
    for emp in employees:
        if is_weekend_day(emp, today):
            continue
        if emp.id in on_leave_ids or emp.id in present_ids:
            continue
        absent_rows.append(
            {
                "employee_id": emp.id,
                "name": _employee_display_name(emp),
                "designation": emp.designation or "",
                "department": emp.department or "",
                "detail": "No check-in yet today",
            }
        )
    absent_rows.sort(key=lambda row: row["name"].lower())

    counts = {
        "on_leave": len(on_leave_rows),
        "absent": len(absent_rows),
        "late": len(late_rows),
    }
    return {
        "date_label": today.strftime("%A, %b %d"),
        "counts": counts,
        "total_out": counts["on_leave"] + counts["absent"] + counts["late"],
        "on_leave": on_leave_rows[:limit_per_group],
        "absent": absent_rows[:limit_per_group],
        "late": late_rows[:limit_per_group],
        "has_more": {
            "on_leave": len(on_leave_rows) > limit_per_group,
            "absent": len(absent_rows) > limit_per_group,
            "late": len(late_rows) > limit_per_group,
        },
    }


def _build_leave_pipeline(leave_qs, today: date) -> dict:
    """Leave requests submitted in the current calendar month, by final status."""
    month_start = today.replace(day=1)
    month_qs = leave_qs.filter(created_at__date__gte=month_start)
    pending = month_qs.filter(status=LeaveStatus.PENDING).count()
    approved = month_qs.filter(status=LeaveStatus.APPROVED).count()
    rejected = month_qs.filter(status=LeaveStatus.REJECTED).count()
    total = pending + approved + rejected
    return {
        "month_label": month_start.strftime("%B %Y"),
        "total": total,
        "pending": pending,
        "approved": approved,
        "rejected": rejected,
        "pending_now": leave_qs.filter(status=LeaveStatus.PENDING).count(),
        "stages": [
            {"key": "pending", "label": "Pending", "count": pending},
            {"key": "approved", "label": "Approved", "count": approved},
            {"key": "rejected", "label": "Rejected", "count": rejected},
        ],
    }


class DashboardSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsManagerOrAbove]

    def get(self, request):
        today = timezone.localdate()
        cache_key = f"dashboard:summary:{request.user.role}:{today.isoformat()}"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        today = timezone.localdate()
        org_id = organization_id_from_request(request)
        active_employees = Employee.objects.filter(user__is_active=True, user__onboarding_pending=False)
        active_employees = filter_employees_by_org(active_employees, org_id)
        active_employee_ids = list(active_employees.values_list("id", flat=True))

        att_today = Attendance.objects.filter(date=today, employee_id__in=active_employee_ids)
        att_qs_org = Attendance.objects.filter(employee_id__in=active_employee_ids)
        present_today = att_today.filter(check_in__isnull=False, check_out__isnull=False).values("employee_id").distinct().count()
        leave_qs = LeaveRequest.objects.filter(employee_id__in=active_employee_ids)
        on_leave_today = leave_qs.filter(
            status=LeaveStatus.APPROVED,
            start_date__lte=today,
            end_date__gte=today,
        ).count()
        absent_today = max(active_employees.count() - present_today - on_leave_today, 0)

        late_arrivals_today = 0
        for att in att_today.filter(check_in__isnull=False).select_related("employee"):
            if attendance_anomaly(att) == "late_checkin":
                late_arrivals_today += 1

        attendance_weekly_trend = []
        for offset in range(6, -1, -1):
            d = today - timedelta(days=offset)
            day_att = att_qs_org.filter(date=d, check_in__isnull=False, check_out__isnull=False)
            attendance_weekly_trend.append(
                {
                    "date": d.isoformat(),
                    "label": d.strftime("%a"),
                    "present": day_att.values("employee_id").distinct().count(),
                }
            )

        dept_rows = (
            filter_employees_by_org(Employee.objects.exclude(department=""), org_id)
            .values("department")
            .annotate(count=Count("id"))
            .order_by("-count")[:8]
        )
        department_breakdown = [
            {"name": row["department"] or "Unassigned", "value": row["count"]} for row in dept_rows
        ]

        # Last 12 months (chronological): attendance days with check-in, Engineering vs other
        y, mo = today.year, today.month
        month_pairs = []
        for _ in range(12):
            month_pairs.append((y, mo))
            if mo == 1:
                y -= 1
                mo = 12
            else:
                mo -= 1
        month_pairs.reverse()

        team_performance = []
        for y, m in month_pairs:
            month_start = date(y, m, 1)
            _, last = monthrange(y, m)
            month_end = date(y, m, last)
            month_attendance = att_qs_org.filter(
                date__gte=month_start,
                date__lte=month_end,
                check_in__isnull=False,
                check_out__isnull=False,
                employee__user__is_active=True,
            )
            eng = month_attendance.filter(employee__department__icontains="engineering").count()
            other = month_attendance.exclude(employee__department__icontains="engineering").count()
            label = month_start.strftime("%b %y")
            team_performance.append(
                {"month": label, "engineering": eng, "other_departments": other}
            )

        recent_qs = leave_qs.select_related("employee", "employee__user").order_by("-created_at")[:6]
        recent_leaves_list = []
        for lr in recent_qs:
            u = lr.employee.user
            recent_leaves_list.append(
                {
                    "id": lr.id,
                    "start_date": lr.start_date,
                    "end_date": lr.end_date,
                    "status": lr.status,
                    "leave_type": lr.leave_type,
                    "employee_name": f"{u.first_name} {u.last_name}".strip() or u.email,
                }
            )

        upcoming_birthdays = _upcoming_birthdays(limit=8, org_id=org_id)
        work_anniversaries = _work_anniversaries(limit=8, org_id=org_id)

        payroll_run = None
        if org_id:
            payroll_run = PayrollRun.objects.filter(
                organization_id=org_id,
                period_year=today.year,
                period_month=today.month,
            ).first()
        payroll_results = PayrollEmployeeResult.objects.none()
        if payroll_run:
            payroll_results = payroll_run.employee_results.all()

        payroll_month_total = payroll_results.aggregate(total=Sum("net_pay"))["total"] or 0
        employees_paid = payroll_results.filter(net_pay__gt=0).count() if payroll_run else 0

        pending_payroll_runs = PayrollRun.objects.filter(status=PayrollRunStatus.DRAFT)
        if org_id:
            pending_payroll_runs = pending_payroll_runs.filter(organization_id=org_id)
        pending_payroll_count = pending_payroll_runs.count()

        action_queue = _build_action_queue(
            org_id=org_id,
            active_employee_ids=active_employee_ids,
            leave_qs=leave_qs,
            pending_payroll_runs=pending_payroll_runs,
            today=today,
        )
        leave_pipeline = _build_leave_pipeline(leave_qs, today)
        attendance_health = _build_attendance_health(
            active_employees,
            active_employee_ids,
            leave_qs,
            att_qs_org,
            today,
        )
        out_today = _build_out_today(active_employees, leave_qs, att_today, today)
        team_pulse = _build_team_pulse(att_today, leave_qs, today)
        headcount_snapshot = _build_headcount_snapshot(active_employees, org_id, today)
        payroll_snapshot = _build_payroll_snapshot(
            org_id=org_id,
            active_employee_ids=active_employee_ids,
            active_count=active_employees.count(),
            payroll_run=payroll_run,
            payroll_results=payroll_results,
            pending_payroll_runs=pending_payroll_runs,
            today=today,
        )

        payload = {
            "employees_total": active_employees.count(),
            "attendance_today": present_today,
            "present_today": present_today,
            "absent_today": absent_today,
            "on_leave_today": on_leave_today,
            "pending_leaves": leave_qs.filter(status=LeaveStatus.PENDING).count(),
            "payroll_month_total": payroll_month_total,
            "payroll_employees_paid": employees_paid,
            "payroll_run_status": payroll_run.status if payroll_run else None,
            "pending_payroll_runs": pending_payroll_count,
            "recent_leaves": list(
                leave_qs.filter(status=LeaveStatus.PENDING)
                .order_by("-created_at")[:5]
                .values("id", "start_date", "end_date", "status", "leave_type")
            ),
            "department_breakdown": department_breakdown,
            "team_performance": team_performance,
            "recent_leave_activity": recent_leaves_list,
            "upcoming_birthdays": upcoming_birthdays,
            "work_anniversaries": work_anniversaries,
            "attendance_weekly_trend": attendance_weekly_trend,
            "action_queue": action_queue,
            "leave_pipeline": leave_pipeline,
            "attendance_health": attendance_health,
            "out_today": out_today,
            "team_pulse": team_pulse,
            "headcount_snapshot": headcount_snapshot,
            "payroll_snapshot": payroll_snapshot,
        }
        cache.set(cache_key, payload, timeout=45)
        return Response(payload)


class EmployeeDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        today = timezone.localdate()
        cache_key = f"dashboard:me:{user.id}:{today.isoformat()}"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        profile = getattr(user, "employee_profile", None)
        if not profile:
            return Response({"error": "No employee profile."}, status=status.HTTP_400_BAD_REQUEST)
        month_start = today.replace(day=1)
        att_qs = Attendance.objects.filter(employee=profile, date__gte=month_start)
        leave_qs = LeaveRequest.objects.filter(employee=profile)
        notifications = list(
            AppNotification.objects.filter(user=user)
            .order_by("-created_at")[:6]
            .values("id", "title", "message", "type", "is_read", "created_at")
        )

        payload = {
            "attendance_days_this_month": att_qs.filter(check_in__isnull=False).count(),
            "pending_my_leaves": leave_qs.filter(status=LeaveStatus.PENDING).count(),
            "leave_balances": _leave_balances_for_employee(profile),
            "attendance_trend": _employee_attendance_trend(profile, days=14),
            "notifications": notifications,
            "upcoming_holidays": [],
            "profile": {
                "employee_code": profile.employee_code,
                "department": profile.department,
                "designation": profile.designation,
                "phone": profile.phone,
                "address": profile.address,
                "date_of_joining": profile.date_of_joining,
                "date_of_birth": profile.date_of_birth,
                "manager_id": profile.manager_id,
                "profile_image": profile.profile_image.url if profile.profile_image else None,
            },
        }
        cache.set(cache_key, payload, timeout=30)
        return Response(payload)


class AttendanceReportView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsManagerOrAbove]

    def get(self, request):
        year = int(request.query_params.get("year", timezone.localdate().year))
        month = int(request.query_params.get("month", timezone.localdate().month))
        _, last_day = monthrange(year, month)
        start = date(year, month, 1)
        end = date(year, month, last_day)
        org_id = organization_id_from_request(request)
        base = Attendance.objects.filter(date__gte=start, date__lte=end)
        base = filter_by_employee_org(base, org_id)
        qs = base.values("date").annotate(present=Count("id", filter=Q(check_in__isnull=False)))
        by_day = {str(row["date"]): row["present"] for row in qs}
        total_records = base.count()
        return Response(
            {
                "year": year,
                "month": month,
                "by_day": by_day,
                "total_logs": total_records,
            }
        )


class PayrollReportView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsManagerOrAbove]

    def get(self, request):
        year = int(request.query_params.get("year", timezone.localdate().year))
        month = int(request.query_params.get("month", timezone.localdate().month))
        org_id = organization_id_from_request(request)
        qs = PayrollRecord.objects.filter(period_year=year, period_month=month).select_related(
            "employee", "employee__user"
        )
        qs = filter_by_employee_org(qs, org_id)
        rows = []
        for r in qs:
            u = r.employee.user
            rows.append(
                {
                    "employee_code": r.employee.employee_code,
                    "name": f"{u.first_name} {u.last_name}".strip() or u.email,
                    "basic_salary": str(r.basic_salary),
                    "allowances": str(r.allowances),
                    "deductions": str(r.deductions),
                    "tax": str(r.tax),
                    "net_salary": str(r.net_salary),
                }
            )
        agg = qs.aggregate(
            total_net=Sum("net_salary"),
            total_basic=Sum("basic_salary"),
        )
        return Response(
            {
                "year": year,
                "month": month,
                "rows": rows,
                "totals": {
                    "net_salary": str(agg["total_net"] or 0),
                    "basic_salary": str(agg["total_basic"] or 0),
                },
            }
        )
