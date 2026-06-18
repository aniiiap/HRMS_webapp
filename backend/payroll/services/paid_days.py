"""
Automatic paid_days / LOP from attendance + approved leave.

See docs/PAYROLL_FLOW.md for manual vs automatic behaviour.
"""

from __future__ import annotations

from calendar import monthrange
from datetime import date, timedelta
from decimal import Decimal
from typing import TypedDict

from django.utils import timezone

from attendance.models import Attendance
from attendance.utils import attendance_anomaly
from employees.models import Employee
from employees.week_schedule import is_scheduled_working_day
from leave_management.models import LeaveRequest, LeaveStatus, LeaveType

HALF_DAY_ANOMALIES = frozenset({"late_checkin", "early_checkout", "short_hours"})


class PaidDaysBreakdown(TypedDict):
    paid_days: Decimal
    lop_days: Decimal
    unpaid_leave_days: Decimal
    absent_days: Decimal
    half_day_penalties: Decimal
    paid_leave_days: Decimal
    present_days: Decimal


def _working_days_in_month(employee: Employee, year: int, month: int) -> list[date]:
    _, last = monthrange(year, month)
    start = date(year, month, 1)
    end = date(year, month, last)
    days = []
    d = start
    while d <= end:
        if is_scheduled_working_day(employee, d):
            days.append(d)
        d += timedelta(days=1)
    return days


def _leave_date_sets(employee: Employee, month_start: date, month_end: date) -> tuple[set[date], set[date]]:
    unpaid: set[date] = set()
    paid: set[date] = set()
    leaves = LeaveRequest.objects.filter(
        employee=employee,
        status=LeaveStatus.APPROVED,
        start_date__lte=month_end,
        end_date__gte=month_start,
    )
    for leave in leaves:
        d = max(leave.start_date, month_start)
        end_d = min(leave.end_date, month_end)
        while d <= end_d:
            if is_scheduled_working_day(employee, d):
                if leave.leave_type in (LeaveType.LOP, "unpaid", "loss_of_pay"):
                    unpaid.add(d)
                else:
                    paid.add(d)
            d += timedelta(days=1)
    return unpaid, paid


def compute_paid_days_for_employee(
    employee: Employee,
    period_year: int,
    period_month: int,
    working_days: int,
) -> PaidDaysBreakdown:
    """
    Derive paid_days and lop_days for a payroll period.

    - working_days: payroll calendar denominator (from PayrollRun).
    - Weekdays in the month are evaluated up to working_days count.
    - Approved paid leave = full pay; unpaid leave = LOP.
    - Present attendance (check-in) with no blocking anomaly = full pay.
    - late_checkin / early_checkout / short_hours = 0.5 day LOP each.
    - missing_checkout / absent = full day LOP.
    """
    wd = Decimal(str(working_days))
    if wd <= 0:
        return PaidDaysBreakdown(
            paid_days=Decimal("0"),
            lop_days=Decimal("0"),
            unpaid_leave_days=Decimal("0"),
            absent_days=Decimal("0"),
            half_day_penalties=Decimal("0"),
            paid_leave_days=Decimal("0"),
            present_days=Decimal("0"),
        )

    _, last = monthrange(period_year, period_month)
    month_start = date(period_year, period_month, 1)
    month_end = date(period_year, period_month, last)

    unpaid_dates, paid_leave_dates = _leave_date_sets(employee, month_start, month_end)
    attendances = {
        a.date: a
        for a in Attendance.objects.filter(
            employee=employee,
            date__gte=month_start,
            date__lte=month_end,
        )
    }

    today = timezone.localdate()
    weekdays = _working_days_in_month(employee, period_year, period_month)

    if employee.date_of_joining:
        weekdays = [d for d in weekdays if d >= employee.date_of_joining]

    eval_days = weekdays[: int(working_days)] if len(weekdays) >= int(working_days) else weekdays

    unpaid_leave_days = Decimal("0")
    absent_days = Decimal("0")
    half_day_penalties = Decimal("0")
    paid_leave_days = Decimal("0")
    present_days = Decimal("0")

    day_credits: list[Decimal] = []

    for d in eval_days:
        credit = Decimal("1")

        if d in unpaid_dates:
            credit = Decimal("0")
            unpaid_leave_days += Decimal("1")
        elif d in paid_leave_dates:
            credit = Decimal("1")
            paid_leave_days += Decimal("1")
        elif d > today:
            # Future days are assumed present (optimistic mid-month projection)
            credit = Decimal("1")
            present_days += Decimal("1")
        else:
            att = attendances.get(d)
            if not att or not att.check_in:
                credit = Decimal("0")
                absent_days += Decimal("1")
            else:
                anomaly = attendance_anomaly(att)
                if anomaly == "missing_checkout":
                    credit = Decimal("0")
                    absent_days += Decimal("1")
                elif anomaly in HALF_DAY_ANOMALIES:
                    credit = Decimal("0.5")
                    half_day_penalties += Decimal("0.5")
                    present_days += Decimal("0.5")
                else:
                    present_days += Decimal("1")

        day_credits.append(credit)

    paid_from_attendance = sum(day_credits, Decimal("0"))
    
    # Any slots remaining up to wd (e.g. weekends, holidays) are fully paid
    remaining_slots = max(wd - Decimal(len(eval_days)), Decimal("0"))
    paid = paid_from_attendance + remaining_slots

    paid = min(paid, wd)
    lop = max(wd - paid, Decimal("0"))

    return PaidDaysBreakdown(
        paid_days=paid.quantize(Decimal("0.01")),
        lop_days=lop.quantize(Decimal("0.01")),
        unpaid_leave_days=unpaid_leave_days,
        absent_days=absent_days,
        half_day_penalties=half_day_penalties,
        paid_leave_days=paid_leave_days,
        present_days=present_days,
    )


def apply_auto_paid_days_to_result(result, *, force: bool = False) -> PaidDaysBreakdown:
    """Write auto_paid_days / auto_lop_days; update paid_days unless HR overrode."""
    run = result.run
    breakdown = compute_paid_days_for_employee(
        result.employee,
        run.period_year,
        run.period_month,
        int(run.working_days),
    )
    result.auto_paid_days = breakdown["paid_days"]
    result.auto_lop_days = breakdown["lop_days"]
    update_fields = ["auto_paid_days", "auto_lop_days", "updated_at"]

    if force or not result.paid_days_overridden:
        result.paid_days = breakdown["paid_days"]
        result.lop_days = breakdown["lop_days"]
        update_fields.extend(["paid_days", "lop_days"])

    result.save(update_fields=update_fields)
    return breakdown


def refresh_run_paid_days(run, *, force: bool = False) -> int:
    count = 0
    for res in run.employee_results.select_related("employee", "run"):
        apply_auto_paid_days_to_result(res, force=force)
        count += 1
    return count
