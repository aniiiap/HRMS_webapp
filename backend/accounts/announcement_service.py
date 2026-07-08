"""Deliver company announcements to in-app notifications, email, and optional SMS."""

from __future__ import annotations

import logging
import re

from django.conf import settings
from django.db.models import Exists, OuterRef, Q
from django.utils import timezone

from employees.models import Employee
from employees.org_scope import user_organization_id

from .announcement_mailer import send_announcement_email
from .models import AnnouncementDismissal, AppNotification, CompanyAnnouncement, User

logger = logging.getLogger(__name__)

PRIORITY_RANK = {
    CompanyAnnouncement.Priority.CRITICAL: 0,
    CompanyAnnouncement.Priority.IMPORTANT: 1,
    CompanyAnnouncement.Priority.NORMAL: 2,
}


def announcement_org_id(announcement: CompanyAnnouncement) -> int | None:
    if announcement.organization_id:
        return int(announcement.organization_id)
    if announcement.created_by_id:
        return user_organization_id(announcement.created_by)
    return None


def _today():
    return timezone.localdate()


def effective_publish_on(announcement: CompanyAnnouncement):
    return announcement.publish_on or _today()


def is_visible_to_employees(announcement: CompanyAnnouncement) -> bool:
    if not announcement.is_active:
        return False
    return effective_publish_on(announcement) <= _today()


def _visible_announcement_qs():
    today = _today()
    return CompanyAnnouncement.objects.filter(is_active=True).filter(
        Q(publish_on__isnull=True) | Q(publish_on__lte=today)
    )


def _org_employees(org_id: int):
    return Employee.objects.filter(
        organization_id=org_id,
        user__is_active=True,
        user__onboarding_pending=False,
    ).select_related("user")


def announcement_matches_user(announcement: CompanyAnnouncement, user: User) -> bool:
    if not is_visible_to_employees(announcement):
        return False
    if announcement.created_by_id == user.id:
        return False

    org_id = announcement_org_id(announcement)
    user_org = user_organization_id(user)
    if not org_id or not user_org or int(org_id) != int(user_org):
        return False

    if announcement.target_audience == CompanyAnnouncement.TargetAudience.ALL:
        return True

    employee = getattr(user, "employee_profile", None)

    if announcement.target_audience == CompanyAnnouncement.TargetAudience.DEPARTMENT:
        if not employee or not employee.department:
            return False
        return employee.department.strip().lower() == (announcement.target_value or "").strip().lower()

    if announcement.target_audience == CompanyAnnouncement.TargetAudience.ROLE:
        return user.role == announcement.target_value

    if announcement.target_audience == CompanyAnnouncement.TargetAudience.EMPLOYEES:
        if not employee:
            return False
        return any(e.pk == employee.pk for e in announcement.target_employees.all())

    return False


def recipients_for_announcement(announcement: CompanyAnnouncement) -> list[User]:
    org_id = announcement_org_id(announcement)
    if not org_id:
        logger.warning("announcement %s has no organization — cannot deliver", announcement.pk)
        return []

    employees = _org_employees(org_id)
    if announcement.created_by_id:
        employees = employees.exclude(user_id=announcement.created_by_id)

    if announcement.target_audience == CompanyAnnouncement.TargetAudience.ALL:
        return [e.user for e in employees if e.user_id]

    if announcement.target_audience == CompanyAnnouncement.TargetAudience.DEPARTMENT:
        dept = (announcement.target_value or "").strip()
        return [e.user for e in employees.filter(department__iexact=dept) if e.user_id]

    if announcement.target_audience == CompanyAnnouncement.TargetAudience.ROLE:
        return [e.user for e in employees.filter(user__role=announcement.target_value) if e.user_id]

    if announcement.target_audience == CompanyAnnouncement.TargetAudience.EMPLOYEES:
        target_ids = set(announcement.target_employees.values_list("pk", flat=True))
        return [e.user for e in employees.filter(pk__in=target_ids) if e.user_id]

    return []


def _normalize_phone(phone: str) -> str | None:
    digits = re.sub(r"\D", "", phone or "")
    if len(digits) < 10:
        return None
    if len(digits) == 10:
        return f"+91{digits}"
    if digits.startswith("91") and len(digits) == 12:
        return f"+{digits}"
    if phone.strip().startswith("+"):
        return phone.strip()
    return f"+{digits}"


def _send_sms_if_configured(*, phone: str, body: str) -> tuple[bool, str]:
    account_sid = getattr(settings, "TWILIO_ACCOUNT_SID", "") or ""
    auth_token = getattr(settings, "TWILIO_AUTH_TOKEN", "") or ""
    from_number = getattr(settings, "TWILIO_FROM_NUMBER", "") or ""
    if not all([account_sid, auth_token, from_number]):
        return False, "SMS provider not configured."

    to_number = _normalize_phone(phone)
    if not to_number:
        return False, "Invalid phone number."

    try:
        from urllib import parse, request
        import base64

        url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
        data = parse.urlencode({"To": to_number, "From": from_number, "Body": body[:320]}).encode()
        req = request.Request(url, data=data, method="POST")
        creds = base64.b64encode(f"{account_sid}:{auth_token}".encode()).decode()
        req.add_header("Authorization", f"Basic {creds}")
        with request.urlopen(req, timeout=20) as resp:
            if 200 <= resp.status < 300:
                return True, "SMS sent."
            return False, f"Twilio status {resp.status}"
    except Exception as exc:
        logger.warning("announcement sms failed: %s", exc)
        return False, str(exc)


