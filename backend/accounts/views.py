from django.contrib.auth import get_user_model
from django.conf import settings
from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, ScopedRateThrottle, UserRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from employees.models import Employee
from employees.org_scope import (
    filter_users_by_org,
    is_platform_admin,
    organization_id_from_request,
    user_organization_id,
)

from .invite_service import issue_and_send_invite
from .password_reset_service import issue_and_send_password_reset, user_can_reset_password
from .permissions import IsAdminOrHR
from .serializers import (
    AppNotificationSerializer,
    CompanyAnnouncementSerializer,
    CustomTokenObtainPairSerializer,
    InviteAcceptSerializer,
    InviteResendSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    UserCreateSerializer,
    UserSerializer,
)
from .announcement_service import (
    announcement_matches_user,
    dispatch_if_due,
    pending_popup_for_user,
    release_due_announcements,
)
from .models import AnnouncementDismissal, CompanyAnnouncement, UserRole
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

    def get_queryset(self):
        qs = super().get_queryset()
        if is_platform_admin(self.request.user):
            return qs.none()
        return filter_users_by_org(qs, user_organization_id(self.request.user))

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
        if self.action in ("pending_popup", "dismiss"):
            return [permissions.IsAuthenticated()]
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsManagerOrAbove()]

    def _org_id(self):
        return user_organization_id(self.request.user) or organization_id_from_request(self.request)

    def _attach_target_employees(self, announcement, emp_ids):
        org_id = announcement.organization_id
        if announcement.target_audience != CompanyAnnouncement.TargetAudience.EMPLOYEES:
            announcement.target_employees.clear()
            return
        qs = Employee.objects.filter(id__in=emp_ids or [], organization_id=org_id)
        announcement.target_employees.set(qs)

    def _maybe_dispatch(self, announcement, *, was_active: bool | None = None):
        if was_active is not None and was_active and not announcement.is_active:
            return {}
        if was_active is not None and not was_active and announcement.is_active:
            stats = dispatch_if_due(announcement)
            announcement._delivery_stats = stats
            return stats
        stats = dispatch_if_due(announcement)
        announcement._delivery_stats = stats
        return stats

    def get_queryset(self):
        qs = CompanyAnnouncement.objects.select_related("created_by", "organization").prefetch_related(
            "target_employees", "target_employees__user"
        )
        org_id = self._org_id()
        if not org_id:
            return qs.none()
        qs = qs.filter(
            Q(organization_id=org_id)
            | Q(organization_id__isnull=True, created_by__organization_id=org_id)
            | Q(organization_id__isnull=True, created_by__employee_profile__organization_id=org_id)
        )

        user = self.request.user
        if user.is_superuser or user.role in (UserRole.ADMIN, UserRole.HR, UserRole.MANAGER):
            return qs

        release_due_announcements(org_id=org_id)
        employee = getattr(user, "employee_profile", None)
        today = timezone.localdate()
        audience_filter = Q(target_audience=CompanyAnnouncement.TargetAudience.ALL)
        if employee and employee.department:
            audience_filter |= Q(
                target_audience=CompanyAnnouncement.TargetAudience.DEPARTMENT,
                target_value__iexact=employee.department.strip(),
            )
        audience_filter |= Q(
            target_audience=CompanyAnnouncement.TargetAudience.ROLE,
            target_value=user.role,
        )
        if employee:
            audience_filter |= Q(
                target_audience=CompanyAnnouncement.TargetAudience.EMPLOYEES,
                target_employees=employee,
            )
        return (
            qs.filter(is_active=True)
            .filter(Q(publish_on__isnull=True) | Q(publish_on__lte=today))
            .filter(audience_filter)
            .exclude(created_by=user)
            .distinct()
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        data = dict(serializer.data)
        data["delivery"] = getattr(serializer.instance, "_delivery_stats", {})
        headers = self.get_success_headers(serializer.data)
        return Response(data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        data = dict(serializer.data)
        data["delivery"] = getattr(serializer.instance, "_delivery_stats", {})
        return Response(data)

    def perform_create(self, serializer):
        org_id = self._org_id()
        if not org_id:
            from rest_framework.exceptions import ValidationError

            raise ValidationError(
                {"detail": "Your account is not linked to an organization. Cannot publish announcements."}
            )
        emp_ids = serializer.validated_data.pop("target_employee_ids", [])
        publish_on = serializer.validated_data.get("publish_on") or timezone.localdate()
        announcement = serializer.save(
            created_by=self.request.user,
            organization_id=org_id,
            publish_on=publish_on,
        )
        self._attach_target_employees(announcement, emp_ids)
        self._maybe_dispatch(announcement)

    def perform_update(self, serializer):
        was_active = serializer.instance.is_active
        emp_ids = serializer.validated_data.pop("target_employee_ids", None)
        announcement = serializer.save()
        if emp_ids is not None:
            self._attach_target_employees(announcement, emp_ids)
        self._maybe_dispatch(announcement, was_active=was_active)

    @action(detail=False, methods=["get"], url_path="pending-popup")
    def pending_popup(self, request):
        announcement = pending_popup_for_user(request.user)
        if not announcement:
            return Response({"announcement": None})
        return Response({"announcement": CompanyAnnouncementSerializer(announcement).data})

    @action(detail=True, methods=["post"])
    def dismiss(self, request, pk=None):
        announcement = CompanyAnnouncement.objects.filter(pk=pk).first()
        if not announcement or not announcement_matches_user(announcement, request.user):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        AnnouncementDismissal.objects.update_or_create(
            user=request.user,
            announcement=announcement,
            defaults={"dismissed_at": timezone.now()},
        )
        request.user.app_notifications.filter(
            type="announcement",
            title=announcement.title,
            is_read=False,
        ).update(is_read=True)
        return Response({"ok": True})


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


PASSWORD_RESET_SENT_MESSAGE = (
    "If an account exists for this email, you will receive password reset instructions shortly."
)


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
@throttle_classes([AnonRateThrottle, ScopedRateThrottle])
def password_reset_request_view(request):
    ser = PasswordResetRequestSerializer(data=request.data)
    ser.is_valid(raise_exception=True)
    email = ser.validated_data["email"].strip().lower()
    user = User.objects.filter(email__iexact=email).first()
    payload = {"message": PASSWORD_RESET_SENT_MESSAGE}
    if user and user_can_reset_password(user):
        _reset, _reset_url, ok, detail = issue_and_send_password_reset(
            user, frontend_origin=request.headers.get("Origin")
        )
        if not ok:
            payload["email_status"] = detail
    return Response(payload, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
@throttle_classes([AnonRateThrottle, ScopedRateThrottle])
def password_reset_confirm_view(request):
    ser = PasswordResetConfirmSerializer(data=request.data)
    ser.is_valid(raise_exception=True)
    ser.save()
    return Response(
        {"message": "Password updated successfully. You can now sign in."},
        status=status.HTTP_200_OK,
    )


password_reset_request_view.throttle_scope = "auth_password_reset"
password_reset_confirm_view.throttle_scope = "auth_password_reset"


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
    caller_org = user_organization_id(request.user)
    if caller_org and employee.organization_id != caller_org:
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
