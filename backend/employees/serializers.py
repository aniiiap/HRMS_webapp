from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.utils.text import slugify
from rest_framework import serializers

from accounts.models import UserRole

from .models import Employee, EmployeeDocument, OfficeLocationSettings, Organization, ShiftTemplate
from .utils import next_employee_code

User = get_user_model()


class OrganizationSerializer(serializers.ModelSerializer):
    slug = serializers.SlugField(required=False, allow_blank=True, max_length=80)

    class Meta:
        model = Organization
        fields = (
            "id",
            "name",
            "slug",
            "legal_name",
            "contact_email",
            "is_active",
            "plan",
            "max_employees",
            "created_at",
            "signature_image",
            "seal_image",
            "company_logo",
            "letterhead_background",
            "expense_backdate_limit_days",
            "resignation_notice_period_days",
            "resignation_auto_msg_enabled",
            "resignation_auto_msg_text",
            "custom_employee_fields",
            "profile_self_service_enabled",
        )
        read_only_fields = ("id", "created_at")

    def create(self, validated_data):
        name = validated_data.get("name") or "organization"
        slug = (validated_data.get("slug") or "").strip() or slugify(name)[:80] or "organization"
        base = slug
        n = 0
        while Organization.objects.filter(slug=slug).exists():
            n += 1
            slug = f"{base}-{n}"[:80]
        validated_data["slug"] = slug
        return super().create(validated_data)


class EmployeeDocumentSerializer(serializers.ModelSerializer):
    # Accept file upload; file will be uploaded to Cloudinary manually and stored as URL
    upload = serializers.FileField(write_only=True, required=False)

    class Meta:
        model = EmployeeDocument
        fields = ("id", "employee", "title", "file", "upload", "uploaded_at")
        read_only_fields = ("id", "uploaded_at", "file")

    def validate(self, attrs):
        if not self.instance and not attrs.get('upload'):
            raise serializers.ValidationError({"upload": "A file is required."})
        return attrs


class EmployeeSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    official_email = serializers.EmailField(write_only=True, required=False)
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)
    role = serializers.CharField(source="user.role", read_only=True)
    is_active = serializers.BooleanField(source="user.is_active", read_only=True)
    onboarding_pending = serializers.BooleanField(source="user.onboarding_pending", read_only=True)
    manager_name = serializers.SerializerMethodField()
    shift_template_name = serializers.CharField(source="shift_template.name", read_only=True)
    organization_name = serializers.CharField(source="organization.name", read_only=True, allow_null=True)
    organization_logo = serializers.ImageField(source="organization.company_logo", read_only=True, allow_null=True)

    class Meta:
        model = Employee
        fields = (
            "id",
            "user",
            "email",
            "official_email",
            "personal_email",
            "first_name",
            "last_name",
            "role",
            "is_active",
            "onboarding_pending",
            "organization",
            "organization_name",
            "organization_logo",
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
            "blood_group",
            "emergency_contact",
            "custom_fields_data",
        )
        read_only_fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
            "is_active",
            "onboarding_pending",
            "manager_name",
            "shift_template_name",
            "organization_name",
            "organization_logo",
        )

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
            "organization",
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
            
        shift_template = validated_data.get("shift_template")
        if shift_template:
            from .models import ShiftTemplateAssignment
            from .shift_assignments import set_primary_shift_assignment
            ShiftTemplateAssignment.objects.get_or_create(employee=employee, shift_template=shift_template)
            set_primary_shift_assignment(employee, shift_template)
            
        return employee

    def update(self, instance, validated_data):
        role = validated_data.pop("role", None)
        official_email = validated_data.pop("official_email", None)
        employee = super().update(instance, self._apply_template(validated_data))
        update_user_fields = []
        if role and employee.user.role != role:
            employee.user.role = role
            update_user_fields.append("role")
        if official_email and employee.user.email != official_email:
            from accounts.models import User
            if User.objects.exclude(pk=employee.user.pk).filter(email__iexact=official_email).exists():
                raise serializers.ValidationError({"official_email": "A user with this email already exists."})
            employee.user.email = official_email
            update_user_fields.append("email")
        if update_user_fields:
            employee.user.save(update_fields=update_user_fields)
            
        shift_template = validated_data.get("shift_template")
        if shift_template:
            from .models import ShiftTemplateAssignment
            from .shift_assignments import set_primary_shift_assignment
            ShiftTemplateAssignment.objects.get_or_create(employee=employee, shift_template=shift_template)
            set_primary_shift_assignment(employee, shift_template)
            
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
    custom_fields_data = serializers.JSONField(required=False, default=dict)
    manager = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(), required=False, allow_null=True
    )
    organization = serializers.PrimaryKeyRelatedField(
        queryset=Organization.objects.filter(is_active=True), required=False, allow_null=True
    )

    def create(self, validated_data):
        manager = validated_data.pop("manager", None)
        org = validated_data.pop("organization", None)
        shift_template = validated_data.pop("shift_template", None)
        email = validated_data.pop("email")
        custom_fields_data = validated_data.pop("custom_fields_data", {})
        
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
        if org is None:
            request = self.context.get("request")
            if request:
                from .org_scope import organization_id_from_request, user_organization_id

                oid = organization_id_from_request(request) or user_organization_id(request.user)
                if oid:
                    org = Organization.objects.filter(pk=oid, is_active=True).first()
        if org is None:
            org = Organization.objects.filter(is_active=True).order_by("id").first()
        if org is None:
            raise serializers.ValidationError(
                {"organization": "No organization exists. Create one before onboarding employees."}
            )
        validated_data["organization"] = org
        
        try:
            emp = Employee.objects.create(user=user, manager=manager, custom_fields_data=custom_fields_data, **validated_data)
            
            # Skip self service if org has disabled it
            if org and not org.profile_self_service_enabled:
                user.onboarding_pending = False
                user.save(update_fields=["onboarding_pending"])

            if shift_template:
                from .models import ShiftTemplateAssignment
                from .shift_assignments import set_primary_shift_assignment
                ShiftTemplateAssignment.objects.get_or_create(employee=emp, shift_template=shift_template)
                set_primary_shift_assignment(emp, shift_template)
        except IntegrityError as exc:
            user.delete()
            raise serializers.ValidationError(
                {"employee_code": "Could not create profile; code may already exist."}
            ) from exc
        return emp


