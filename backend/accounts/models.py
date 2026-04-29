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
