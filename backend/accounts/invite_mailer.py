import json
from urllib import error, request

from django.conf import settings


def send_invite_email(*, to_email: str, full_name: str, invite_url: str) -> tuple[bool, str]:
    api_key = settings.RESEND_API_KEY
    from_email = settings.RESEND_FROM_EMAIL
    if not api_key or not from_email:
        return False, "Resend is not configured."

    subject = "Set your HR Core account password"
    html = f"""
    <div style="font-family: Inter, Arial, sans-serif; line-height: 1.6; color: #0f172a;">
      <h2 style="margin-bottom: 12px;">Welcome to HR Core</h2>
      <p>Hi {full_name or "there"},</p>
      <p>Your account has been created by HR/Admin. Click the button below to set your password and activate your account.</p>
      <p style="margin: 24px 0;">
        <a href="{invite_url}" style="background:#7c3aed;color:white;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:600;">Set password</a>
      </p>
      <p>If the button does not work, use this link:</p>
      <p><a href="{invite_url}">{invite_url}</a></p>
      <p>This link expires in 24 hours.</p>
    </div>
    """
    payload = {
        "from": from_email,
        "to": [to_email],
        "subject": subject,
        "html": html,
    }

    req = request.Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "HRCore/1.0 (+https://hrms.staffdox.co.in)",
        },
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=20) as resp:
            if 200 <= resp.status < 300:
                return True, "Invite email sent."
            return False, f"Resend returned status {resp.status}."
    except error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="ignore")
        return False, f"Resend HTTP {exc.code}: {body[:300]}"
    except Exception as exc:
        return False, f"Resend error: {exc}"


def send_html_email(*, to_email: str, subject: str, html: str) -> tuple[bool, str]:
    api_key = settings.RESEND_API_KEY
    from_email = settings.RESEND_FROM_EMAIL
    if not api_key or not from_email:
        return False, "Resend is not configured."

    payload = {
        "from": from_email,
        "to": [to_email],
        "subject": subject,
        "html": html,
    }
    req = request.Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "HRCore/1.0 (+https://hrms.staffdox.co.in)",
        },
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=20) as resp:
            if 200 <= resp.status < 300:
                return True, "Email sent."
            return False, f"Resend returned status {resp.status}."
    except error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="ignore")
        return False, f"Resend HTTP {exc.code}: {body[:300]}"
    except Exception as exc:
        return False, f"Resend error: {exc}"
