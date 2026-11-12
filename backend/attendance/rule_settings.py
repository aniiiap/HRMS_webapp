"""Resolve attendance rule settings from employee + shift template."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, time, timedelta

from django.utils import timezone


@dataclass(frozen=True)
class ShiftRuleSettings:
    shift_start: time | None
    shift_end: time | None
    saturday_end_time: time | None
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
    enable_monthly_anomaly_limit: bool = False
    max_monthly_anomaly_limit: int = 2
    deduct_half_day_on_excess_anomaly: bool = False


def resolve_shift_rule(employee, on_date=None) -> ShiftRuleSettings:
    template = getattr(employee, "shift_template", None)

    # When a template is assigned, use its values (or the historical revision valid on on_date)
    # Employee-level overrides only apply when there is no template.
    if template:
        revision = None
        if on_date:
            prefetched_revs = getattr(template, "_prefetched_objects_cache", {}).get("history_revisions")
            if prefetched_revs is not None:
                from datetime import date as dt_date
                matching = [
                    r for r in prefetched_revs
                    if (r.effective_from is None or r.effective_from <= on_date)
                    and (r.effective_to is None or r.effective_to >= on_date)
                ]
                if matching:
                    matching.sort(key=lambda r: (r.effective_to or dt_date.max, r.id), reverse=True)
                    revision = matching[0]
            else:
                try:
                    from employees.models import ShiftTemplateHistory
                    from django.db.models import Q
                    revision = (
                        ShiftTemplateHistory.objects.filter(shift_template=template)
                        .filter(Q(effective_from__isnull=True) | Q(effective_from__lte=on_date))
                        .filter(Q(effective_to__isnull=True) | Q(effective_to__gte=on_date))
                        .order_by("-effective_to", "-id")
                        .first()
                    )
                except Exception:
                    revision = None

        if revision:
            shift_start = revision.start_time
            shift_end = revision.end_time
            grace = revision.grace_minutes
            early_grace = revision.early_checkout_grace_minutes
            saturday_end = revision.saturday_end_time
            is_night = revision.is_night_shift
            full_min = revision.full_day_minutes
            half_min = revision.half_day_minutes
            enable_limit = revision.enable_monthly_anomaly_limit
            max_limit = revision.max_monthly_anomaly_limit
            deduct_half = revision.deduct_half_day_on_excess_anomaly
        else:
            shift_start = template.start_time
            shift_end = template.end_time
            grace = template.grace_minutes
            early_grace = template.early_checkout_grace_minutes
            saturday_end = getattr(template, "saturday_end_time", None)
            is_night = getattr(template, "is_night_shift", False)
            full_min = getattr(template, "full_day_minutes", 480)
            half_min = getattr(template, "half_day_minutes", 240)
            enable_limit = getattr(template, "enable_monthly_anomaly_limit", False)
            max_limit = getattr(template, "max_monthly_anomaly_limit", 2)
            deduct_half = getattr(template, "deduct_half_day_on_excess_anomaly", False)
    else:
        shift_start = employee.shift_start_time
        shift_end = employee.shift_end_time
        grace = employee.grace_minutes
        early_grace = employee.early_checkout_grace_minutes
        saturday_end = None
        is_night = False
        full_min = 480
        half_min = 240
        enable_limit = False
        max_limit = 2
        deduct_half = False

    def tpl(attr, default):
        if template is None:
            return default
        return getattr(template, attr, default)

    return ShiftRuleSettings(
        shift_start=shift_start,
        shift_end=shift_end,
        saturday_end_time=saturday_end,
        grace_minutes=int(grace or 0),
        early_checkout_grace_minutes=int(early_grace or 0),
        is_night_shift=bool(is_night),
        enable_anomaly_tracking=bool(tpl("enable_anomaly_tracking", True)),
        track_in_time=bool(tpl("track_in_time", True)),
        track_out_time=bool(tpl("track_out_time", True)),
        track_work_duration=bool(tpl("track_work_duration", True)),
        full_day_minutes=int(full_min),
        half_day_minutes=int(half_min),
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
        enable_monthly_anomaly_limit=bool(enable_limit),
        max_monthly_anomaly_limit=int(max_limit or 2),
        deduct_half_day_on_excess_anomaly=bool(deduct_half),
    )


def shift_end_datetime(attendance_date, settings: ShiftRuleSettings) -> datetime | None:
    if not settings.shift_end:
        return None
    end_date = attendance_date
    
    # Check for custom Saturday end time
    shift_end = settings.shift_end
    if attendance_date.weekday() == 5 and settings.saturday_end_time:
        shift_end = settings.saturday_end_time
        
    if shift_end <= (settings.shift_start or time.min) or settings.is_night_shift:
        end_date = attendance_date + timedelta(days=1)
    return timezone.make_aware(
        datetime.combine(end_date, shift_end),
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
    settings = resolve_shift_rule(attendance.employee, on_date=attendance.date)
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
