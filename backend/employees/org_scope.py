"""Organization scoping helpers for SaaS multi-tenant queries."""

from __future__ import annotations

from typing import TYPE_CHECKING

from django.db.models import Q

from accounts.models import UserRole

if TYPE_CHECKING:
    from django.contrib.auth.models import AbstractBaseUser
    from django.db.models import QuerySet
    from django.http import HttpRequest


def user_organization_id(user: AbstractBaseUser) -> int | None:
    """Tenant bound to the user account or their employee profile."""
    oid = getattr(user, "organization_id", None)
    if oid:
        return int(oid)
    profile = getattr(user, "employee_profile", None)
    return profile.organization_id if profile else None


def is_platform_admin(user: AbstractBaseUser) -> bool:
    """Django superuser — platform operator (HRMS owner dashboard)."""
    return bool(getattr(user, "is_superuser", False))


def is_company_user(user: AbstractBaseUser) -> bool:
    """Authenticated user scoped to a single organization workspace."""
    return bool(user.is_authenticated and user_organization_id(user) and not is_platform_admin(user))


def can_create_tenant(user: AbstractBaseUser) -> bool:
    """Who may register a new company — platform operator only."""
    return is_platform_admin(user)


def organization_id_for_company_api(request: HttpRequest) -> int | None:
    """
    Resolve tenant for company-scoped APIs (employees, payroll, attendance, etc.).

    - Company Admin/HR/Manager/Employee: always their bound organization.
    - Platform superuser without ?organization=: None → callers must return empty querysets
      (use /api/platform/* for cross-tenant operations).
    - Platform superuser with ?organization=<id>: act in that tenant (support/debug).
    """
    user = request.user
    if not user.is_authenticated:
        return None

    bound = user_organization_id(user)

    if is_platform_admin(user):
        oid = request.query_params.get("organization")
        if oid:
            try:
                return int(oid)
            except (TypeError, ValueError):
                pass
        return bound

    if user.role in (UserRole.ADMIN, UserRole.HR, UserRole.MANAGER):
        return bound

    profile = getattr(user, "employee_profile", None)
    return profile.organization_id if profile else None


def organization_id_from_request(request: HttpRequest) -> int | None:
    """Alias for company API scoping (backward compatible)."""
    return organization_id_for_company_api(request)


def filter_employees_by_org(qs: QuerySet, org_id: int | None) -> QuerySet:
    if org_id:
        return qs.filter(organization_id=org_id)
    return qs.none()


def filter_by_employee_org(qs: QuerySet, org_id: int | None, employee_prefix: str = "employee") -> QuerySet:
    if org_id:
        return qs.filter(**{f"{employee_prefix}__organization_id": org_id})
    return qs.none()


def filter_by_organization(qs: QuerySet, org_id: int | None, field: str = "organization_id") -> QuerySet:
    if org_id:
        return qs.filter(**{field: org_id})
    return qs.none()


def filter_users_by_org(qs: QuerySet, org_id: int | None) -> QuerySet:
    if not org_id:
        return qs.none()
    return qs.filter(Q(organization_id=org_id) | Q(employee_profile__organization_id=org_id))
