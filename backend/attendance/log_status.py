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
    leave_half_day: str | None = None,
    is_holiday: bool = False,
) -> tuple[str, str]:
    """
    Return (status_key, status_code).
    Keys: present, absent, leave, wfh, weekend, holiday, anomaly, no_record, lop, half_day
    Codes: P, A, L, WFH, WO, H, AN, NA, LOP, HD
    """
    today = timezone.localdate()
    
    # Check if there is an approved half-day leave
    is_half_day_leave = leave_half_day in ("first_half", "second_half")
    
    # If the employee actually punched in:
    if attendance and attendance.check_in:
        if is_half_day_leave:
            return "half_day", "HD"
            
        # Check if it was a holiday or weekend to mark differently
        if is_holiday:
            return "holiday_worked", "HW"
        if is_weekend_day(employee, day_date):
            return "present", "P"
            
        anomaly = attendance_anomaly(attendance)
        if anomaly == "in_progress":
            return "in_progress", "IP"
        if anomaly == "anomaly_approved":
            return "anomaly_approved", "P"
        if anomaly != "none" or not attendance.check_out:
            return "anomaly", "AN"
        return "present", "P"
        
    # If no punch-in, check for special non-working days:
    if leave_type_code:
        code = normalize_leave_type_code(leave_type_code)
        
        sandwich_weekends = False
        sandwich_holidays = False
        from leave_management.models import LeaveTypeRuleAssignment
        rule_assignment = LeaveTypeRuleAssignment.objects.filter(
            employee=employee, rule__code=code
        ).select_related("rule").first()
        if rule_assignment:
            sandwich_weekends = rule_assignment.rule.count_weekends
            sandwich_holidays = rule_assignment.rule.count_holidays
            
        if is_holiday and not sandwich_holidays:
            return "holiday", "H"
            
        if is_weekend_day(employee, day_date) and not sandwich_weekends:
            return "weekend", "WO"
            
        if code == "work_from_home":
            return "wfh", "WFH"
        if code == "loss_of_pay":
            return "lop", "LOP"
        if is_half_day_leave:
            return "half_day", "HD"
        return "leave", "L"
        
    if is_holiday:
        return "holiday", "H"
        
    if is_weekend_day(employee, day_date):
        return "weekend", "WO"
        
    if day_date > today:
        return "no_record", "NA"
        
    if day_date == today:
        from .rule_settings import resolve_shift_rule, shift_start_datetime
        from datetime import timedelta
        
        settings = resolve_shift_rule(employee)
        if settings and settings.shift_start:
            start_dt = shift_start_datetime(day_date, settings)
            if start_dt:
                grace = timedelta(minutes=getattr(settings, 'grace_minutes', 0) or 0)
                if timezone.localtime() < (start_dt + grace):
                    return "upcoming", "UP"
        
    return "absent", "A"
