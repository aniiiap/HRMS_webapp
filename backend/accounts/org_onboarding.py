"""Create organization admin users and send activation invites."""

from django.contrib.auth import get_user_model

from accounts.models import UserRole

from .invite_service import issue_and_send_invite

User = get_user_model()


def create_organization_admin(
    *,
    organization,
    email: str,
    first_name: str = "",
    last_name: str = "",
    send_invite: bool = True,
    created_by=None,
    frontend_origin: str | None = None,
) -> dict:
    """
    Create an inactive org admin bound to `organization` and optionally email an invite link.
    Returns { user_id, email, organization_id, invite_sent, invite_url, detail }.
    """
    email = email.lower().strip()
    if User.objects.filter(email__iexact=email).exists():
        raise ValueError("A user with this email already exists.")

    user = User.objects.create_user(
        email=email,
        password=None,
        first_name=first_name or "",
        last_name=last_name or "",
        role=UserRole.ADMIN,
        organization=organization,
        is_active=False,
        onboarding_pending=True,
    )
    user.set_unusable_password()
    user.save(update_fields=["password"])

    invite_sent = False
    invite_url = None
    detail = "Admin created without invite."
    if send_invite:
        _invite, invite_url, invite_sent, detail = issue_and_send_invite(
            user,
            created_by=created_by,
            frontend_origin=frontend_origin,
            invite_kind="org_admin",
            organization_name=organization.name,
        )

    return {
        "user_id": user.id,
        "email": user.email,
        "organization_id": organization.id,
        "invite_sent": invite_sent,
        "invite_url": invite_url,
        "detail": detail,
    }