class ShiftTemplateSerializer(serializers.ModelSerializer):
    employee_count = serializers.SerializerMethodField()

    class Meta:
        model = ShiftTemplate
        fields = (
            "id",
            "name",
            "description",
            "is_company_default",
            "start_time",
            "end_time",
            "grace_minutes",
            "early_checkout_grace_minutes",
            "is_night_shift",
            "saturday_working",
            "sunday_working",
            "enable_auto_deduction",
            "manual_deduction_day",
            "enable_anomaly_tracking",
            "track_in_time",
            "track_out_time",
            "track_work_duration",
            "full_day_minutes",
            "half_day_minutes",
            "track_max_break_duration",
            "max_break_duration_minutes",
            "track_max_break_count",
            "max_break_count",
            "enable_auto_clock_out",
            "auto_clock_out_after_minutes",
            "attendance_device",
            "enable_overtime",
            "enable_24_hour_shift",
            "enable_ip_restriction",
            "allowed_ip_addresses",
            "enable_geofencing",
            "is_active",
            "created_at",
            "updated_at",
            "employee_count",
        )
        read_only_fields = ("id", "created_at", "updated_at", "employee_count")

    def get_employee_count(self, obj):
        return obj.employee_assignments.count()

    def validate_manual_deduction_day(self, value):
        if value < 1 or value > 31:
            raise serializers.ValidationError("Must be between 1 and 31.")
        return value

    def validate(self, attrs):
        half = attrs.get("half_day_minutes")
        full = attrs.get("full_day_minutes")
        if self.instance:
            if half is None:
                half = self.instance.half_day_minutes
            if full is None:
                full = self.instance.full_day_minutes
        if half is not None and full is not None and half > full:
            raise serializers.ValidationError({"half_day_minutes": "Half day duration cannot exceed full day duration."})
        return attrs

    def create(self, validated_data):
        org_id = self.context.get("organization_id")
        if org_id and not validated_data.get("organization_id"):
            validated_data["organization_id"] = org_id
        return super().create(validated_data)


