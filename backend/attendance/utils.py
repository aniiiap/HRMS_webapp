"""Shared attendance classification for payroll and reports."""

from decimal import Decimal
from datetime import date, timedelta

from django.utils import timezone

from .models import Attendance, AttendanceCorrectionStatus
from .rule_settings import resolve_shift_rule, shift_end_datetime, shift_start_datetime, try_auto_clock_out


def attendance_anomaly(attendance: Attendance, has_approved_leave: bool | None = None) -> str:
    if any(req.status == AttendanceCorrectionStatus.APPROVED for req in attendance.correction_requests.all()):
        return "anomaly_approved"

    today = timezone.localdate()
    if attendance.check_in and not attendance.check_out and attendance.date <= today:
        try_auto_clock_out(attendance)
        attendance.refresh_from_db(fields=["check_out", "updated_at"])

    if attendance.check_in and not attendance.check_out:
        if attendance.date < today:
            return "missing_checkout"
        elif attendance.date == today:
            settings = resolve_shift_rule(attendance.employee)
            if settings and settings.shift_end:
                end_dt = shift_end_datetime(attendance.date, settings)
                if end_dt and timezone.localtime() > end_dt:
                    return "missing_checkout"
            return "in_progress"

    settings = resolve_shift_rule(attendance.employee)
    if not settings.enable_anomaly_tracking:
        return "none"

    # Exempt attendance anomalies (e.g., early checkout, late check-in) for dates with an approved leave.
    if has_approved_leave is None:
        from leave_management.models import LeaveRequest, LeaveStatus
        has_approved_leave = LeaveRequest.objects.filter(
            employee=attendance.employee,
            status=LeaveStatus.APPROVED,
            start_date__lte=attendance.date,
            end_date__gte=attendance.date,
        ).exists()
    if has_approved_leave:
        return "none"

    if attendance.check_in and attendance.check_out and settings.shift_start and settings.shift_end:
        local_ci = timezone.localtime(attendance.check_in)
        local_co = timezone.localtime(attendance.check_out)
        start_dt = shift_start_datetime(attendance.date, settings)
        end_dt = shift_end_datetime(attendance.date, settings)
        if not start_dt or not end_dt:
            return "none"

        scheduled_seconds = max((end_dt - start_dt).total_seconds(), 0)
        worked_seconds = max((local_co - local_ci).total_seconds(), 0)
        worked_minutes = worked_seconds / 60



        late_grace = timedelta(minutes=settings.grace_minutes)
        early_grace = timedelta(minutes=settings.early_checkout_grace_minutes)

        is_late_checkin = settings.track_in_time and local_ci.replace(second=0, microsecond=0) > start_dt + late_grace
        is_early_checkout = settings.track_out_time and local_co.replace(second=0, microsecond=0) < end_dt - early_grace

        if is_late_checkin and is_early_checkout:
            return "late_and_early"
        if is_late_checkin:
            return "late_checkin"
        if is_early_checkout:
            return "early_checkout"

        # The user explicitly requested that work duration is only for UI purposes
        # and should not trigger anomalies if grace periods are covered.


    elif attendance.check_in and settings.shift_start and settings.track_in_time:
        local_ci = timezone.localtime(attendance.check_in)
        start_dt = shift_start_datetime(attendance.date, settings)
        if start_dt and local_ci.replace(second=0, microsecond=0) > start_dt + timedelta(minutes=settings.grace_minutes):
            return "late_checkin"

    return "none"


def apply_auto_clock_out(queryset, as_of_date: date | None = None) -> int:
    """
    Auto close open attendances for dates up to ``as_of_date`` (default: today).

    Returns number of rows auto clocked out.
    """
    cutoff = as_of_date or timezone.localdate()
    updated = 0
    for attendance in queryset:
        if attendance.check_in and not attendance.check_out and attendance.date <= cutoff:
            if try_auto_clock_out(attendance):
                from .punch_hooks import post_process_attendance_checkout
                post_process_attendance_checkout(attendance)
                updated += 1
    return updated


def calculate_overtime_hours(attendance: Attendance) -> Decimal:
    """
    Calculate overtime hours for an attendance record when enable_overtime is True on the shift.
    Returns 0.00 if disabled or incomplete.
    """
    if not attendance or not attendance.employee:
        return Decimal("0.00")
    if not attendance.check_in or not attendance.check_out:
        return Decimal("0.00")

    settings = resolve_shift_rule(attendance.employee)
    if not settings.enable_overtime:
        return Decimal("0.00")

    from employees.week_schedule import is_scheduled_working_day
    from leave_management.comp_off import is_holiday_for_employee

    worked_seconds = max((attendance.check_out - attendance.check_in).total_seconds(), 0)
    worked_minutes = int(worked_seconds // 60)

    # Regular scheduled working day:
    if is_scheduled_working_day(attendance.employee, attendance.date) and not is_holiday_for_employee(attendance.employee, attendance.date):
        full_shift_minutes = settings.full_day_minutes or 480
        if worked_minutes > full_shift_minutes:
            extra_minutes = worked_minutes - full_shift_minutes
            if extra_minutes >= 30:  # Minimum 30 mins to qualify as OT
                return Decimal(str(round(extra_minutes / 60.0, 2)))
        return Decimal("0.00")

    # Weekend or Holiday:
    # If comp-off grant exists for this attendance, OT is not duplicated.
    try:
        from leave_management.models import CompOffGrant
        if CompOffGrant.objects.filter(attendance=attendance).exists():
            return Decimal("0.00")
    except Exception:
        pass

    if worked_minutes >= 30:
        return Decimal(str(round(worked_minutes / 60.0, 2)))

    return Decimal("0.00")

