from .invite_mailer import send_html_email


def send_announcement_email(
    *,
    to_email: str,
    full_name: str,
    title: str,
    message: str,
    organization_name: str,
    priority: str = "normal",
) -> tuple[bool, str]:
    priority_label = priority.replace("_", " ").title()
    html = f"""
    <div style="font-family: Inter, Arial, sans-serif; line-height: 1.6; color: #0f172a; max-width: 560px;">
      <p style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">
        {organization_name} · Announcement · {priority_label}
      </p>
      <h2 style="margin: 8px 0 16px; font-size: 20px;">{title}</h2>
      <p style="white-space: pre-wrap;">{message}</p>
      <p style="margin-top: 24px; font-size: 12px; color: #94a3b8;">
        You received this because your HR team sent a company announcement via HR Core.
      </p>
    </div>
    """
    return send_html_email(
        to_email=to_email,
        subject=f"[{organization_name}] {title}",
        html=html,
    )
