from django.utils import timezone
from datetime import datetime, timedelta
import math
from rest_framework import serializers

from employees.models import Employee, OfficeLocationSettings
from leave_management.models import LeaveType

from .rule_settings import resolve_shift_rule
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
    settings = resolve_shift_rule(employee)
    if not settings.enable_geofencing:
        return
    if not employee.location_restriction_enabled:
        return
    location_settings = OfficeLocationSettings.objects.filter(organization_id=employee.organization_id).first()
    if not location_settings:
        raise serializers.ValidationError(
            {"detail": "Office location is not set for your company. Please contact admin."}
        )
    center_lat = location_settings.latitude
    center_lon = location_settings.longitude
    radius_meters = location_settings.radius_meters
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


def _client_ip(request) -> str | None:
    if not request:
        return None
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def validate_punch_access(employee: Employee, request=None, device: str | None = None):
    settings = resolve_shift_rule(employee)
    device = (device or (request.data.get("device") if request else None) or "web").lower()
    if settings.attendance_device == "mobile" and device != "mobile":
        raise serializers.ValidationError({"detail": "Attendance is allowed only from mobile for your rule."})
    if settings.attendance_device == "web" and device == "mobile":
        raise serializers.ValidationError({"detail": "Attendance is allowed only from web for your rule."})
    if settings.enable_ip_restriction and settings.allowed_ip_addresses:
        client_ip = _client_ip(request)
        allowed = {ip.strip() for ip in settings.allowed_ip_addresses.split(",") if ip.strip()}
        if client_ip and allowed and client_ip not in allowed:
            raise serializers.ValidationError({"detail": "Your IP address is not allowed for attendance."})


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
    correction_request_status = serializers.SerializerMethodField()
    pending_request_type = serializers.SerializerMethodField()
    pending_requested_check_in = serializers.SerializerMethodField()
    pending_requested_check_out = serializers.SerializerMethodField()

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
            "correction_request_status",
            "pending_request_type",
            "pending_requested_check_in",
            "pending_requested_check_out",
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
            "correction_request_status",
            "pending_request_type",
            "pending_requested_check_in",
            "pending_requested_check_out",
        )

    def get_employee_name(self, obj):
        u = obj.employee.user
        return f"{u.first_name} {u.last_name}".strip() or u.email

    def get_needs_regularization(self, obj):
        today = timezone.localdate()
        return bool(obj.check_in and not obj.check_out and obj.date < today)

    def get_anomaly(self, obj):
        from .utils import attendance_anomaly

        return attendance_anomaly(obj)

    def get_work_duration(self, obj):
        if not obj.check_in or not obj.check_out:
            return None
        ci = timezone.localtime(obj.check_in)
        co = timezone.localtime(obj.check_out)
        seconds = int(max((co - ci).total_seconds(), 0))
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        return f"{hours:02d}:{minutes:02d}"

    def _pending_correction(self, obj):
        pending = getattr(obj, "_pending_corrections", None)
        if pending is not None:
            return pending[0] if pending else None
        return (
            obj.correction_requests.filter(status=AttendanceCorrectionStatus.PENDING)
            .order_by("-created_at")
            .first()
        )

    def get_correction_request_status(self, obj):
        req = self._pending_correction(obj)
        if req:
            return req.status
        latest = obj.correction_requests.order_by("-created_at").first()
        return latest.status if latest else "none"

    def get_pending_request_type(self, obj):
        req = self._pending_correction(obj)
        return req.request_type if req else None

    def get_pending_requested_check_in(self, obj):
        req = self._pending_correction(obj)
        if req and req.request_type == AttendanceCorrectionType.MARK_EXACT_TIME:
            return req.requested_check_in
        return None

    def get_pending_requested_check_out(self, obj):
        req = self._pending_correction(obj)
        if req and req.request_type == AttendanceCorrectionType.MARK_EXACT_TIME:
            return req.requested_check_out
        return None


class CheckInSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True, max_length=500)
    latitude = serializers.FloatField(required=False)
    longitude = serializers.FloatField(required=False)
    device = serializers.ChoiceField(choices=["mobile", "web"], required=False, default="web")

    def validate(self, attrs):
        employee: Employee = self.context["employee"]
        validate_punch_access(employee, self.context.get("request"), attrs.get("device"))
        return attrs

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
    device = serializers.ChoiceField(choices=["mobile", "web"], required=False, default="web")

    def validate(self, attrs):
        employee: Employee = self.context["employee"]
        validate_punch_access(employee, self.context.get("request"), attrs.get("device"))
        return attrs

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
    employee_code = serializers.SerializerMethodField()
    department = serializers.SerializerMethodField()
    manager_name = serializers.SerializerMethodField()
    profile_image = serializers.SerializerMethodField()
    attendance_date = serializers.DateField(source="attendance.date", read_only=True)
    actual_check_in = serializers.DateTimeField(source="attendance.check_in", read_only=True)
    actual_check_out = serializers.DateTimeField(source="attendance.check_out", read_only=True)
    actual_work_duration = serializers.SerializerMethodField()
    requested_work_duration = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceCorrectionRequest
        fields = (
            "id",
            "attendance",
            "attendance_date",
            "employee_name",
            "employee_code",
            "department",
            "manager_name",
            "profile_image",
            "actual_check_in",
            "actual_check_out",
            "actual_work_duration",
            "requested_check_in",
            "requested_check_out",
            "requested_work_duration",
            "leave_start_date",
            "leave_end_date",
            "leave_type",
            "request_type",
            "reason",
            "status",
            "review_note",
            "reviewed_by",
            "reviewed_at",
            "created_at",
        )
        read_only_fields = (
            "id",
            "status",
            "review_note",
            "reviewed_by",
            "reviewed_at",
            "created_at",
            "employee_name",
            "employee_code",
            "department",
            "manager_name",
            "profile_image",
            "attendance_date",
            "actual_check_in",
            "actual_check_out",
            "actual_work_duration",
            "requested_work_duration",
        )

    def _employee(self, obj):
        return obj.attendance.employee

    def _duration_label(self, check_in, check_out):
        if not check_in or not check_out:
            return None
        ci = timezone.localtime(check_in)
        co = timezone.localtime(check_out)
        minutes = int(max((co - ci).total_seconds(), 0) // 60)
        hours = minutes // 60
        mins = minutes % 60
        if hours and mins:
            return f"{hours} Hrs {mins} Min"
        if hours:
            return f"{hours} Hrs"
        return f"{mins} Min"

    def get_employee_name(self, obj):
        u = self._employee(obj).user
        return f"{u.first_name} {u.last_name}".strip() or u.email

    def get_employee_code(self, obj):
        return self._employee(obj).employee_code

    def get_department(self, obj):
        return self._employee(obj).department or ""

    def get_manager_name(self, obj):
        mgr = self._employee(obj).manager
        if not mgr:
            return ""
        u = mgr.user
        return f"{u.first_name} {u.last_name}".strip() or u.email

    def get_profile_image(self, obj):
        img = self._employee(obj).profile_image
        if not img:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(img.url)
        return img.url if hasattr(img, "url") else None

    def get_actual_work_duration(self, obj):
        att = obj.attendance
        return self._duration_label(att.check_in, att.check_out)

    def get_requested_work_duration(self, obj):
        if obj.request_type == AttendanceCorrectionType.MARK_LEAVE:
            return None
        check_in = obj.requested_check_in or obj.attendance.check_in
        check_out = obj.requested_check_out or obj.attendance.check_out
        return self._duration_label(check_in, check_out)


class AttendanceCorrectionCreateSerializer(serializers.Serializer):
    requested_check_in = serializers.DateTimeField(required=False, allow_null=True)
    requested_check_out = serializers.DateTimeField(required=False, allow_null=True)
    leave_start_date = serializers.DateField(required=False, allow_null=True)
    leave_end_date = serializers.DateField(required=False, allow_null=True)
    leave_type = serializers.ChoiceField(choices=LeaveType.choices, required=False, allow_blank=True)
    request_type = serializers.ChoiceField(choices=AttendanceCorrectionType.choices, required=False, default=AttendanceCorrectionType.MARK_PRESENT)
    reason = serializers.CharField(required=False, allow_blank=True, max_length=500)

    def validate(self, attrs):
        attendance: Attendance = self.context["attendance"]
        request_type = attrs.get("request_type", AttendanceCorrectionType.MARK_PRESENT)
        today = timezone.localdate()
        allowed_from = today - timedelta(days=3)
        if attendance.date >= today:
            raise serializers.ValidationError(
                {"detail": "Attendance correction requests are allowed only for past dates."}
            )
        if attendance.date < allowed_from:
            raise serializers.ValidationError(
                {"detail": "Approval request window expired. You can request correction only within 3 days."}
            )
        if request_type != AttendanceCorrectionType.MARK_LEAVE and not attendance.check_in:
            raise serializers.ValidationError({"detail": "Attendance without check-in cannot be regularized."})
        if AttendanceCorrectionRequest.objects.filter(attendance=attendance, status=AttendanceCorrectionStatus.PENDING).exists():
            raise serializers.ValidationError({"detail": "A pending correction request already exists."})

        if request_type == AttendanceCorrectionType.MARK_EXACT_TIME:
            check_in = attrs.get("requested_check_in")
            check_out = attrs.get("requested_check_out")
            if not check_in or not check_out:
                raise serializers.ValidationError({"detail": "Please provide both clock-in and clock-out times."})
            if check_out <= check_in:
                raise serializers.ValidationError({"detail": "Clock-out must be after clock-in."})

        if request_type == AttendanceCorrectionType.MARK_LEAVE:
            start = attrs.get("leave_start_date")
            end = attrs.get("leave_end_date")
            leave_type = attrs.get("leave_type")
            reason = (attrs.get("reason") or "").strip()
            if not start or not end:
                raise serializers.ValidationError({"detail": "Please provide leave start and end dates."})
            if end < start:
                raise serializers.ValidationError({"detail": "Leave end date must be on or after start date."})
            if not leave_type:
                raise serializers.ValidationError({"detail": "Please select a leave type."})
            if not reason:
                raise serializers.ValidationError({"detail": "Please provide a reason for leave."})

        return attrs

    def save(self, **kwargs):
        attendance: Attendance = self.context["attendance"]
        requested_by = self.context["requested_by"]
        return AttendanceCorrectionRequest.objects.create(
            attendance=attendance,
            requested_by=requested_by,
            requested_check_in=self.validated_data.get("requested_check_in"),
            requested_check_out=self.validated_data.get("requested_check_out"),
            leave_start_date=self.validated_data.get("leave_start_date"),
            leave_end_date=self.validated_data.get("leave_end_date"),
            leave_type=self.validated_data.get("leave_type") or "",
            request_type=self.validated_data.get("request_type", AttendanceCorrectionType.MARK_PRESENT),
            reason=self.validated_data.get("reason", ""),
        )


class AttendanceCorrectionReviewSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[AttendanceCorrectionStatus.APPROVED, AttendanceCorrectionStatus.REJECTED])
    review_note = serializers.CharField(required=False, allow_blank=True, max_length=500)
    requested_check_in = serializers.DateTimeField(required=False, allow_null=True)
    requested_check_out = serializers.DateTimeField(required=False, allow_null=True)
