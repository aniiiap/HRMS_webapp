from rest_framework import permissions, viewsets

from accounts.models import UserRole
from accounts.permissions import IsAdminOrHR, IsManagerOrAbove

from .models import PayrollRecord
from .serializers import PayrollRecordSerializer


class PayrollRecordViewSet(viewsets.ModelViewSet):
    queryset = PayrollRecord.objects.select_related("employee", "employee__user").all()
    serializer_class = PayrollRecordSerializer
    filterset_fields = ["employee", "period_year", "period_month"]
    ordering_fields = ["period_year", "period_month", "net_salary"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return qs.none()
        if user.is_superuser or user.role in (
            UserRole.ADMIN,
            UserRole.HR,
            UserRole.MANAGER,
        ):
            return qs
        profile = getattr(user, "employee_profile", None)
        if profile:
            return qs.filter(employee=profile)
        return qs.none()

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [permissions.IsAuthenticated(), IsAdminOrHR()]
        return [permissions.IsAuthenticated(), IsManagerOrAbove()]
