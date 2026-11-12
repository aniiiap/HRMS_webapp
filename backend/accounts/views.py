from django.contrib.auth import get_user_model
from django.conf import settings
from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes, authentication_classes
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


from .serializers import CustomTokenRefreshSerializer

class RefreshView(TokenRefreshView):
    serializer_class = CustomTokenRefreshSerializer
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
@authentication_classes([])
@permission_classes([permissions.AllowAny])
@throttle_classes([AnonRateThrottle, ScopedRateThrottle])
def password_reset_request_view(request):
    ser = PasswordResetRequestSerializer(data=request.data)
    ser.is_valid(raise_exception=True)
    email = ser.validated_data["email"]
    
    try:
        user = User.objects.get(email__iexact=email)
        if user_can_reset_password(user):
            _token, _url, _ok, _detail = issue_and_send_password_reset(
                user,
                frontend_origin=request.headers.get("Origin")
            )
    except User.DoesNotExist:
        pass
    
    return Response(
        {"message": "If that email exists in our system, you will receive a password reset link shortly."},
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@authentication_classes([])
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


@api_view(["GET"])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
@throttle_classes([AnonRateThrottle])
def invite_details_view(request):
    from .models import InviteToken
    token = request.query_params.get("token")
    if not token:
        return Response({"error": "Missing token parameter"}, status=status.HTTP_400_BAD_REQUEST)
    
    invite = InviteToken.objects.filter(token=token).select_related("user").first()
    if not invite or not invite.is_valid:
        return Response({"error": "Invalid or expired token"}, status=status.HTTP_400_BAD_REQUEST)
    
    return Response({
        "email": invite.user.email,
        "first_name": invite.user.first_name,
        "last_name": invite.user.last_name
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([])
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
    payload = {"message": "Invite resent." if ok else "Invite created but email failed to send.", "email_status": detail, "invite_url": invite_url}
    return Response(payload, status=status.HTTP_200_OK if ok else status.HTTP_202_ACCEPTED)

from .models import ActionLog
from .serializers import ActionLogSerializer
from rest_framework import viewsets, mixins

def purge_old_action_logs_if_enabled(organization):
    """Delete ActionLogs older than the 1st of the current month when auto-delete is enabled."""
    if not organization or not getattr(organization, "auto_delete_old_audit_logs", False):
        return 0
    from datetime import datetime, time
    from django.core.cache import cache

    today = timezone.localdate()
    cache_key = f"audit_autopurge:{organization.id}:{today.strftime('%Y-%m')}"
    if cache.get(cache_key):
        return 0

    first_of_month = today.replace(day=1)
    tz = timezone.get_current_timezone()
    start_dt = timezone.make_aware(datetime.combine(first_of_month, time.min), tz)
    deleted_count, _ = ActionLog.objects.filter(organization=organization, timestamp__lt=start_dt).delete()
    cache.set(cache_key, True, 43200)
    return deleted_count


class ActionLogViewSet(mixins.ListModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ActionLogSerializer

    def _resolve_org(self):
        from employees.models import Organization
        from employees.org_scope import organization_id_from_request

        user = self.request.user
        org = getattr(user, "organization", None)
        if org is not None:
            return org
        profile_org = getattr(getattr(user, "employee_profile", None), "organization", None)
        if profile_org is not None:
            return profile_org
        org_id = organization_id_from_request(self.request)
        if org_id:
            return Organization.objects.filter(id=org_id).first()
        if user.is_superuser:
            return Organization.objects.order_by("id").first()
        return None

    def _base_org_queryset(self):
        user = self.request.user
        if not (user.is_superuser or user.role in (UserRole.ADMIN, UserRole.HR)):
            return ActionLog.objects.none()
        if user.is_superuser and not user.organization_id:
            return ActionLog.objects.all().order_by("-timestamp")
        org = self._resolve_org()
        if org is None:
            return ActionLog.objects.none()
        return ActionLog.objects.filter(organization=org).order_by("-timestamp")

    def _apply_filters(self, queryset, params):
        from datetime import datetime, time, timedelta, date as dt_date

        resource_type = params.get("resource_type")
        date_from = params.get("date_from")
        date_to = params.get("date_to")
        search = params.get("search")

        if resource_type:
            queryset = queryset.filter(resource_type__icontains=resource_type)
        tz = timezone.get_current_timezone()
        if date_from:
            try:
                d_from = dt_date.fromisoformat(str(date_from))
                start_dt = timezone.make_aware(datetime.combine(d_from, time.min), tz)
                queryset = queryset.filter(timestamp__gte=start_dt)
            except ValueError:
                queryset = queryset.filter(timestamp__date__gte=date_from)
        if date_to:
            try:
                d_to = dt_date.fromisoformat(str(date_to))
                end_dt = timezone.make_aware(datetime.combine(d_to + timedelta(days=1), time.min), tz)
                queryset = queryset.filter(timestamp__lt=end_dt)
            except ValueError:
                queryset = queryset.filter(timestamp__date__lte=date_to)
        if search:
            queryset = queryset.filter(
                Q(user_name__icontains=search) |
                Q(description__icontains=search) |
                Q(action_type__icontains=search) |
                Q(resource_id__icontains=search)
            )
        return queryset

    def get_queryset(self):
        return self._apply_filters(self._base_org_queryset(), self.request.query_params)

    def list(self, request, *args, **kwargs):
        org = self._resolve_org()
        if org:
            purge_old_action_logs_if_enabled(org)
        return super().list(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not (request.user.is_superuser or request.user.role == UserRole.ADMIN):
            return Response({"error": "Only admins can delete logs."}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=["post"])
    def bulk_delete(self, request):
        if not (request.user.is_superuser or request.user.role == UserRole.ADMIN):
            return Response({"error": "Only admins can delete logs."}, status=status.HTTP_403_FORBIDDEN)
        base_qs = self._base_org_queryset()
        delete_all = bool(request.data.get("delete_all", False))
        ids = request.data.get("ids") or []

        if delete_all:
            qs = self._apply_filters(base_qs, request.data)
            deleted_count, _ = qs.delete()
        elif isinstance(ids, list) and len(ids) > 0:
            deleted_count, _ = base_qs.filter(id__in=ids).delete()
        else:
            return Response({"error": "Provide log IDs or set delete_all to true."}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"deleted_count": deleted_count}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"])
    def delete_range(self, request):
        if not (request.user.is_superuser or request.user.role == UserRole.ADMIN):
            return Response({"error": "Only admins can delete logs."}, status=status.HTTP_403_FORBIDDEN)
        date_from = request.data.get("date_from")
        date_to = request.data.get("date_to")
        if not date_from or not date_to:
            return Response({"error": "Both date_from and date_to are required."}, status=status.HTTP_400_BAD_REQUEST)
        if str(date_from) > str(date_to):
            return Response({"error": "From date cannot be after To date."}, status=status.HTTP_400_BAD_REQUEST)

        qs = self._apply_filters(self._base_org_queryset(), request.data)
        deleted_count, _ = qs.delete()
        return Response({"deleted_count": deleted_count}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get", "post"])
    def auto_delete_setting(self, request):
        org = self._resolve_org()
        if not org:
            return Response({"auto_delete_old_audit_logs": False}, status=status.HTTP_200_OK)

        if request.method == "GET":
            return Response({"auto_delete_old_audit_logs": bool(org.auto_delete_old_audit_logs)}, status=status.HTTP_200_OK)

        if not (request.user.is_superuser or request.user.role == UserRole.ADMIN):
            return Response({"error": "Only admins can change auto-delete settings."}, status=status.HTTP_403_FORBIDDEN)

        enabled = bool(request.data.get("enabled", False))
        org.auto_delete_old_audit_logs = enabled
        org.save(update_fields=["auto_delete_old_audit_logs"])

        purged_count = 0
        if enabled:
            from datetime import datetime, time
            from django.core.cache import cache

            today = timezone.localdate()
            first_of_month = today.replace(day=1)
            tz = timezone.get_current_timezone()
            start_dt = timezone.make_aware(datetime.combine(first_of_month, time.min), tz)
            qs = ActionLog.objects.filter(organization=org, timestamp__lt=start_dt)
            purged_count, _ = qs.delete()
            cache.set(f"audit_autopurge:{org.id}:{today.strftime('%Y-%m')}", True, 43200)

        return Response(
            {"auto_delete_old_audit_logs": enabled, "purged_count": purged_count},
            status=status.HTTP_200_OK,
        )

