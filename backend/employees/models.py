from django.conf import settings
from django.db import models


class Employee(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="employee_profile",
    )
    employee_code = models.CharField(max_length=32, unique=True)
    department = models.CharField(max_length=120, blank=True)
    designation = models.CharField(max_length=120, blank=True)
    phone = models.CharField(max_length=32, blank=True)
    address = models.TextField(blank=True)
    date_of_joining = models.DateField(null=True, blank=True)
    date_of_birth = models.DateField(
        null=True,
        blank=True,
        help_text="Optional — used for birthday widgets and celebrations.",
    )
    shift_start_time = models.TimeField(
        null=True,
        blank=True,
        help_text="Scheduled shift start time for anomaly checks.",
    )
    shift_end_time = models.TimeField(
        null=True,
        blank=True,
        help_text="Scheduled shift end time for anomaly checks.",
    )
    grace_minutes = models.PositiveSmallIntegerField(
        default=0,
        help_text="Allowed late buffer (minutes) before marking late.",
    )
    early_checkout_grace_minutes = models.PositiveSmallIntegerField(
        default=10,
        help_text="Allowed early checkout buffer (minutes) before marking anomaly.",
    )
    shift_template = models.ForeignKey(
        "ShiftTemplate",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="employees",
    )
    location_restriction_enabled = models.BooleanField(
        default=True,
        help_text="If true, check-in/check-out allowed only near office location.",
    )
    office_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    office_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    location_radius_meters = models.PositiveIntegerField(
        default=200,
        help_text="Allowed radius around office location for attendance actions.",
    )
    manager = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="direct_reports",
    )
    profile_image = models.ImageField(upload_to="profiles/", blank=True, null=True)

    class Meta:
        ordering = ["employee_code"]

    def __str__(self):
        return f"{self.employee_code} — {self.user.get_full_name() or self.user.email}"


class EmployeeDocument(models.Model):
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="documents",
    )
    title = models.CharField(max_length=200)
    file = models.FileField(upload_to="employee_docs/")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-uploaded_at"]

    def __str__(self):
        return self.title


class ShiftTemplate(models.Model):
    name = models.CharField(max_length=80, unique=True)
    start_time = models.TimeField()
    end_time = models.TimeField()
    grace_minutes = models.PositiveSmallIntegerField(default=0)
    early_checkout_grace_minutes = models.PositiveSmallIntegerField(default=10)
    is_night_shift = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class OfficeLocationSettings(models.Model):
    name = models.CharField(max_length=120, blank=True, default="Main Office")
    address = models.CharField(max_length=255, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    radius_meters = models.PositiveIntegerField(default=200)
    geofencing_enabled = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Office location settings"
        verbose_name_plural = "Office location settings"

    def __str__(self):
        return self.name or "Office location"
