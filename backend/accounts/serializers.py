from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.utils import timezone

from .models import AppNotification, InviteToken, User, UserRole


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name", "role", "is_active", "date_joined")
        read_only_fields = ("id", "date_joined")


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
        user = User.objects.filter(email__iexact=attrs.get("email", "")).first()
        if user and user.onboarding_pending:
            raise serializers.ValidationError(
                {"error": "Please activate your account from the invite email before signing in."}
            )
        data = super().validate(attrs)
        user = self.user
        data["user"] = {
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role,
        }
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