def _ensure_announcement_org(announcement: CompanyAnnouncement) -> int | None:
    if announcement.organization_id:
        return int(announcement.organization_id)
    org_id = announcement_org_id(announcement)
    if org_id:
        CompanyAnnouncement.objects.filter(pk=announcement.pk, organization_id__isnull=True).update(
            organization_id=org_id
        )
        announcement.organization_id = org_id
    return org_id


def dispatch_announcement(announcement: CompanyAnnouncement) -> dict:
    _ensure_announcement_org(announcement)
    recipients = recipients_for_announcement(announcement)
    if not recipients:
        return {"notifications": 0, "emails_sent": 0, "emails_failed": 0, "sms_sent": 0, "sms_failed": 0}

    preview = (announcement.message or "")[:500]
    AppNotification.objects.bulk_create(
        [
            AppNotification(
                user=u,
                title=announcement.title,
                message=preview,
                type="announcement",
            )
            for u in recipients
        ]
    )

    emails_sent = 0
    emails_failed = 0
    sms_sent = 0
    sms_failed = 0

    org_name = announcement.organization.name if announcement.organization_id else "HR Core"
    
    from accounts.announcement_mailer import build_announcement_email_html
    from accounts.invite_mailer import send_html_email_batch
    
    html = build_announcement_email_html(
        title=announcement.title,
        message=announcement.message,
        organization_name=org_name,
        priority=announcement.priority,
    )
    subject = f"[{org_name}] {announcement.title}"
    email_payloads = []
    
    for user in recipients:
        if announcement.send_email and user.email:
            email_payloads.append({
                "to": user.email,
                "subject": subject,
                "html": html,
            })
            
    if email_payloads:
        sent, failed = send_html_email_batch(payloads=email_payloads)
        emails_sent += sent
        emails_failed += failed
        if failed > 0:
            logger.warning("Failed to send %d announcement emails via batch.", failed)
            
    for user in recipients:

        if announcement.send_sms:
            employee: Employee | None = getattr(user, "employee_profile", None)
            phone = (employee.phone if employee else "") or ""
            if phone:
                sms_body = f"{org_name}: {announcement.title}. {(announcement.message or '')[:200]}"
                ok, detail = _send_sms_if_configured(phone=phone, body=sms_body)
                if ok:
                    sms_sent += 1
                else:
                    sms_failed += 1

    logger.info(
        "announcement %s delivered to %s users (org=%s)",
        announcement.pk,
        len(recipients),
        announcement_org_id(announcement),
    )
    return {
        "notifications": len(recipients),
        "emails_sent": emails_sent,
        "emails_failed": emails_failed,
        "sms_sent": sms_sent,
        "sms_failed": sms_failed,
    }


def mark_notified(announcement: CompanyAnnouncement) -> None:
    now = timezone.now()
    CompanyAnnouncement.objects.filter(pk=announcement.pk).update(notified_at=now)
    announcement.notified_at = now


def dispatch_if_due(announcement: CompanyAnnouncement) -> dict:
    if not is_visible_to_employees(announcement):
        return {}
    if announcement.notified_at:
        return {}
    stats = dispatch_announcement(announcement)
    mark_notified(announcement)
    return stats


def release_due_announcements(*, org_id: int | None = None) -> int:
    """Send notifications for scheduled announcements whose publish date has arrived."""
    today = _today()
    qs = CompanyAnnouncement.objects.filter(
        is_active=True,
        notified_at__isnull=True,
    ).filter(Q(publish_on__isnull=True) | Q(publish_on__lte=today))
    if org_id:
        qs = qs.filter(
            Q(organization_id=org_id)
            | Q(organization_id__isnull=True, created_by__organization_id=org_id)
            | Q(organization_id__isnull=True, created_by__employee_profile__organization_id=org_id)
        )
    count = 0
    for announcement in qs.iterator():
        if dispatch_if_due(announcement):
            count += 1
    return count


def pending_popup_for_user(user: User) -> CompanyAnnouncement | None:
    org_id = user_organization_id(user)
    if not org_id:
        return None

    release_due_announcements(org_id=org_id)

    still_dismissed = AnnouncementDismissal.objects.filter(
        user=user,
        announcement_id=OuterRef("pk"),
        dismissed_at__gte=OuterRef("updated_at"),
    )
    qs = (
        _visible_announcement_qs()
        .filter(Q(organization_id=org_id) | Q(organization_id__isnull=True))
        .exclude(Exists(still_dismissed))
        .exclude(created_by=user)
        .prefetch_related("target_employees", "created_by")
        .order_by("-published_at")
    )

    candidates: list[CompanyAnnouncement] = []
    for announcement in qs[:50]:
        if announcement_matches_user(announcement, user):
            candidates.append(announcement)

    if not candidates:
        return None

    candidates.sort(
        key=lambda a: (
            PRIORITY_RANK.get(a.priority, 9),
            -a.published_at.timestamp(),
        )
    )
    return candidates[0]
