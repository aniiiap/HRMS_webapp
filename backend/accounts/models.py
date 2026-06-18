import secrets
from datetime import timedelta

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils import timezone


class UserRole(models.TextChoices):
    ADMIN = "admin", "Admin"
    HR = "hr", "HR"
    MANAGER = "manager", "Manager"
    EMPLOYEE = "employee", "Employee"


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", UserRole.ADMIN)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")
        return self._create_user(email, password, **extra_fields)


class User(AbstractUser):
    username = None  # type: ignore[assignment]
    email = models.EmailField("email address", unique=True)
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.EMPLOYEE,
    )
    onboarding_pending = models.BooleanField(
        default=False,
        help_text="True until employee completes invite-based password setup.",
    )
    organization = models.ForeignKey(
        "employees.Organization",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users",
        help_text="Company tenant for Admin/HR without an employee profile.",
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []

    objects = UserManager()

    def __str__(self):
        return self.email


class InviteToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="invite_tokens")
    token = models.CharField(max_length=80, unique=True, db_index=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sent_invites",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Invite<{self.user.email}>"

    @classmethod
    def create_for_user(cls, user, *, created_by=None, lifetime_hours=24):
        cls.objects.filter(user=user, used_at__isnull=True).delete()
        token = secrets.token_urlsafe(32)
        return cls.objects.create(
            user=user,
            token=token,
            created_by=created_by,
            expires_at=timezone.now() + timedelta(hours=lifetime_hours),
        )

    @property
    def is_valid(self):
        return self.used_at is None and self.expires_at > timezone.now()


class PasswordResetToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="password_reset_tokens")
    token = models.CharField(max_length=80, unique=True, db_index=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"PasswordReset<{self.user.email}>"

    @classmethod
    def create_for_user(cls, user, *, lifetime_hours=1):
        cls.objects.filter(user=user, used_at__isnull=True).delete()
        token = secrets.token_urlsafe(32)
        return cls.objects.create(
            user=user,
            token=token,
            expires_at=timezone.now() + timedelta(hours=lifetime_hours),
        )

    @property
    def is_valid(self):
        return self.used_at is None and self.expires_at > timezone.now()


class AppNotification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="app_notifications")
    title = models.CharField(max_length=180)
    message = models.CharField(max_length=500, blank=True)
    type = models.CharField(max_length=40, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.email}: {self.title}"


class CompanyAnnouncement(models.Model):
    organization = models.ForeignKey(
        "employees.Organization",
        on_delete=models.CASCADE,
        related_name="announcements",
        null=True,
        blank=True,
    )

    class Priority(models.TextChoices):
        NORMAL = "normal", "Normal"
        IMPORTANT = "important", "Important"
        CRITICAL = "critical", "Critical"

    class TargetAudience(models.TextChoices):
        ALL = "all", "All employees"
        DEPARTMENT = "department", "Department"
        ROLE = "role", "Role"
        EMPLOYEES = "employees", "Selected employees"

    title = models.CharField(max_length=180)
    message = models.TextField(max_length=2000)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="announcements_created",
    )
    is_active = models.BooleanField(default=True)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.NORMAL)
    target_audience = models.CharField(
        max_length=20,
        choices=TargetAudience.choices,
        default=TargetAudience.ALL,
    )
    target_value = models.CharField(
        max_length=120,
        blank=True,
        help_text="Department name for department target, or role key for role target.",
    )
    expires_at = models.DateTimeField(null=True, blank=True)
    publish_on = models.DateField(
        null=True,
        blank=True,
        help_text="Date employees start seeing this announcement. Defaults to today.",
    )
    notified_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When in-app notifications were first sent.",
    )
    send_email = models.BooleanField(
        default=False,
        help_text="Also email recipients (requires Resend configuration).",
    )
    send_sms = models.BooleanField(
        default=False,
        help_text="Also SMS recipients with a phone on file (requires paid SMS provider).",
    )
    target_employees = models.ManyToManyField(
        "employees.Employee",
        blank=True,
        related_name="targeted_announcements",
        help_text="When target_audience is employees, only these employees receive the announcement.",
    )
    published_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-published_at"]

    def __str__(self):
        return self.title


class AnnouncementDismissal(models.Model):
    """Tracks one-time popup dismiss per user per announcement."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="announcement_dismissals")
    announcement = models.ForeignKey(
        CompanyAnnouncement,
        on_delete=models.CASCADE,
        related_name="dismissals",
    )
    dismissed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "announcement"],
                name="uniq_announcement_dismissal_per_user",
            ),
        ]
