from django.utils import timezone
from django.utils.text import slugify
from rest_framework import serializers

from .leave_rules import (
    employee_has_rule,
    employee_on_probation,
    leave_days_in_year,
    normalize_leave_type_code,
    quota_for_rule,
    resolve_leave_rule,
    validate_leave_request_dates,
)
from .models import (
    EmployeeLeaveProfile,
    LeavePolicy,
    LeavePolicyAssignment,
    LeaveRequest,
    LeaveStatus,
    LeaveTypeRule,
    LeaveTypeRuleAssignment,
    SYSTEM_LEAVE_RULE_CODES,
)


class LeaveRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    reviewed_by_email = serializers.EmailField(source="reviewed_by.email", read_only=True)
    policy_name = serializers.SerializerMethodField()
    leave_type_name = serializers.SerializerMethodField()

    class Meta:
        model = LeaveRequest
        fields = (
            "id",
            "employee",
            "employee_name",
            "leave_type",
            "leave_type_name",
            "start_date",
            "end_date",
            "half_day",
            "reason",
            "status",
            "reviewed_by",
            "reviewed_by_email",
            "policy_name",
            "reviewed_at",
            "review_note",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "status",
            "reviewed_by",
            "reviewed_by_email",
            "reviewed_at",
            "review_note",
            "created_at",
            "updated_at",
            "employee_name",
            "leave_type_name",
        )
        extra_kwargs = {
            "employee": {"required": False},
        }

    def get_employee_name(self, obj):
        u = obj.employee.user
        return f"{u.first_name} {u.last_name}".strip() or u.email

    def get_leave_type_name(self, obj):
        rule = resolve_leave_rule(obj.employee, obj.leave_type)
        return rule.name if rule else obj.leave_type.replace("_", " ").title()

    def validate(self, attrs):
        start = attrs.get("start_date") or getattr(self.instance, "start_date", None)
        end = attrs.get("end_date") or getattr(self.instance, "end_date", None)
        leave_type = attrs.get("leave_type") or getattr(self.instance, "leave_type", "paid_leave")
        employee = attrs.get("employee") or getattr(self.instance, "employee", None)
        if employee is None:
            request = self.context.get("request")
            employee = getattr(getattr(request, "user", None), "employee_profile", None)
        if start and end and end < start:
            raise serializers.ValidationError("End date must be on or after start date.")
        if not employee or not start or not end:
            return attrs
        if self.instance and self.instance.status != LeaveStatus.PENDING:
            return attrs

        code = normalize_leave_type_code(leave_type)
        attrs["leave_type"] = code
        rule = resolve_leave_rule(employee, code)
        if not rule:
            raise serializers.ValidationError("Leave type is not configured for your organization. Please contact HR.")
        if not employee_has_rule(employee, rule):
            raise serializers.ValidationError(f"{rule.name} is not assigned to you. Please contact HR.")

        on_probation = employee_on_probation(employee)
        if on_probation and not rule.allowed_under_probation:
            raise serializers.ValidationError(
                f"{rule.name} is not allowed during probation under your leave rules."
            )

        today = timezone.localdate()
        date_errors = validate_leave_request_dates(rule, start, end, today)
        if date_errors:
            raise serializers.ValidationError(date_errors[0])

        requested_days = (end - start).days + 1
        if rule.max_per_month and requested_days > float(rule.max_per_month):
            raise serializers.ValidationError(
                f"Maximum {rule.max_per_month} days allowed per month for {rule.name}."
            )
        if rule.continuous_allowed and requested_days > rule.continuous_allowed:
            raise serializers.ValidationError(
                f"Maximum {rule.continuous_allowed} continuous days allowed for {rule.name}."
            )

        year = start.year
        today = timezone.localdate()
        as_of = min(today, start)
        quota = quota_for_rule(rule, on_probation, employee=employee, as_of=as_of)
        if quota is None:
            return attrs
        used = leave_days_in_year(employee, code, year)
        if self.instance and self.instance.status == LeaveStatus.APPROVED:
            used -= (self.instance.end_date - self.instance.start_date).days + 1
        remaining = max(quota - used, 0)
        if requested_days > remaining and not rule.negative_allowed:
            raise serializers.ValidationError(
                f"Insufficient {rule.name} balance. Requested {requested_days}, remaining {remaining:.0f}."
            )
        return attrs

    def get_policy_name(self, obj):
        rule = resolve_leave_rule(obj.employee, obj.leave_type)
        if rule:
            return rule.name
        assignment = getattr(obj.employee, "leave_policy_assignment", None)
        if assignment and assignment.policy:
            return assignment.policy.name
        return "Unassigned"


class LeaveReviewSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[LeaveStatus.APPROVED, LeaveStatus.REJECTED])
    review_note = serializers.CharField(required=False, allow_blank=True, max_length=500)


