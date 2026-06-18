"""Shared per-day attendance status codes for logs and heatmap."""

from datetime import date

from django.utils import timezone

from employees.week_schedule import is_weekend_day
from leave_management.leave_rules import normalize_leave_type_code

from .utils import attendance_anomaly


def day_status_for_employee(
    employee,
    day_date: date,
    attendance=None,
    leave_type_code: str | None = None,
) -> tuple[str, str]:
    """
    Return (status_key, status_code).
    Keys: present, absent, leave, wfh, weekend, anomaly, no_record
    Codes: P, A, L, WFH, WO, AN, NA
    """
    today = timezone.localdate()
    if is_weekend_day(employee, day_date):
        return "weekend", "WO"
    if leave_type_code:
        code = normalize_leave_type_code(leave_type_code)
        if code == "work_from_home":
            return "wfh", "WFH"
        return "leave", "L"
    if attendance is None:
        if day_date > today:
            return "no_record", "NA"
        return "absent", "A"
    anomaly = attendance_anomaly(attendance)
    if anomaly != "none":
        return "anomaly", "AN"
    if attendance.check_in and attendance.check_out:
        return "present", "P"
    if attendance.check_in:
        return "anomaly", "AN"
    return "absent", "A"
