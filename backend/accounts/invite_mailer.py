import json
from urllib import error, request

from django.conf import settings


def _invite_email_html(*, full_name: str, invite_url: str, headline: str, body_html: str) -> str:
    return f"""
    <div style="font-family: Inter, Arial, sans-serif; line-height: 1.6; color: #0f172a;">
      <h2 style="margin-bottom: 12px;">{headline}</h2>
      <p>Hi {full_name or "there"},</p>
      {body_html}
      <p style="margin: 24px 0;">
        <a href="{invite_url}" style="background:#7c3aed;color:white;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:600;">Create your account</a>
      </p>
      <p>If the button does not work, use this link:</p>
      <p><a href="{invite_url}">{invite_url}</a></p>
      <p>This link expires in 24 hours.</p>
    </div>
    """


def send_invite_email(
    *,
    to_email: str,
    full_name: str,
    invite_url: str,
    invite_kind: str = "employee",
    organization_name: str | None = None,
) -> tuple[bool, str]:
    api_key = settings.RESEND_API_KEY
    from_email = settings.RESEND_FROM_EMAIL
    if not api_key or not from_email:
        return False, "Resend is not configured."

    if invite_kind == "org_admin":
        org_label = organization_name or "your company"
        subject = f"Set up your {org_label} admin account on HR Core"
        body = (
            f"<p>Your company <strong>{org_label}</strong> has been added to HR Core. "
            "Use the button below to create your Organization Admin password and sign in to your company dashboard.</p>"
            "<p>After activation you can onboard employees, run payroll, manage attendance, and more.</p>"
        )
        headline = "Welcome — set up your company admin"
    else:
        subject = "Set your HR Core account password"
        body = (
            "<p>Your account has been created by HR/Admin. "
            "Click the button below to set your password and activate your account.</p>"
        )
        headline = "Welcome to HR Core"

    html = _invite_email_html(
        full_name=full_name,
        invite_url=invite_url,
        headline=headline,
        body_html=body,
    )
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


def send_html_email_batch(*, payloads: list[dict]) -> tuple[int, int]:
    """
    Sends multiple emails in a single request using Resend's batch endpoint.
    payloads: [{'to': '...', 'subject': '...', 'html': '...'}, ...]
    Returns (emails_sent, emails_failed).
    """
    api_key = settings.RESEND_API_KEY
    from_email = settings.RESEND_FROM_EMAIL
    if not api_key or not from_email:
        return 0, len(payloads)

    sent = 0
    failed = 0
    
    # Resend batch limit is 100 per request
    for i in range(0, len(payloads), 100):
        batch = payloads[i:i+100]
        batch_data = []
        for p in batch:
            batch_data.append({
                "from": from_email,
                "to": [p["to"]],
                "subject": p["subject"],
                "html": p["html"]
            })
            
        req = request.Request(
            "https://api.resend.com/emails/batch",
            data=json.dumps(batch_data).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with request.urlopen(req, timeout=30) as resp:
                if 200 <= resp.status < 300:
                    sent += len(batch)
                else:
                    failed += len(batch)
        except Exception as exc:
            logger.warning("Resend batch email failed: %s", exc)
            failed += len(batch)
            
    return sent, failed