class ApplyShiftTemplateSerializer(serializers.Serializer):
    template_id = serializers.IntegerField(required=False)
    template_ids = serializers.ListField(child=serializers.IntegerField(min_value=1), required=False, allow_empty=False)
    employee_ids = serializers.ListField(child=serializers.IntegerField(min_value=1), allow_empty=False)
    primary_template_id = serializers.IntegerField(required=False, allow_null=True)

    def validate(self, attrs):
        template_id = attrs.get("template_id")
        template_ids = attrs.get("template_ids")
        if template_ids:
            attrs["resolved_template_ids"] = list(dict.fromkeys(template_ids))
        elif template_id:
            attrs["resolved_template_ids"] = [template_id]
        else:
            raise serializers.ValidationError("template_id or template_ids is required.")
        primary = attrs.get("primary_template_id")
        if primary is not None and primary not in attrs["resolved_template_ids"]:
            raise serializers.ValidationError("primary_template_id must be one of the assigned templates.")
        return attrs


class ShiftTemplateAssignmentSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    employee_code = serializers.CharField(source="employee.employee_code", read_only=True)
    template_name = serializers.CharField(source="shift_template.name", read_only=True)
    template_start_time = serializers.TimeField(source="shift_template.start_time", read_only=True)
    template_end_time = serializers.TimeField(source="shift_template.end_time", read_only=True)

    class Meta:
        from .models import ShiftTemplateAssignment

        model = ShiftTemplateAssignment
        fields = (
            "id",
            "employee",
            "employee_name",
            "employee_code",
            "shift_template",
            "template_name",
            "template_start_time",
            "template_end_time",
            "is_primary",
            "created_at",
        )
        read_only_fields = fields

    def get_employee_name(self, obj):
        u = obj.employee.user
        return f"{u.first_name} {u.last_name}".strip() or u.email


class ShiftTemplateUnassignSerializer(serializers.Serializer):
    employee_id = serializers.IntegerField(min_value=1)
    template_id = serializers.IntegerField(min_value=1, required=False, allow_null=True)


class ShiftTemplateSetPrimarySerializer(serializers.Serializer):
    employee_id = serializers.IntegerField(min_value=1)
    template_id = serializers.IntegerField(min_value=1)


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
class EmployeeCompleteProfileSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=32, required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    address = serializers.CharField(required=False, allow_blank=True)
    blood_group = serializers.CharField(required=False, allow_blank=True)
    emergency_contact = serializers.CharField(required=False, allow_blank=True)
    custom_fields_data = serializers.JSONField(required=False, default=dict)
    
    def save(self, **kwargs):
        user = self.context['request'].user
        employee = getattr(user, 'employee_profile', None)
        
        user.first_name = self.validated_data.get('first_name', user.first_name)
        user.last_name = self.validated_data.get('last_name', user.last_name)
        user.onboarding_pending = False
        user.save(update_fields=['first_name', 'last_name', 'onboarding_pending'])
        
        if employee:
            employee.phone = self.validated_data.get('phone', employee.phone)
            employee.date_of_birth = self.validated_data.get('date_of_birth', employee.date_of_birth)
            employee.address = self.validated_data.get('address', employee.address)
            employee.blood_group = self.validated_data.get('blood_group', employee.blood_group)
            employee.emergency_contact = self.validated_data.get('emergency_contact', employee.emergency_contact)
            
            if 'custom_fields_data' in self.validated_data:
                # Merge with existing
                current_data = employee.custom_fields_data or {}
                current_data.update(self.validated_data['custom_fields_data'])
                employee.custom_fields_data = current_data

            if not employee.personal_email:
                employee.personal_email = user.email
            employee.save(update_fields=['phone', 'date_of_birth', 'address', 'personal_email', 'blood_group', 'emergency_contact', 'custom_fields_data'])
        
        return user
from .models import Resignation

class ResignationSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.user.get_full_name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_code', read_only=True)
    reviewer_name = serializers.CharField(source='reviewed_by.user.get_full_name', read_only=True)

    class Meta:
        model = Resignation
        fields = '__all__'
        read_only_fields = ('employee', 'submitted_at', 'status', 'reviewed_by', 'reviewed_at', 'reviewer_notes')

from .models import IDCardTemplate

class IDCardTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = IDCardTemplate
        fields = "__all__"
        read_only_fields = ["organization"]

