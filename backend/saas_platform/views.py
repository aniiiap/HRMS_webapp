from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count, Q
from django.db.models.deletion import ProtectedError
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.invite_service import issue_and_send_invite
from employees.models import Employee, Organization
from payroll.models import EmployeePayrollProfile
from employees.serializers import OrganizationSerializer

from .permissions import IsPlatformAdmin
from .serializers import (
    PlatformCreateOrgAdminSerializer,
    PlatformOrganizationSerializer,
    PlatformResendAdminInviteSerializer,
)

User = get_user_model()


class PlatformDashboardView(APIView):
    """HRMS owner dashboard — not tied to any tenant."""

    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        org_qs = Organization.objects.annotate(
            employee_count=Count("employees", distinct=True),
            admin_count=Count(
                "users",
                filter=Q(users__role="admin"),
                distinct=True,
            ),
        )
        total_orgs = org_qs.count()
        active_orgs = org_qs.filter(is_active=True).count()
        total_employees = Employee.objects.count()
        total_users = User.objects.count()
        recent = list(
            org_qs.order_by("-created_at")[:8].values(
                "id",
                "name",
                "slug",
                "is_active",
                "plan",
                "created_at",
                "employee_count",
                "admin_count",
            )
        )
        by_plan = list(
            org_qs.values("plan")
            .annotate(count=Count("id"))
            .order_by("plan")
        )
        return Response(
            {
                "totals": {
                    "organizations": total_orgs,
                    "active_organizations": active_orgs,
                    "employees": total_employees,
                    "users": total_users,
                },
                "recent_organizations": recent,
                "organizations_by_plan": by_plan,
            }
        )


class PlatformOrganizationViewSet(viewsets.ModelViewSet):
    """Platform operator: create, activate, and manage all tenants."""

    queryset = Organization.objects.annotate(
        employee_count=Count("employees", distinct=True),
        admin_count=Count("users", filter=Q(users__role="admin"), distinct=True),
        pending_admin_count=Count(
            "users",
            filter=Q(users__role="admin", users__onboarding_pending=True),
            distinct=True,
        ),
    ).order_by("-created_at")
    serializer_class = PlatformOrganizationSerializer
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]
    search_fields = ["name", "slug", "legal_name", "contact_email"]
    ordering_fields = ["name", "created_at", "is_active", "employee_count"]

    def get_serializer_class(self):
        if self.action in ("list", "retrieve", "create", "update", "partial_update", "destroy"):
            return PlatformOrganizationSerializer
        return OrganizationSerializer

    @transaction.atomic
    def _purge_organization(self, org: Organization) -> None:
        """Remove all tenant data so the organization row can be deleted."""
        for emp in org.employees.select_related("user").all():
            user = emp.user
            emp.delete()
            if user:
                user.delete()
        User.objects.filter(organization=org).delete()
        EmployeePayrollProfile.objects.filter(organization=org).delete()
        org.delete()

    def destroy(self, request, *args, **kwargs):
        org = self.get_object()
        force = str(request.query_params.get("force", "")).lower() in ("1", "true", "yes")
        confirm_name = (request.data.get("confirm_name") or "").strip()
        employee_count = org.employees.count()

        if employee_count and not force:
            raise ValidationError(
                {
                    "error": (
                        f"Cannot delete: organization has {employee_count} employee(s). "
                        "Deactivate instead, or delete permanently with force=true and confirm_name."
                    ),
                    "employee_count": employee_count,
                }
            )

        if force and confirm_name != org.name:
            raise ValidationError(
                {"confirm_name": "Type the exact organization name to confirm permanent deletion."}
            )

        try:
            if force and employee_count:
                self._purge_organization(org)
            else:
                org.delete()
        except ProtectedError as exc:
            raise ValidationError(
                {
                    "error": "Organization still has protected linked records.",
                    "detail": str(exc),
                }
            ) from exc

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], url_path="create-admin")
    def create_admin(self, request, pk=None):
        org = self.get_object()
        ser = PlatformCreateOrgAdminSerializer(
            data=request.data,
            context={"request": request, "organization": org},
        )
        ser.is_valid(raise_exception=True)
        result = ser.save()
        status_code = status.HTTP_201_CREATED if result.get("invite_sent") else status.HTTP_202_ACCEPTED
        return Response(result, status=status_code)

    @action(detail=True, methods=["post"], url_path="resend-admin-invite")
    def resend_admin_invite(self, request, pk=None):
        org = self.get_object()
        ser = PlatformResendAdminInviteSerializer(
            data=request.data,
            context={"organization": org},
        )
        ser.is_valid(raise_exception=True)
        user = ser.validated_data["user"]
        user.onboarding_pending = True
        user.is_active = False
        user.save(update_fields=["onboarding_pending", "is_active"])
        _invite, invite_url, ok, detail = issue_and_send_invite(
            user,
            created_by=request.user,
            frontend_origin=request.headers.get("Origin"),
            invite_kind="org_admin",
            organization_name=org.name,
        )
        payload = {
            "message": "Admin invite resent." if ok else "Invite created but email failed to send.",
            "email": user.email,
            "invite_sent": ok,
            "detail": detail,
        }
        if settings.DEBUG:
            payload["invite_url"] = invite_url
        return Response(payload, status=status.HTTP_200_OK if ok else status.HTTP_202_ACCEPTED)

    @action(detail=True, methods=["post"], url_path="set-active")
    def set_active(self, request, pk=None):
        org = self.get_object()
        active = request.data.get("is_active", True)
        org.is_active = bool(active)
        org.save(update_fields=["is_active"])
        return Response(PlatformOrganizationSerializer(org).data)
