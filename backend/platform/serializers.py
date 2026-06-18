from django.contrib.auth import get_user_model
from django.db.models import Count
from rest_framework import serializers

from accounts.models import UserRole
from employees.models import Organization
from employees.serializers import OrganizationSerializer

User = get_user_model()


class PlatformOrganizationSerializer(OrganizationSerializer):
    employee_count = serializers.SerializerMethodField()
    admin_count = serializers.SerializerMethodField()

    class Meta(OrganizationSerializer.Meta):
        fields = OrganizationSerializer.Meta.fields + ("employee_count", "admin_count")
        read_only_fields = OrganizationSerializer.Meta.read_only_fields + (
            "employee_count",
            "admin_count",
        )

    def get_employee_count(self, obj):
        if hasattr(obj, "employee_count"):
            return obj.employee_count
        return obj.employees.count()

    def get_admin_count(self, obj):
        if hasattr(obj, "admin_count"):
            return obj.admin_count
        return obj.users.filter(role=UserRole.ADMIN).count()


class PlatformCreateOrgAdminSerializer(serializers.Serializer):
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    send_invite = serializers.BooleanField(default=True)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value.lower().strip()

    def create(self, validated_data):
        from accounts.invite_service import issue_and_send_invite

        org = self.context["organization"]
        request = self.context.get("request")
        email = validated_data["email"]
        user = User.objects.create_user(
            email=email,
            password=None,
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            role=UserRole.ADMIN,
            organization=org,
            is_active=False,
            onboarding_pending=True,
        )
        user.set_unusable_password()
        user.save(update_fields=["password"])

        invite_sent = False
        invite_url = None
        if validated_data.get("send_invite", True) and request:
            _invite, invite_url, invite_sent, _detail = issue_and_send_invite(
                user,
                created_by=request.user,
                frontend_origin=request.headers.get("Origin"),
            )
        return {
            "user_id": user.id,
            "email": user.email,
            "organization_id": org.id,
            "invite_sent": invite_sent,
            "invite_url": invite_url,
        }
