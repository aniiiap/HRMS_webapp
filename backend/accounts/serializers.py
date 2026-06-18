from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.utils import timezone

from employees.org_scope import user_organization_id

from .models import AppNotification, CompanyAnnouncement, InviteToken, PasswordResetToken, User, UserRole


def _user_payload(user):
    ep = getattr(user, "employee_profile", None)
    return {
        "id": user.id,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": user.role,
        "is_superuser": user.is_superuser,
        "employee_id": ep.id if ep else None,
        "organization_id": user_organization_id(user),
    }


class UserSerializer(serializers.ModelSerializer):
    employee_id = serializers.SerializerMethodField()
    organization_id = serializers.SerializerMethodField()
    is_superuser = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
            "is_active",
            "is_superuser",
            "date_joined",
            "employee_id",
            "organization_id",
        )
        read_only_fields = ("id", "date_joined", "employee_id", "organization_id", "is_superuser")

    def get_employee_id(self, user):
        ep = getattr(user, "employee_profile", None)
        return ep.id if ep else None

    def get_organization_id(self, user):
        return user_organization_id(user)


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("id", "email", "password", "first_name", "last_name", "role")

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["email"] = user.email
        token["name"] = f"{user.first_name} {user.last_name}".strip() or user.email
        return token

    def validate(self, attrs):
        email = (attrs.get("email") or "").strip()
        password = attrs.get("password") or ""
        user = User.objects.filter(email__iexact=email).first()

        if not user:
            raise serializers.ValidationError({"error": "No account found with this email address."})
        if user.onboarding_pending or not user.has_usable_password():
            raise serializers.ValidationError(
                {"error": "Please activate your account from the invite email before signing in."}
            )
        if not user.is_active:
            raise serializers.ValidationError(
                {"error": "This account is inactive. Please contact your administrator."}
            )
        if not user.check_password(password):
            raise serializers.ValidationError(
                {
                    "error": "Incorrect password. Please try again or use Forgot password to reset it.",
                    "password": ["Incorrect password."],
                }
            )

        data = super().validate(attrs)
        data["user"] = _user_payload(self.user)
        return data


class InviteAcceptSerializer(serializers.Serializer):
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_token(self, value):
        invite = InviteToken.objects.filter(token=value).select_related("user").first()
        if not invite:
            raise serializers.ValidationError("Invalid invite token.")
        if not invite.is_valid:
            raise serializers.ValidationError("Invite token is expired or already used.")
        self._invite = invite
        return value

    def save(self):
        invite = self._invite
        user = invite.user
        user.set_password(self.validated_data["password"])
        user.is_active = True
        user.onboarding_pending = False
        user.save(update_fields=["password", "is_active", "onboarding_pending"])
        invite.used_at = timezone.now()
        invite.save(update_fields=["used_at"])
        InviteToken.objects.filter(user=user, used_at__isnull=True).exclude(pk=invite.pk).delete()
        return user


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_token(self, value):
        reset = PasswordResetToken.objects.filter(token=value).select_related("user").first()
        if not reset:
            raise serializers.ValidationError("Invalid or expired reset link.")
        if not reset.is_valid:
            raise serializers.ValidationError("Invalid or expired reset link.")
        user = reset.user
        if not user.is_active or user.onboarding_pending or not user.has_usable_password():
            raise serializers.ValidationError("This account cannot be reset. Contact your administrator.")
        self._reset = reset
        return value

    def save(self):
        reset = self._reset
        user = reset.user
        user.set_password(self.validated_data["password"])
        user.save(update_fields=["password"])
        reset.used_at = timezone.now()
        reset.save(update_fields=["used_at"])
        PasswordResetToken.objects.filter(user=user, used_at__isnull=True).exclude(pk=reset.pk).delete()
        return user


class InviteResendSerializer(serializers.Serializer):
    employee_id = serializers.IntegerField(required=False)
    email = serializers.EmailField(required=False)

    def validate(self, attrs):
        if not attrs.get("employee_id") and not attrs.get("email"):
            raise serializers.ValidationError({"error": "Provide employee_id or email."})
        return attrs


class AppNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppNotification
        fields = ("id", "title", "message", "type", "is_read", "created_at")


class CompanyAnnouncementSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    created_by_id = serializers.IntegerField(source="created_by.id", read_only=True)
    target_employee_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        write_only=True,
    )
    target_employee_names = serializers.SerializerMethodField()
    delivery = serializers.DictField(read_only=True, required=False)

    class Meta:
        model = CompanyAnnouncement
        fields = (
            "id",
            "title",
            "message",
            "is_active",
            "priority",
            "target_audience",
            "target_value",
            "target_employee_ids",
            "target_employee_names",
            "send_email",
            "send_sms",
            "publish_on",
            "published_at",
            "updated_at",
            "created_by_name",
            "created_by_id",
            "delivery",
        )
        read_only_fields = (
            "id",
            "published_at",
            "updated_at",
            "created_by_name",
            "created_by_id",
            "target_employee_names",
            "delivery",
        )

    def validate(self, attrs):
        target_audience = attrs.get("target_audience")
        target_value = attrs.get("target_value")
        target_employee_ids = attrs.get("target_employee_ids")
        instance = getattr(self, "instance", None)

        if target_audience is None and instance is not None:
            target_audience = instance.target_audience
        if target_value is None and instance is not None:
            target_value = instance.target_value
        if target_employee_ids is None and instance is not None:
            target_employee_ids = None

        if target_audience in (
            CompanyAnnouncement.TargetAudience.DEPARTMENT,
            CompanyAnnouncement.TargetAudience.ROLE,
        ) and not (target_value or "").strip():
            raise serializers.ValidationError(
                {"target_value": "Target value is required for department or role announcements."}
            )
        if target_audience == CompanyAnnouncement.TargetAudience.ROLE and target_value:
            allowed_roles = {choice[0] for choice in UserRole.choices}
            if target_value not in allowed_roles:
                raise serializers.ValidationError(
                    {"target_value": f"Role must be one of: {', '.join(sorted(allowed_roles))}."}
                )
        if target_audience == CompanyAnnouncement.TargetAudience.EMPLOYEES:
            ids = target_employee_ids
            if ids is None and instance is not None:
                ids = list(instance.target_employees.values_list("id", flat=True))
            if not ids:
                raise serializers.ValidationError(
                    {"target_employee_ids": "Select at least one employee."}
                )
            attrs["target_value"] = ""
        elif target_audience == CompanyAnnouncement.TargetAudience.ALL:
            attrs["target_value"] = ""
        elif target_value is not None:
            attrs["target_value"] = target_value.strip()

        return attrs

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["target_employee_ids"] = list(instance.target_employees.values_list("id", flat=True))
        return data

    def get_target_employee_names(self, obj):
        return [
            f"{e.user.first_name} {e.user.last_name}".strip() or e.user.email
            for e in obj.target_employees.select_related("user")[:50]
        ]

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return "System"
        name = f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
        return name or obj.created_by.email
