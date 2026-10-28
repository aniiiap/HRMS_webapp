"""Automated Comp-Off (Compensatory Off) evaluation and crediting."""

from decimal import Decimal
from django.db.models import Sum

from employees.week_schedule import is_weekend_day
from attendance.rule_settings import resolve_shift_rule
from .models import CompOffGrant, Holiday


def is_holiday_for_employee(employee, day_date) -> bool:
    """Return True if day_date is an active non-optional holiday for employee."""
    if not employee or not employee.organization_id:
        return False
    holidays = Holiday.objects.filter(
        organization_id=employee.organization_id,
        date=day_date,
        is_optional=False,
        is_active=True,
    ).prefetch_related("applicable_shifts")
    for h in holidays:
        shifts = [s.id for s in h.applicable_shifts.all()]
        if not shifts or (employee.shift_template_id and employee.shift_template_id in shifts):
            return True
    return False


def evaluate_and_credit_comp_off(attendance) -> CompOffGrant | None:
    """
    Evaluate an attendance punch. If on weekend or holiday with sufficient worked hours,
    record/update an earned CompOffGrant for the employee.
    """
    if not attendance or not attendance.employee:
        return None
    if not attendance.check_in or not attendance.check_out:
        return None

    employee = attendance.employee
    att_date = attendance.date

    is_weekend = is_weekend_day(employee, att_date)
    is_holiday = is_holiday_for_employee(employee, att_date)

    if not is_weekend and not is_holiday:
        return None

    worked_seconds = max((attendance.check_out - attendance.check_in).total_seconds(), 0)
    worked_minutes = int(worked_seconds // 60)

    settings = resolve_shift_rule(employee)
    full_day_mins = settings.full_day_minutes or 480
    half_day_mins = settings.half_day_minutes or 240

    if worked_minutes >= full_day_mins:
        credit = Decimal("1.0")
    elif worked_minutes >= half_day_mins:
        credit = Decimal("0.5")
    else:
        return None

    reason = "Holiday work" if is_holiday else "Weekend work"

    grant, _ = CompOffGrant.objects.update_or_create(
        employee=employee,
        date=att_date,
        defaults={
            "attendance": attendance,
            "credit_days": credit,
            "worked_minutes": worked_minutes,
            "reason": reason,
            "is_holiday": is_holiday,
            "is_weekend": is_weekend,
        },
    )
    return grant


def get_earned_comp_off_for_employee(employee, year: int) -> Decimal:
    """Sum of all comp-off days earned by the employee in the given year."""
    if not employee:
        return Decimal("0.0")
    total = CompOffGrant.objects.filter(
        employee=employee,
        date__year=year,
    ).aggregate(Sum("credit_days"))["credit_days__sum"]
    return total or Decimal("0.0")
