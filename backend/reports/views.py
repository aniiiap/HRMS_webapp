from calendar import monthrange
from datetime import date

from django.core.cache import cache
from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsManagerOrAbove

from attendance.models import Attendance
from employees.models import Employee
from leave_management.models import LeaveRequest, LeaveStatus
from payroll.models import PayrollRecord


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


def _upcoming_birthdays(limit: int = 8) -> list[dict]:
    today = timezone.localdate()
    rows = []
    for emp in Employee.objects.select_related("user").filter(date_of_birth__isnull=False):
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


def _work_anniversaries(limit: int = 8) -> list[dict]:
    today = timezone.localdate()
    rows = []
    for emp in Employee.objects.select_related("user").filter(date_of_joining__isnull=False):
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


class DashboardSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsManagerOrAbove]

    def get(self, request):
        today = timezone.localdate()
        cache_key = f"dashboard:summary:{request.user.role}:{today.isoformat()}"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        today = timezone.localdate()
        active_employees = Employee.objects.filter(user__is_active=True, user__onboarding_pending=False)
        active_employee_ids = list(active_employees.values_list("id", flat=True))

        att_today = Attendance.objects.filter(date=today, employee_id__in=active_employee_ids)
        present_today = att_today.filter(check_in__isnull=False, check_out__isnull=False).values("employee_id").distinct().count()
        on_leave_today = LeaveRequest.objects.filter(
            status=LeaveStatus.APPROVED,
            start_date__lte=today,
            end_date__gte=today,
            employee_id__in=active_employee_ids,
        ).count()
        absent_today = max(active_employees.count() - present_today - on_leave_today, 0)

        dept_rows = (
            Employee.objects.exclude(department="")
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
            month_attendance = Attendance.objects.filter(
                date__gte=month_start,
                date__lte=month_end,
                check_in__isnull=False,
                check_out__isnull=False,
                employee_id__in=active_employee_ids,
                employee__user__is_active=True,
            )
            eng = month_attendance.filter(employee__department__icontains="engineering").count()
            other = month_attendance.exclude(employee__department__icontains="engineering").count()
            label = month_start.strftime("%b %y")
            team_performance.append(
                {"month": label, "engineering": eng, "other_departments": other}
            )

        recent_qs = (
            LeaveRequest.objects.select_related("employee", "employee__user")
            .order_by("-created_at")[:6]
        )
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

        upcoming_birthdays = _upcoming_birthdays(limit=8)
        work_anniversaries = _work_anniversaries(limit=8)

        payload = {
            "employees_total": Employee.objects.count(),
            "attendance_today": present_today,
            "present_today": present_today,
            "absent_today": absent_today,
            "on_leave_today": on_leave_today,
            "pending_leaves": LeaveRequest.objects.filter(status=LeaveStatus.PENDING).count(),
            "payroll_month_total": PayrollRecord.objects.filter(
                period_year=today.year,
                period_month=today.month,
            ).aggregate(total=Sum("net_salary"))["total"]
            or 0,
            "recent_leaves": list(
                LeaveRequest.objects.filter(status=LeaveStatus.PENDING)
                .order_by("-created_at")[:5]
                .values("id", "start_date", "end_date", "status", "leave_type")
            ),
            "department_breakdown": department_breakdown,
            "team_performance": team_performance,
            "recent_leave_activity": recent_leaves_list,
            "upcoming_birthdays": upcoming_birthdays,
            "work_anniversaries": work_anniversaries,
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
        payroll_last = (
            PayrollRecord.objects.filter(employee=profile).order_by("-period_year", "-period_month").first()
        )
        payload = {
            "attendance_days_this_month": att_qs.filter(check_in__isnull=False).count(),
            "pending_my_leaves": leave_qs.filter(status=LeaveStatus.PENDING).count(),
            "last_payslip": (
                {
                    "period_year": payroll_last.period_year,
                    "period_month": payroll_last.period_month,
                    "net_salary": str(payroll_last.net_salary),
                }
                if payroll_last
                else None
            ),
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
        qs = (
            Attendance.objects.filter(date__gte=start, date__lte=end)
            .values("date")
            .annotate(present=Count("id", filter=Q(check_in__isnull=False)))
        )
        by_day = {str(row["date"]): row["present"] for row in qs}
        total_records = Attendance.objects.filter(date__gte=start, date__lte=end).count()
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
        qs = PayrollRecord.objects.filter(period_year=year, period_month=month).select_related(
            "employee", "employee__user"
        )
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
