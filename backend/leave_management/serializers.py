from django.utils import timezone
from rest_framework import serializers

from .models import LeaveRequest, LeaveStatus


class LeaveRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    reviewed_by_email = serializers.EmailField(source="reviewed_by.email", read_only=True)

    class Meta:
        model = LeaveRequest
        fields = (
            "id",
            "employee",
            "employee_name",
            "leave_type",
            "start_date",
            "end_date",
            "reason",
            "status",
            "reviewed_by",
            "reviewed_by_email",
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
        )
        extra_kwargs = {
            "employee": {"required": False},
        }

    def get_employee_name(self, obj):
        u = obj.employee.user
        return f"{u.first_name} {u.last_name}".strip() or u.email

    def validate(self, attrs):
        start = attrs.get("start_date") or getattr(self.instance, "start_date", None)
        end = attrs.get("end_date") or getattr(self.instance, "end_date", None)
        if start and end and end < start:
            raise serializers.ValidationError("End date must be on or after start date.")
        return attrs


class LeaveReviewSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[LeaveStatus.APPROVED, LeaveStatus.REJECTED])
    review_note = serializers.CharField(required=False, allow_blank=True, max_length=500)
