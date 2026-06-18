from rest_framework.permissions import BasePermission

from employees.org_scope import is_platform_admin


class IsPlatformAdmin(BasePermission):
    """Django superuser — HRMS platform owner, not a company user."""

    message = "Platform operator access required."

    def has_permission(self, request, view):
        return is_platform_admin(request.user)
