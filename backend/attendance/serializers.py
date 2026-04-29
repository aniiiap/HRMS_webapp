from django.utils import timezone
from datetime import datetime, timedelta
import math
from rest_framework import serializers

from employees.models import Employee, OfficeLocationSettings

from .models import Attendance, AttendanceCorrectionRequest, AttendanceCorrectionStatus, AttendanceCorrectionType


def _distance_meters(lat1, lon1, lat2, lon2):
    r = 6371000.0
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def validate_location_policy(employee: Employee, latitude, longitude):
    if not employee.location_restriction_enabled:
        return
    location_settings = OfficeLocationSettings.objects.filter(pk=1).first()
    center_lat = location_settings.latitude if location_settings and location_settings.latitude is not None else employee.office_latitude
    center_lon = location_settings.longitude if location_settings and location_settings.longitude is not None else employee.office_longitude
    radius_meters = location_settings.radius_meters if location_settings else employee.location_radius_meters
    if location_settings and not location_settings.geofencing_enabled:
        return
    if center_lat is None or center_lon is None:
        raise serializers.ValidationError(
            {"detail": "Location policy is enabled, but office location is not configured by admin."}
        )
    if latitude is None or longitude is None:
        raise serializers.ValidationError(
            {"detail": "Location access is required. Enable location and try again."}
        )
    distance = _distance_meters(float(latitude), float(longitude), float(center_lat), float(center_lon))
    if distance > float(radius_meters or 200):
        raise serializers.ValidationError(
            {"detail": f"You are outside allowed office range ({int(distance)}m away)."}
        )


class AttendanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    needs_regularization = serializers.SerializerMethodField()
    anomaly = serializers.SerializerMethodField()
    shift_start_time = serializers.TimeField(source="employee.shift_start_time", read_only=True)
    shift_end_time = serializers.TimeField(source="employee.shift_end_time", read_only=True)
    grace_minutes = serializers.IntegerField(source="employee.grace_minutes", read_only=True)
    early_checkout_grace_minutes = serializers.IntegerField(source="employee.early_checkout_grace_minutes", read_only=True)
    shift_template_name = serializers.CharField(source="employee.shift_template.name", read_only=True)
    work_duration = serializers.SerializerMethodField()

    class Meta:
        model = Attendance
        fields = (
            "id",
            "employee",
            "employee_name",
            "date",
            "check_in",
            "check_out",
            "notes",
            "created_at",
            "updated_at",
            "needs_regularization",
            "anomaly",
            "shift_start_time",
            "shift_end_time",
            "grace_minutes",
            "early_checkout_grace_minutes",
            "shift_template_name",
            "work_duration",
        )
        read_only_fields = (
            "id",
            "created_at",
            "updated_at",
            "employee_name",
            "needs_regularization",
            "anomaly",
            "shift_start_time",
            "shift_end_time",
            "grace_minutes",
            "early_checkout_grace_minutes",
            "shift_template_name",
            "work_duration",
        )

    def get_employee_name(self, obj):
        u = obj.employee.user
        return f"{u.first_name} {u.last_name}".strip() or u.email

    def get_needs_regularization(self, obj):
        today = timezone.localdate()
        return bool(obj.check_in and not obj.check_out and obj.date < today)

    def get_anomaly(self, obj):
        if obj.correction_requests.filter(status=AttendanceCorrectionStatus.APPROVED).exists():
            return "none"
        today = timezone.localdate()
        if obj.check_in and not obj.check_out and obj.date <= today:
            return "missing_checkout"
        shift_start = obj.employee.shift_start_time
        shift_end = obj.employee.shift_end_time
        if obj.check_in and obj.check_out and shift_start and shift_end:
            local_ci = timezone.localtime(obj.check_in)
            local_co = timezone.localtime(obj.check_out)
            start_dt = timezone.make_aware(datetime.combine(obj.date, shift_start), timezone.get_current_timezone())
            end_date = obj.date + timedelta(days=1) if shift_end <= shift_start else obj.date
            end_dt = timezone.make_aware(datetime.combine(end_date, shift_end), timezone.get_current_timezone())
            # If employee completes scheduled working duration, do not mark anomaly.
            scheduled_seconds = max((end_dt - start_dt).total_seconds(), 0)
            worked_seconds = max((local_co - local_ci).total_seconds(), 0)
            if worked_seconds >= scheduled_seconds > 0:
                return "none"
            late_grace = timedelta(minutes=obj.employee.grace_minutes or 0)
            early_grace = timedelta(minutes=obj.employee.early_checkout_grace_minutes or 10)
            if local_ci > start_dt + late_grace:
                return "late_checkin"
            if local_co < end_dt - early_grace:
                return "early_checkout"
            if worked_seconds < scheduled_seconds:
                return "short_hours"
        elif obj.check_in and shift_start:
            local_ci = timezone.localtime(obj.check_in)
            start_dt = timezone.make_aware(datetime.combine(obj.date, shift_start), timezone.get_current_timezone())
            if local_ci > start_dt + timedelta(minutes=obj.employee.grace_minutes or 0):
                return "late_checkin"
        return "none"

    def get_work_duration(self, obj):
        if not obj.check_in or not obj.check_out:
            return None
        ci = timezone.localtime(obj.check_in)
        co = timezone.localtime(obj.check_out)
        seconds = int(max((co - ci).total_seconds(), 0))
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        return f"{hours:02d}:{minutes:02d}"


class CheckInSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True, max_length=500)
    latitude = serializers.FloatField(required=False)
    longitude = serializers.FloatField(required=False)

    def save(self, **kwargs):
        employee: Employee = self.context["employee"]
        validate_location_policy(employee, self.validated_data.get("latitude"), self.validated_data.get("longitude"))
        today = timezone.localdate()
        att, _ = Attendance.objects.get_or_create(employee=employee, date=today)
        if att.check_in:
            raise serializers.ValidationError({"detail": "Already checked in today."})
        att.check_in = timezone.now()
        att.notes = self.validated_data.get("notes", "")
        att.save()
        return att


class CheckOutSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True, max_length=500)
    latitude = serializers.FloatField(required=False)
    longitude = serializers.FloatField(required=False)

    def save(self, **kwargs):
        employee: Employee = self.context["employee"]
        validate_location_policy(employee, self.validated_data.get("latitude"), self.validated_data.get("longitude"))
        today = timezone.localdate()
        try:
            att = Attendance.objects.get(employee=employee, date=today)
        except Attendance.DoesNotExist as exc:
            raise serializers.ValidationError({"detail": "No check-in for today."}) from exc
        if not att.check_in:
            raise serializers.ValidationError({"detail": "Check in first."})
        if att.check_out:
            raise serializers.ValidationError({"detail": "Already checked out today."})
        att.check_out = timezone.now()
        if self.validated_data.get("notes"):
            att.notes = (att.notes + " " + self.validated_data["notes"]).strip()
        att.save()
        return att


class AttendanceCorrectionRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    attendance_date = serializers.DateField(source="attendance.date", read_only=True)

    class Meta:
        model = AttendanceCorrectionRequest
        fields = (
            "id",
            "attendance",
            "attendance_date",
            "employee_name",
            "requested_check_out",
            "request_type",
            "reason",
            "status",
            "review_note",
            "reviewed_by",
            "reviewed_at",
            "created_at",
        )
        read_only_fields = ("id", "status", "review_note", "reviewed_by", "reviewed_at", "created_at", "employee_name", "attendance_date")

    def get_employee_name(self, obj):
        u = obj.attendance.employee.user
        return f"{u.first_name} {u.last_name}".strip() or u.email


class AttendanceCorrectionCreateSerializer(serializers.Serializer):
    requested_check_out = serializers.DateTimeField(required=False, allow_null=True)
    request_type = serializers.ChoiceField(choices=AttendanceCorrectionType.choices, required=False, default=AttendanceCorrectionType.MARK_PRESENT)
    reason = serializers.CharField(required=False, allow_blank=True, max_length=500)

    def validate(self, attrs):
        attendance: Attendance = self.context["attendance"]
        request_type = attrs.get("request_type", AttendanceCorrectionType.MARK_PRESENT)
        if not attendance.check_in:
            raise serializers.ValidationError({"detail": "Attendance without check-in cannot be regularized."})
        if AttendanceCorrectionRequest.objects.filter(attendance=attendance, status=AttendanceCorrectionStatus.PENDING).exists():
            raise serializers.ValidationError({"detail": "A pending correction request already exists."})
        if request_type == AttendanceCorrectionType.MARK_EXACT_TIME and not attrs.get("requested_check_out"):
            raise serializers.ValidationError({"detail": "Please provide exact check-out time for this request type."})
        return attrs

    def save(self, **kwargs):
        attendance: Attendance = self.context["attendance"]
        requested_by = self.context["requested_by"]
        return AttendanceCorrectionRequest.objects.create(
            attendance=attendance,
            requested_by=requested_by,
            requested_check_out=self.validated_data.get("requested_check_out"),
            request_type=self.validated_data.get("request_type", AttendanceCorrectionType.MARK_PRESENT),
            reason=self.validated_data.get("reason", ""),
        )


class AttendanceCorrectionReviewSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[AttendanceCorrectionStatus.APPROVED, AttendanceCorrectionStatus.REJECTED])
    review_note = serializers.CharField(required=False, allow_blank=True, max_length=500)
