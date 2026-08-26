from accounts.models import AppNotification, User, UserRole


def notify_roles(
    *,
    title: str,
    message: str,
    type_value: str,
    roles: tuple[str, ...] = (UserRole.ADMIN, UserRole.HR, UserRole.MANAGER),
    organization_id: int | None = None,
    send_email: bool = False,
    email_html: str | None = None,
    email_attachments: list[dict] | None = None,
) -> None:
    users = list(User.objects.filter(is_active=True, role__in=roles))
    if organization_id:
        from django.db.models import Q
        qs = User.objects.filter(is_active=True, role__in=roles).filter(
            Q(organization_id=organization_id) | Q(employee_profile__organization_id=organization_id)
        )
        users = list(qs)
        
    AppNotification.objects.bulk_create(
        [AppNotification(user=u, title=title, message=message, type=type_value) for u in users]
    )

    if send_email and email_html:
        from accounts.async_tasks import send_html_email_batch_async
        payloads = []
        for u in users:
            if u.email:
                payload = {"to": u.email, "subject": title, "html": email_html}
                if email_attachments:
                    payload["attachments"] = email_attachments
                payloads.append(payload)
        if payloads:
            send_html_email_batch_async(payloads=payloads)


def notify_user(*, user: User, title: str, message: str, type_value: str) -> None:
    AppNotification.objects.create(user=user, title=title, message=message, type=type_value)
