from django.conf import settings
from django.db import models


class OrganizationPlan(models.TextChoices):
    TRIAL = "trial", "Trial"
    STARTER = "starter", "Starter"
    GROWTH = "growth", "Growth"
    ENTERPRISE = "enterprise", "Enterprise"


class Organization(models.Model):
    """Tenant / company boundary for SaaS (payroll, HR workspace)."""

    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=80, unique=True)
    legal_name = models.CharField(max_length=255, blank=True)
    contact_email = models.EmailField(blank=True)
    is_active = models.BooleanField(default=True)
    plan = models.CharField(
        max_length=20,
        choices=OrganizationPlan.choices,
        default=OrganizationPlan.TRIAL,
    )
    max_employees = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Optional cap for subscription enforcement (future).",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Employee(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="employee_profile",
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.PROTECT,
        related_name="employees",
        null=True,
        blank=True,
    )
    employee_code = models.CharField(max_length=32)
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
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "employee_code"],
                name="uniq_employee_code_per_org",
            ),
        ]

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


class AttendanceDevice(models.TextChoices):
    MOBILE = "mobile", "Mobile"
    WEB = "web", "Web"
    BOTH = "both", "Both"


class ShiftTemplate(models.Model):
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="shift_templates",
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=80)
    description = models.TextField(blank=True)
    is_company_default = models.BooleanField(
        default=False,
        help_text="Default rule applied to new employees in this organization.",
    )
    start_time = models.TimeField()
    end_time = models.TimeField()
    grace_minutes = models.PositiveSmallIntegerField(default=0)
    early_checkout_grace_minutes = models.PositiveSmallIntegerField(default=10)
    is_night_shift = models.BooleanField(default=False)
    saturday_working = models.BooleanField(
        default=False,
        help_text="If true, Saturday is a working day (6-day week). If false, Saturday is weekly off.",
    )
    sunday_working = models.BooleanField(
        default=False,
        help_text="If true, Sunday is a working day. Typical 5-day week has this false.",
    )
    enable_auto_deduction = models.BooleanField(default=False)
    manual_deduction_day = models.PositiveSmallIntegerField(
        default=31,
        help_text="Day of month (1–31) for manual attendance deduction runs.",
    )
    enable_anomaly_tracking = models.BooleanField(default=True)
    track_in_time = models.BooleanField(default=True)
    track_out_time = models.BooleanField(default=True)
    track_work_duration = models.BooleanField(default=True)
    full_day_minutes = models.PositiveSmallIntegerField(
        default=480,
        help_text="Minimum worked minutes for a full day when work-duration tracking is on.",
    )
    half_day_minutes = models.PositiveSmallIntegerField(
        default=240,
        help_text="Minimum worked minutes for a half day when work-duration tracking is on.",
    )
    track_max_break_duration = models.BooleanField(default=False)
    max_break_duration_minutes = models.PositiveSmallIntegerField(default=60)
    track_max_break_count = models.BooleanField(default=False)
    max_break_count = models.PositiveSmallIntegerField(default=2)
    enable_auto_clock_out = models.BooleanField(default=False)
    auto_clock_out_after_minutes = models.PositiveSmallIntegerField(
        default=0,
        help_text="Minutes after scheduled shift end to auto clock-out (div=0 means at shift end).",
    )
    attendance_device = models.CharField(
        max_length=10,
        choices=AttendanceDevice.choices,
        default=AttendanceDevice.BOTH,
    )
    enable_overtime = models.BooleanField(default=False)
    enable_24_hour_shift = models.BooleanField(
        default=False,
        help_text="Allow attendance punches across a full 24-hour window.",
    )
    enable_ip_restriction = models.BooleanField(default=False)
    allowed_ip_addresses = models.TextField(
        blank=True,
        help_text="Comma-separated IP addresses allowed for web attendance.",
    )
    enable_geofencing = models.BooleanField(
        default=True,
        help_text="Require employees on this rule to punch within office geofence.",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "name"],
                name="uniq_shift_template_name_per_org",
            ),
        ]

    def __str__(self):
        return self.name


class ShiftTemplateAssignment(models.Model):
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="shift_template_assignments",
    )
    shift_template = models.ForeignKey(
        ShiftTemplate,
        on_delete=models.CASCADE,
        related_name="employee_assignments",
    )
    is_primary = models.BooleanField(
        default=False,
        help_text="Primary rule used for attendance punches and schedule.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-is_primary", "created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["employee", "shift_template"],
                name="uniq_shift_template_per_employee",
            ),
        ]

    def __str__(self):
        return f"{self.employee.employee_code} → {self.shift_template.name}"


class OfficeLocationSettings(models.Model):
    organization = models.OneToOneField(
        Organization,
        on_delete=models.CASCADE,
        related_name="office_location",
        null=True,
        blank=True,
    )
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
