"""Post-processing hooks for attendance check-out (Overtime & Comp-Off)."""

from decimal import Decimal
from django.utils import timezone


def post_process_attendance_checkout(attendance):
    """
    Called after check_out is set on an Attendance row.
    Evaluates Comp-Off eligibility and calculates Overtime hours.
    """
    if not attendance or not attendance.check_in or not attendance.check_out:
        return

    # 1. Evaluate Comp-Off credit (for weekend/holiday work)
    try:
        from leave_management.comp_off import evaluate_and_credit_comp_off
        evaluate_and_credit_comp_off(attendance)
    except Exception:
        pass

    # 2. Calculate Overtime hours (if enable_overtime is on)
    try:
        from .utils import calculate_overtime_hours
        ot_hours = calculate_overtime_hours(attendance)
        if attendance.overtime_hours != ot_hours:
            attendance.overtime_hours = ot_hours
            attendance.save(update_fields=["overtime_hours", "updated_at"])
    except Exception:
        pass
