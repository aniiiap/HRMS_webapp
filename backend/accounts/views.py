from django.contrib.auth import get_user_model
from django.conf import settings
from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, ScopedRateThrottle, UserRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from employees.models import Employee

from .invite_service import issue_and_send_invite
from .permissions import IsAdminOrHR
from .serializers import (
    AppNotificationSerializer,
    CompanyAnnouncementSerializer,
    CustomTokenObtainPairSerializer,
    InviteAcceptSerializer,
    InviteResendSerializer,
    UserCreateSerializer,
    UserSerializer,
)
from .models import CompanyAnnouncement
from .permissions import IsManagerOrAbove

User = get_user_model()


class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [AnonRateThrottle, ScopedRateThrottle]
    throttle_scope = "auth_login"


class RefreshView(TokenRefreshView):
    pass


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def logout_view(request):
    try:
        refresh = request.data.get("refresh")
        if not refresh:
            return Response({"error": "refresh token required"}, status=status.HTTP_400_BAD_REQUEST)
        token = RefreshToken(refresh)
        token.blacklist()
        return Response(status=status.HTTP_205_RESET_CONTENT)
    except Exception:
        return Response({"error": "Invalid token"}, status=status.HTTP_400_BAD_REQUEST)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("-date_joined")
    permission_classes = [permissions.IsAuthenticated, IsAdminOrHR]

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        return UserSerializer


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AppNotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Notification tray should show only unread items.
        # "Clear" marks all as read, so they should not reappear on reload.
        return self.request.user.app_notifications.filter(is_read=False)


class CompanyAnnouncementViewSet(viewsets.ModelViewSet):
    serializer_class = CompanyAnnouncementSerializer
    queryset = CompanyAnnouncement.objects.all()

    def get_permissions(self):
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsManagerOrAbove()]

    def get_queryset(self):
        qs = CompanyAnnouncement.objects.select_related("created_by").all()
        if self.request.user.is_superuser or self.request.user.role in ("admin", "hr", "manager"):
            return qs
        employee = getattr(self.request.user, "employee_profile", None)
        now = timezone.now()
        audience_filter = Q(target_audience=CompanyAnnouncement.TargetAudience.ALL)
        if employee and employee.department:
            audience_filter |= Q(
                target_audience=CompanyAnnouncement.TargetAudience.DEPARTMENT,
                target_value__iexact=employee.department.strip(),
            )
        audience_filter |= Q(
            target_audience=CompanyAnnouncement.TargetAudience.ROLE,
            target_value=self.request.user.role,
        )
        return qs.filter(
            is_active=True,
        ).filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=now)
        ).filter(
            audience_filter
        ).exclude(created_by=self.request.user)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def notifications_mark_all_read_view(request):
    request.user.app_notifications.filter(is_read=False).update(is_read=True)
    return Response({"message": "Marked as read."}, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
@throttle_classes([AnonRateThrottle])
def invite_accept_view(request):
    ser = InviteAcceptSerializer(data=request.data)
    ser.is_valid(raise_exception=True)
    ser.save()
    return Response({"message": "Password set successfully. You can now sign in."}, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated, IsAdminOrHR])
@throttle_classes([UserRateThrottle])
def invite_resend_view(request):
    ser = InviteResendSerializer(data=request.data)
    ser.is_valid(raise_exception=True)
    employee_id = ser.validated_data.get("employee_id")
    email = ser.validated_data.get("email")
    employee = None
    if employee_id:
        employee = Employee.objects.select_related("user").filter(pk=employee_id).first()
    elif email:
        employee = Employee.objects.select_related("user").filter(user__email__iexact=email).first()
    if not employee:
        return Response({"error": "Employee not found."}, status=status.HTTP_404_NOT_FOUND)

    user = employee.user
    user.onboarding_pending = True
    user.is_active = False
    user.save(update_fields=["onboarding_pending", "is_active"])
    _invite, invite_url, ok, detail = issue_and_send_invite(
        user,
        created_by=request.user,
        frontend_origin=request.headers.get("Origin"),
    )
    payload = {"message": "Invite resent." if ok else "Invite created but email failed to send.", "email_status": detail}
    if settings.DEBUG:
        payload["invite_url"] = invite_url
    return Response(payload, status=status.HTTP_200_OK if ok else status.HTTP_202_ACCEPTED)
