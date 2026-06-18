from django.conf import settings

from .async_tasks import send_password_reset_email_async
from .invite_service import frontend_url_for_email
from .models import PasswordResetToken


def user_can_reset_password(user) -> bool:
    if not user or not user.is_active:
        return False
    if user.onboarding_pending:
        return False
    if not user.has_usable_password():
        return False
    return True


def issue_and_send_password_reset(user):
    reset = PasswordResetToken.create_for_user(user, lifetime_hours=1)
    reset_url = f"{frontend_url_for_email()}/reset-password?token={reset.token}"
    full_name = f"{user.first_name} {user.last_name}".strip()

    if not settings.RESEND_API_KEY or not settings.RESEND_FROM_EMAIL:
        return reset, reset_url, False, "Resend is not configured (set RESEND_API_KEY and RESEND_FROM_EMAIL)."

    send_password_reset_email_async(
        to_email=user.email,
        full_name=full_name,
        reset_url=reset_url,
    )
    return reset, reset_url, True, "Password reset email queued for delivery."
