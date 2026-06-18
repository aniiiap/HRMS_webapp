"""Per-employee working week from assigned shift template (attendance rules)."""

from __future__ import annotations

from datetime import date

from .models import Employee


def shift_week_flags(employee: Employee) -> tuple[bool, bool]:
    """
    Return (saturday_working, sunday_working) for an employee.
    Default Mon–Fri when no template (Sat & Sun off).
    """
    template = getattr(employee, "shift_template", None)
    if template is None:
        return False, False
    return bool(template.saturday_working), bool(template.sunday_working)


def is_scheduled_working_day(employee: Employee, day: date) -> bool:
    """True if this calendar day counts as a working day for attendance/payroll."""
    wd = day.weekday()
    if wd < 5:
        return True
    sat_work, sun_work = shift_week_flags(employee)
    if wd == 5:
        return sat_work
    if wd == 6:
        return sun_work
    return False


def is_weekend_day(employee: Employee, day: date) -> bool:
    return not is_scheduled_working_day(employee, day)
