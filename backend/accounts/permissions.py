from rest_framework.permissions import BasePermission, SAFE_METHODS

from .models import UserRole


def _is_privileged(user) -> bool:
    return bool(
        user
        and user.is_authenticated
        and (
            user.is_superuser
            or user.role in (UserRole.ADMIN, UserRole.HR)
        )
    )


def _is_manager_plus(user) -> bool:
    return bool(
        user
        and user.is_authenticated
        and (
            user.is_superuser
            or user.role in (UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
        )
    )


class IsAdminOrHR(BasePermission):
    def has_permission(self, request, view):
        return _is_privileged(request.user)


class IsManagerOrAbove(BasePermission):
    def has_permission(self, request, view):
        return _is_manager_plus(request.user)


class IsAdminOrHROrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return _is_privileged(request.user)


class IsOwnerOrManagerPlus(BasePermission):
    """Object-level: employee user can access own linked records."""

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if _is_manager_plus(user):
            return True
        emp = getattr(user, "employee_profile", None)
        if emp is None:
            return False
        if hasattr(obj, "employee_id"):
            return obj.employee_id == emp.id
        if hasattr(obj, "employee"):
            return obj.employee_id == emp.id
        return False
