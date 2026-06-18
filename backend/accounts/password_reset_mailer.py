from .invite_mailer import send_html_email


def send_password_reset_email(*, to_email: str, full_name: str, reset_url: str) -> tuple[bool, str]:
    headline = "Reset your HR Core password"
    html = f"""
    <div style="font-family: Inter, Arial, sans-serif; line-height: 1.6; color: #0f172a;">
      <h2 style="margin-bottom: 12px;">{headline}</h2>
      <p>Hi {full_name or "there"},</p>
      <p>We received a request to reset the password for your HR Core account.
      Click the button below to choose a new password.</p>
      <p style="margin: 24px 0;">
        <a href="{reset_url}" style="background:#0d9488;color:white;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:600;">Reset password</a>
      </p>
      <p>If the button does not work, use this link:</p>
      <p><a href="{reset_url}">{reset_url}</a></p>
      <p>This link expires in 1 hour. If you did not request a reset, you can ignore this email.</p>
    </div>
    """
    return send_html_email(
        to_email=to_email,
        subject="Reset your HR Core password",
        html=html,
    )