class LeaveTypeRuleSerializer(serializers.ModelSerializer):
    employee_count = serializers.SerializerMethodField()

    class Meta:
        model = LeaveTypeRule
        fields = (
            "id",
            "organization",
            "code",
            "is_system",
            "name",
            "description",
            "short_name",
            "annual_quota",
            "count_weekends",
            "count_holidays",
            "accrual_basis",
            "present_day_basis",
            "accrual_frequency",
            "accrual_period",
            "allowed_under_probation",
            "allowed_under_notice",
            "probation_quota",
            "encash_enabled",
            "carry_forward_enabled",
            "max_per_month",
            "continuous_allowed",
            "negative_allowed",
            "future_dated_allowed",
            "future_dated_after_days",
            "backdated_allowed",
            "backdated_up_to_days",
            "apply_next_year_until_month",
            "is_active",
            "sort_order",
            "employee_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "organization", "code", "is_system", "employee_count", "created_at", "updated_at")

    def get_employee_count(self, obj):
        return obj.assignments.values("employee_id").distinct().count()


class LeaveTypeRuleWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveTypeRule
        fields = (
            "name",
            "description",
            "short_name",
            "annual_quota",
            "count_weekends",
            "count_holidays",
            "accrual_basis",
            "present_day_basis",
            "accrual_frequency",
            "accrual_period",
            "allowed_under_probation",
            "allowed_under_notice",
            "probation_quota",
            "encash_enabled",
            "carry_forward_enabled",
            "max_per_month",
            "continuous_allowed",
            "negative_allowed",
            "future_dated_allowed",
            "future_dated_after_days",
            "backdated_allowed",
            "backdated_up_to_days",
            "apply_next_year_until_month",
            "is_active",
            "sort_order",
        )

    def validate_name(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Name is required.")
        return value


class LeaveTypeRuleCreateSerializer(LeaveTypeRuleWriteSerializer):
    name = serializers.CharField(max_length=120)

    def create(self, validated_data):
        org_id = self.context["organization_id"]
        base = slugify(validated_data["name"]).replace("-", "_") or "custom_leave"
        code = base
        n = 1
        while LeaveTypeRule.objects.filter(organization_id=org_id, code=code).exists():
            n += 1
            code = f"{base}_{n}"
        return LeaveTypeRule.objects.create(
            organization_id=org_id,
            code=code,
            is_system=False,
            sort_order=200 + n,
            **validated_data,
        )


class LeaveTypeRuleAssignmentSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    employee_code = serializers.CharField(source="employee.employee_code", read_only=True)
    rule_name = serializers.CharField(source="rule.name", read_only=True)
    rule_code = serializers.CharField(source="rule.code", read_only=True)
    rule_short_name = serializers.CharField(source="rule.short_name", read_only=True)
    is_on_probation = serializers.SerializerMethodField()

    class Meta:
        model = LeaveTypeRuleAssignment
        fields = (
            "id",
            "employee",
            "employee_name",
            "employee_code",
            "rule",
            "rule_name",
            "rule_code",
            "rule_short_name",
            "is_on_probation",
            "created_at",
        )
        read_only_fields = fields

    def get_employee_name(self, obj):
        u = obj.employee.user
        return f"{u.first_name} {u.last_name}".strip() or u.email

    def get_is_on_probation(self, obj):
        profile = getattr(obj.employee, "leave_profile", None)
        return bool(profile and profile.is_on_probation)


class LeaveTypeRuleBulkAssignSerializer(serializers.Serializer):
    rule_ids = serializers.ListField(child=serializers.IntegerField(min_value=1), allow_empty=False)
    employee_ids = serializers.ListField(child=serializers.IntegerField(min_value=1), allow_empty=False)
    is_on_probation = serializers.BooleanField(required=False, default=False)
    effective_from = serializers.DateField(required=False, allow_null=True)


class EmployeeLeaveProfileSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    employee_code = serializers.CharField(source="employee.employee_code", read_only=True)

    class Meta:
        model = EmployeeLeaveProfile
        fields = (
            "id",
            "employee",
            "employee_name",
            "employee_code",
            "is_on_probation",
            "effective_from",
            "updated_at",
        )
        read_only_fields = ("id", "employee_name", "employee_code", "updated_at")

    def get_employee_name(self, obj):
        u = obj.employee.user
        return f"{u.first_name} {u.last_name}".strip() or u.email


# Legacy policy serializers (backward compatible)
class LeavePolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = LeavePolicy
        fields = (
            "id",
            "name",
            "description",
            "annual_quota",
            "sick_quota",
            "casual_quota",
            "other_quota",
            "probation_annual_quota",
            "probation_sick_quota",
            "probation_casual_quota",
            "probation_other_quota",
            "allow_unpaid",
            "allow_leave_under_probation",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class LeavePolicyAssignmentSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    employee_code = serializers.CharField(source="employee.employee_code", read_only=True)
    policy_name = serializers.CharField(source="policy.name", read_only=True)

    class Meta:
        model = LeavePolicyAssignment
        fields = (
            "id",
            "employee",
            "employee_name",
            "employee_code",
            "policy",
            "policy_name",
            "is_on_probation",
            "effective_from",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "employee_name", "employee_code", "policy_name", "created_at", "updated_at")

    def get_employee_name(self, obj):
        u = obj.employee.user
        return f"{u.first_name} {u.last_name}".strip() or u.email


class LeavePolicyBulkAssignSerializer(serializers.Serializer):
    policy_id = serializers.IntegerField()
    employee_ids = serializers.ListField(child=serializers.IntegerField(min_value=1), allow_empty=False)
    is_on_probation = serializers.BooleanField(required=False, default=False)
    effective_from = serializers.DateField(required=False, allow_null=True)
