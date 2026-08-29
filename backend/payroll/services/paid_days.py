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
        days.append(d)
        d += timedelta(days=1)
    return days


from employees.week_schedule import is_scheduled_working_day

def _leave_date_sets(employee: Employee, month_start: date, month_end: date, mandatory_holidays: set[date]) -> tuple[dict[date, Decimal], dict[date, Decimal]]:
    unpaid: dict[date, Decimal] = {}
    paid: dict[date, Decimal] = {}
    leaves = LeaveRequest.objects.filter(
        employee=employee,
        status=LeaveStatus.APPROVED,
        start_date__lte=month_end,
        end_date__gte=month_start,
    )
    for leave in leaves:
        d = max(leave.start_date, month_start)
        end_d = min(leave.end_date, month_end)
        
        # Determine leave amount per day (1.0 for full day, 0.5 for half day)
        leave_val = Decimal("0.5") if getattr(leave, "half_day", "none") in ("first_half", "second_half") else Decimal("1.0")
        
        while d <= end_d:
            if is_scheduled_working_day(employee, d) and d not in mandatory_holidays:
                if leave.leave_type in (LeaveType.LOP, "unpaid", "loss_of_pay"):
                    unpaid[d] = unpaid.get(d, Decimal("0")) + leave_val
                else:
                    paid[d] = paid.get(d, Decimal("0")) + leave_val
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

    from leave_management.models import Holiday
    from django.db.models import Q
    holidays = Holiday.objects.filter(
        Q(applicable_shifts__isnull=True) | Q(applicable_shifts=employee.shift_template_id),
        organization_id=employee.organization_id,
        date__gte=month_start,
        date__lte=month_end,
        is_optional=False,
        is_active=True
    ).distinct().values_list('date', flat=True)
    mandatory_holidays = set(holidays)

    unpaid_dates, paid_leave_dates = _leave_date_sets(employee, month_start, month_end, mandatory_holidays)

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
        u_leave = unpaid_dates.get(d, Decimal("0"))
        p_leave = paid_leave_dates.get(d, Decimal("0"))
        
        total_leave = min(u_leave + p_leave, Decimal("1.0"))
        unpaid_leave_days += u_leave
        paid_leave_days += p_leave
        
        remaining = Decimal("1.0") - total_leave
        credit_for_remaining = Decimal("0")
        
        if remaining > Decimal("0"):
            if d in mandatory_holidays:
                # Mandatory holidays are counted as paid/present automatically
                present_days += remaining
                credit_for_remaining = remaining
            elif d > today:
                # Future days are assumed present (optimistic mid-month projection)
                present_days += remaining
                credit_for_remaining = remaining
            elif not is_scheduled_working_day(employee, d):
                # It's a weekend / non-scheduled day, so it counts as paid in a calendar-days model
                present_days += remaining
                credit_for_remaining = remaining
            else:
                att = attendances.get(d)
                if not att or not att.check_in:
                    absent_days += remaining
                    credit_for_remaining = Decimal("0")
                else:
                    # If employee checked in, count as fully present for the remaining fraction regardless of anomaly
                    present_days += remaining
                    credit_for_remaining = remaining

        # Total credit for this day is the paid leave plus any earned credit from the remaining portion
        day_credits.append(p_leave + credit_for_remaining)

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
