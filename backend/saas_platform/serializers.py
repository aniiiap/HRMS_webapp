from django.contrib.auth import get_user_model
from django.db.models import Count
from rest_framework import serializers

from accounts.models import UserRole
from accounts.org_onboarding import create_organization_admin
from employees.models import Employee, Organization
from employees.serializers import OrganizationSerializer

User = get_user_model()


class PlatformOrganizationSerializer(OrganizationSerializer):
    employee_count = serializers.SerializerMethodField()
    admin_count = serializers.SerializerMethodField()
    pending_admin_count = serializers.SerializerMethodField()

    admin_email = serializers.EmailField(required=False, write_only=True)
    admin_first_name = serializers.CharField(max_length=150, required=False, allow_blank=True, write_only=True)
    admin_last_name = serializers.CharField(max_length=150, required=False, allow_blank=True, write_only=True)
    send_invite = serializers.BooleanField(default=True, write_only=True)

    class Meta(OrganizationSerializer.Meta):
        fields = OrganizationSerializer.Meta.fields + (
            "employee_count",
            "admin_count",
            "pending_admin_count",
            "admin_email",
            "admin_first_name",
            "admin_last_name",
            "send_invite",
        )
        read_only_fields = OrganizationSerializer.Meta.read_only_fields + (
            "employee_count",
            "admin_count",
            "pending_admin_count",
        )

    def get_employee_count(self, obj):
        if hasattr(obj, "employee_count"):
            return obj.employee_count
        return obj.employees.count()

    def get_admin_count(self, obj):
        if hasattr(obj, "admin_count"):
            return obj.admin_count
        return obj.users.filter(role=UserRole.ADMIN).count()

    def get_pending_admin_count(self, obj):
        if hasattr(obj, "pending_admin_count"):
            return obj.pending_admin_count
        return obj.users.filter(role=UserRole.ADMIN, onboarding_pending=True).count()

    def validate(self, attrs):
        if self.instance is not None:
            for key in ("admin_email", "admin_first_name", "admin_last_name", "send_invite"):
                attrs.pop(key, None)
            return attrs

        send_invite = attrs.get("send_invite", True)
        admin_email = (attrs.get("admin_email") or "").strip()
        contact_email = (attrs.get("contact_email") or "").strip()
        invite_email = admin_email or contact_email
        if send_invite and not invite_email:
            raise serializers.ValidationError(
                {"admin_email": "Provide admin email or contact email to send the signup invite."}
            )
        if invite_email and User.objects.filter(email__iexact=invite_email).exists():
            raise serializers.ValidationError({"admin_email": "A user with this email already exists."})
        return attrs

    def create(self, validated_data):
        admin_email = (validated_data.pop("admin_email", None) or "").strip()
        admin_first_name = validated_data.pop("admin_first_name", "")
        admin_last_name = validated_data.pop("admin_last_name", "")
        send_invite = validated_data.pop("send_invite", True)
        contact_email = (validated_data.get("contact_email") or "").strip()

        invite_email = admin_email or contact_email
        org = super().create(validated_data)
        self._admin_invite_result = None

        if invite_email:
            request = self.context.get("request")
            try:
                self._admin_invite_result = create_organization_admin(
                    organization=org,
                    email=invite_email,
                    first_name=admin_first_name,
                    last_name=admin_last_name,
                    send_invite=send_invite,
                    created_by=request.user if request else None,
                    frontend_origin=request.headers.get("Origin") if request else None,
                )
            except ValueError as exc:
                raise serializers.ValidationError({"admin_email": str(exc)}) from exc

        return org

    def to_representation(self, instance):
        data = super().to_representation(instance)
        admin_invite = getattr(self, "_admin_invite_result", None)
        if admin_invite:
            data["admin_invite"] = admin_invite
        return data


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
        org = self.context["organization"]
        request = self.context.get("request")
        try:
            return create_organization_admin(
                organization=org,
                email=validated_data["email"],
                first_name=validated_data.get("first_name", ""),
                last_name=validated_data.get("last_name", ""),
                send_invite=validated_data.get("send_invite", True),
                created_by=request.user if request else None,
                frontend_origin=request.headers.get("Origin") if request else None,
            )
        except ValueError as exc:
            raise serializers.ValidationError({"email": str(exc)}) from exc


class PlatformResendAdminInviteSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False)

    def validate(self, attrs):
        org = self.context["organization"]
        email = (attrs.get("email") or "").strip().lower()
        qs = User.objects.filter(organization=org, role=UserRole.ADMIN, onboarding_pending=True)
        if email:
            user = qs.filter(email__iexact=email).first()
            if not user:
                raise serializers.ValidationError({"email": "No pending admin invite for this email."})
        else:
            user = qs.order_by("id").first()
            if not user:
                raise serializers.ValidationError({"error": "No pending organization admin to re-invite."})
        attrs["user"] = user
        return attrs
