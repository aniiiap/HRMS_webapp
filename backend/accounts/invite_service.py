from django.conf import settings
from urllib.parse import urlparse

from .async_tasks import send_invite_email_async
from .models import InviteToken


def frontend_url_for_email() -> str:
    """Links in emails always use FRONTEND_URL (set per environment in .env)."""
    return settings.FRONTEND_URL.rstrip("/")


def _resolve_frontend_url(origin: str | None = None) -> str:
    """
    Prefer explicit request origin for in-app/debug responses, fallback to FRONTEND_URL.
    """
    if origin:
        parsed = urlparse(origin.strip())
        if parsed.scheme in ("http", "https") and parsed.netloc:
            return f"{parsed.scheme}://{parsed.netloc}"
    return frontend_url_for_email()


def issue_and_send_invite(
    user,
    *,
    created_by=None,
    frontend_origin: str | None = None,
    invite_kind: str = "employee",
    organization_name: str | None = None,
):
    invite = InviteToken.create_for_user(user, created_by=created_by, lifetime_hours=24)
    base_url = _resolve_frontend_url(frontend_origin)
    invite_url = f"{base_url}/activate-account?token={invite.token}"
    full_name = f"{user.first_name} {user.last_name}".strip()

    if not settings.RESEND_API_KEY or not settings.RESEND_FROM_EMAIL:
        return invite, invite_url, False, "Resend is not configured (set RESEND_API_KEY and RESEND_FROM_EMAIL)."

    send_invite_email_async(
        to_email=user.email,
        full_name=full_name,
        invite_url=invite_url,
        invite_kind=invite_kind,
        organization_name=organization_name,
    )
    return invite, invite_url, True, "Invite queued for delivery."
