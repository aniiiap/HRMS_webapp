from django.conf import settings

from .async_tasks import send_invite_email_async
from .models import InviteToken


def issue_and_send_invite(user, *, created_by=None):
    invite = InviteToken.create_for_user(user, created_by=created_by, lifetime_hours=24)
    invite_url = f"{settings.FRONTEND_URL}/activate-account?token={invite.token}"
    full_name = f"{user.first_name} {user.last_name}".strip()
    send_invite_email_async(to_email=user.email, full_name=full_name, invite_url=invite_url)
    return invite, invite_url, True, "Invite queued for delivery."
