from django.conf import settings
from urllib.parse import urlparse

from .async_tasks import send_invite_email_async
from .models import InviteToken


def _resolve_frontend_url(origin: str | None = None) -> str:
    """
    Prefer explicit request origin (actual deployed frontend), fallback to FRONTEND_URL.
    """
    if origin:
        parsed = urlparse(origin.strip())
        if parsed.scheme in ("http", "https") and parsed.netloc:
            return f"{parsed.scheme}://{parsed.netloc}"
    return settings.FRONTEND_URL.rstrip("/")


def issue_and_send_invite(user, *, created_by=None, frontend_origin: str | None = None):
    invite = InviteToken.create_for_user(user, created_by=created_by, lifetime_hours=24)
    frontend_url = _resolve_frontend_url(frontend_origin)
    invite_url = f"{frontend_url}/activate-account?token={invite.token}"
    full_name = f"{user.first_name} {user.last_name}".strip()
    send_invite_email_async(to_email=user.email, full_name=full_name, invite_url=invite_url)
    return invite, invite_url, True, "Invite queued for delivery."
