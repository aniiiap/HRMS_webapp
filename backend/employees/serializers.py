from django.contrib.auth import get_user_model
from django.db import IntegrityError
from rest_framework import serializers

from accounts.models import UserRole

from .models import Employee, EmployeeDocument, OfficeLocationSettings, ShiftTemplate
from .utils import next_employee_code

User = get_user_model()


class EmployeeDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeDocument
        fields = ("id", "employee", "title", "file", "uploaded_at")
        read_only_fields = ("id", "uploaded_at")


class EmployeeSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)
    role = serializers.CharField(source="user.role", read_only=True)
    is_active = serializers.BooleanField(source="user.is_active", read_only=True)
    onboarding_pending = serializers.BooleanField(source="user.onboarding_pending", read_only=True)
    manager_name = serializers.SerializerMethodField()
    shift_template_name = serializers.CharField(source="shift_template.name", read_only=True)

    class Meta:
        model = Employee
        fields = (
            "id",
            "user",
            "email",
            "first_name",
            "last_name",
            "role",
            "is_active",
            "onboarding_pending",
            "employee_code",
            "department",
            "designation",
            "phone",
            "address",
            "date_of_joining",
            "date_of_birth",
            "shift_template",
            "shift_template_name",
            "shift_start_time",
            "shift_end_time",
            "grace_minutes",
            "early_checkout_grace_minutes",
            "location_restriction_enabled",
            "office_latitude",
            "office_longitude",
            "location_radius_meters",
            "manager",
            "manager_name",
            "profile_image",
        )
        read_only_fields = ("id", "email", "first_name", "last_name", "role", "is_active", "onboarding_pending", "manager_name", "shift_template_name")

    def get_manager_name(self, obj):
        m = obj.manager
        if not m:
            return None
        u = m.user
        name = f"{u.first_name} {u.last_name}".strip()
        return name or u.email


class EmployeeWriteSerializer(serializers.ModelSerializer):
    """Create/update employee profile; links existing user."""
    role = serializers.ChoiceField(choices=UserRole.choices, required=False, write_only=True)

    class Meta:
        model = Employee
        fields = (
            "user",
            "employee_code",
            "department",
            "designation",
            "phone",
            "address",
            "date_of_joining",
            "date_of_birth",
            "role",
            "shift_template",
            "shift_start_time",
            "shift_end_time",
            "grace_minutes",
            "early_checkout_grace_minutes",
            "location_restriction_enabled",
            "office_latitude",
            "office_longitude",
            "location_radius_meters",
            "manager",
            "profile_image",
        )

    def validate_user(self, user):
        qs = Employee.objects.filter(user=user)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("This user already has an employee profile.")
        return user

    def _apply_template(self, data):
        template = data.get("shift_template")
        if template:
            data["shift_start_time"] = template.start_time
            data["shift_end_time"] = template.end_time
            data["grace_minutes"] = template.grace_minutes
            data["early_checkout_grace_minutes"] = template.early_checkout_grace_minutes
        return data

    def create(self, validated_data):
        role = validated_data.pop("role", None)
        employee = super().create(self._apply_template(validated_data))
        if role:
            employee.user.role = role
            employee.user.save(update_fields=["role"])
        return employee

    def update(self, instance, validated_data):
        role = validated_data.pop("role", None)
        employee = super().update(instance, self._apply_template(validated_data))
        if role and employee.user.role != role:
            employee.user.role = role
            employee.user.save(update_fields=["role"])
        return employee


class EmployeeOnboardSerializer(serializers.Serializer):
    """HR/Admin creates user + employee in one step.

    Uses invite-based onboarding:
    - Account is created inactive/pending.
    - Employee receives email invite to set own password.
    - Employee code can be omitted and will auto-increment.
    """

    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    role = serializers.ChoiceField(choices=UserRole.choices, default=UserRole.EMPLOYEE)
    employee_code = serializers.CharField(
        max_length=32,
        required=False,
        allow_blank=True,
        help_text="Optional; auto-generated as EMP-##### if omitted.",
    )
    department = serializers.CharField(max_length=120, required=False, allow_blank=True)
    designation = serializers.CharField(max_length=120, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=32, required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    date_of_joining = serializers.DateField(required=False, allow_null=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    shift_template = serializers.PrimaryKeyRelatedField(queryset=ShiftTemplate.objects.filter(is_active=True), required=False, allow_null=True)
    location_restriction_enabled = serializers.BooleanField(required=False, default=True)
    office_latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    office_longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    location_radius_meters = serializers.IntegerField(required=False, min_value=10, max_value=2000, default=200)
    manager = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(), required=False, allow_null=True
    )

    def create(self, validated_data):
        manager = validated_data.pop("manager", None)
        shift_template = validated_data.pop("shift_template", None)
        email = validated_data.pop("email")
        if shift_template:
            validated_data["shift_template"] = shift_template
            validated_data["shift_start_time"] = shift_template.start_time
            validated_data["shift_end_time"] = shift_template.end_time
            validated_data["grace_minutes"] = shift_template.grace_minutes
            validated_data["early_checkout_grace_minutes"] = shift_template.early_checkout_grace_minutes

        first_name = validated_data.pop("first_name", "") or ""
        last_name = validated_data.pop("last_name", "") or ""
        role = validated_data.pop("role", UserRole.EMPLOYEE)

        code = (validated_data.pop("employee_code", None) or "").strip()
        if not code:
            code = next_employee_code()
        elif Employee.objects.filter(employee_code=code).exists():
            raise serializers.ValidationError(
                {"employee_code": "Employee code already in use. Leave blank to auto-assign."}
            )

        try:
            user = User.objects.create_user(
                email=email,
                password=None,
                first_name=first_name,
                last_name=last_name,
                role=role,
                is_active=False,
                onboarding_pending=True,
            )
            user.set_unusable_password()
            user.save(update_fields=["password"])
        except IntegrityError as exc:
            raise serializers.ValidationError(
                {"email": "A user with this email already exists."}
            ) from exc

        validated_data["employee_code"] = code
        try:
            emp = Employee.objects.create(user=user, manager=manager, **validated_data)
        except IntegrityError as exc:
            user.delete()
            raise serializers.ValidationError(
                {"employee_code": "Could not create profile; code may already exist."}
            ) from exc
        return emp


class ShiftTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShiftTemplate
        fields = (
            "id",
            "name",
            "start_time",
            "end_time",
            "grace_minutes",
            "early_checkout_grace_minutes",
            "is_night_shift",
            "is_active",
        )


class ApplyShiftTemplateSerializer(serializers.Serializer):
    template_id = serializers.IntegerField()
    employee_ids = serializers.ListField(child=serializers.IntegerField(min_value=1), allow_empty=False)


class OfficeLocationSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = OfficeLocationSettings
        fields = (
            "id",
            "name",
            "address",
            "latitude",
            "longitude",
            "radius_meters",
            "geofencing_enabled",
            "updated_at",
        )
        read_only_fields = ("id", "updated_at")
