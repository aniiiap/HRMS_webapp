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
    is_holiday: bool = False,
) -> tuple[str, str]:
    """
    Return (status_key, status_code).
    Keys: present, absent, leave, wfh, weekend, holiday, anomaly, no_record
    Codes: P, A, L, WFH, WO, H, AN, NA
    """
    today = timezone.localdate()
    
    # If the employee actually punched in:
    if attendance and attendance.check_in:
        # Check if it was a holiday or weekend to mark differently
        if is_holiday:
            return "holiday_worked", "HW"
        if is_weekend_day(employee, day_date):
            # Not explicitly asked for weekend_worked, but aligns with holiday_worked
            return "present", "P"  # We can just return present for weekend worked
            
        anomaly = attendance_anomaly(attendance)
        if anomaly != "none" or not attendance.check_out:
            return "anomaly", "AN"
        return "present", "P"
        
    # If no punch-in, check for special non-working days:
    if leave_type_code:
        code = normalize_leave_type_code(leave_type_code)
        if code == "work_from_home":
            return "wfh", "WFH"
        return "leave", "L"
        
    if is_holiday:
        return "holiday", "H"
        
    if is_weekend_day(employee, day_date):
        return "weekend", "WO"
        
    if day_date > today:
        return "no_record", "NA"
        
    return "absent", "A"
