"""Shared attendance classification for payroll and reports."""

from datetime import date, timedelta

from django.utils import timezone

from .models import Attendance, AttendanceCorrectionStatus
from .rule_settings import resolve_shift_rule, shift_end_datetime, shift_start_datetime, try_auto_clock_out


def attendance_anomaly(attendance: Attendance) -> str:
    if attendance.correction_requests.filter(status=AttendanceCorrectionStatus.APPROVED).exists():
        return "none"

    today = timezone.localdate()
    if attendance.check_in and not attendance.check_out and attendance.date <= today:
        try_auto_clock_out(attendance)
        attendance.refresh_from_db(fields=["check_out", "updated_at"])

    if attendance.check_in and not attendance.check_out and attendance.date <= today:
        return "missing_checkout"

    settings = resolve_shift_rule(attendance.employee)
    if not settings.enable_anomaly_tracking:
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

        is_late_checkin = settings.track_in_time and local_ci > start_dt + late_grace
        is_early_checkout = settings.track_out_time and local_co < end_dt - early_grace

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
        if start_dt and local_ci > start_dt + timedelta(minutes=settings.grace_minutes):
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
                updated += 1
    return updated
