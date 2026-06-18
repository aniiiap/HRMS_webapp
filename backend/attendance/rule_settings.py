"""Resolve attendance rule settings from employee + shift template."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, time, timedelta

from django.utils import timezone


@dataclass(frozen=True)
class ShiftRuleSettings:
    shift_start: time | None
    shift_end: time | None
    grace_minutes: int
    early_checkout_grace_minutes: int
    is_night_shift: bool
    enable_anomaly_tracking: bool
    track_in_time: bool
    track_out_time: bool
    track_work_duration: bool
    full_day_minutes: int
    half_day_minutes: int
    track_max_break_duration: bool
    max_break_duration_minutes: int
    track_max_break_count: bool
    max_break_count: int
    enable_auto_clock_out: bool
    auto_clock_out_after_minutes: int
    enable_geofencing: bool
    attendance_device: str
    enable_overtime: bool
    enable_24_hour_shift: bool
    enable_ip_restriction: bool
    allowed_ip_addresses: str


def resolve_shift_rule(employee) -> ShiftRuleSettings:
    template = getattr(employee, "shift_template", None)
    shift_start = employee.shift_start_time or (template.start_time if template else None)
    shift_end = employee.shift_end_time or (template.end_time if template else None)
    grace = employee.grace_minutes
    if grace is None and template:
        grace = template.grace_minutes
    early_grace = employee.early_checkout_grace_minutes
    if early_grace is None and template:
        early_grace = template.early_checkout_grace_minutes

    def tpl(attr, default):
        if template is None:
            return default
        return getattr(template, attr, default)

    return ShiftRuleSettings(
        shift_start=shift_start,
        shift_end=shift_end,
        grace_minutes=int(grace or 0),
        early_checkout_grace_minutes=int(early_grace or 10),
        is_night_shift=bool(tpl("is_night_shift", False)),
        enable_anomaly_tracking=bool(tpl("enable_anomaly_tracking", True)),
        track_in_time=bool(tpl("track_in_time", True)),
        track_out_time=bool(tpl("track_out_time", True)),
        track_work_duration=bool(tpl("track_work_duration", True)),
        full_day_minutes=int(tpl("full_day_minutes", 480)),
        half_day_minutes=int(tpl("half_day_minutes", 240)),
        track_max_break_duration=bool(tpl("track_max_break_duration", False)),
        max_break_duration_minutes=int(tpl("max_break_duration_minutes", 60)),
        track_max_break_count=bool(tpl("track_max_break_count", False)),
        max_break_count=int(tpl("max_break_count", 2)),
        enable_auto_clock_out=bool(tpl("enable_auto_clock_out", False)),
        auto_clock_out_after_minutes=int(tpl("auto_clock_out_after_minutes", 0)),
        enable_geofencing=bool(tpl("enable_geofencing", True)),
        attendance_device=str(tpl("attendance_device", "both")),
        enable_overtime=bool(tpl("enable_overtime", False)),
        enable_24_hour_shift=bool(tpl("enable_24_hour_shift", False)),
        enable_ip_restriction=bool(tpl("enable_ip_restriction", False)),
        allowed_ip_addresses=str(tpl("allowed_ip_addresses", "") or ""),
    )


def shift_end_datetime(attendance_date, settings: ShiftRuleSettings) -> datetime | None:
    if not settings.shift_end:
        return None
    end_date = attendance_date
    if settings.shift_end <= (settings.shift_start or time.min) or settings.is_night_shift:
        end_date = attendance_date + timedelta(days=1)
    return timezone.make_aware(
        datetime.combine(end_date, settings.shift_end),
        timezone.get_current_timezone(),
    )


def shift_start_datetime(attendance_date, settings: ShiftRuleSettings) -> datetime | None:
    if not settings.shift_start:
        return None
    return timezone.make_aware(
        datetime.combine(attendance_date, settings.shift_start),
        timezone.get_current_timezone(),
    )


def try_auto_clock_out(attendance) -> bool:
    """Auto clock-out when shift end + grace has passed and rule allows it."""
    if attendance.check_out or not attendance.check_in:
        return False
    settings = resolve_shift_rule(attendance.employee)
    if not settings.enable_auto_clock_out:
        return False
    end_dt = shift_end_datetime(attendance.date, settings)
    if not end_dt:
        return False
    deadline = end_dt + timedelta(minutes=settings.auto_clock_out_after_minutes)
    if timezone.now() < deadline:
        return False
    attendance.check_out = deadline
    attendance.save(update_fields=["check_out", "updated_at"])
    return True
