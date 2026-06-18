from django.conf import settings
from django.db import models

from employees.models import Employee

SYSTEM_LEAVE_RULE_CODES = frozenset({
    "paid_leave",
    "loss_of_pay",
    "casual_leave",
    "work_from_home",
    "sick_leave",
    "maternity_leave",
    "paternity_leave",
    "on_duty_leave",
    "event_leave",
    "comp_off",
})


class AccrualFrequency(models.TextChoices):
    MONTHLY = "monthly", "Monthly"
    HALFYEARLY = "halfyearly", "Half Yearly"
    YEARLY = "yearly", "Yearly"


class AccrualPeriod(models.TextChoices):
    START = "start", "Start"
    END = "end", "End"


class LeaveStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"


class LeaveType(models.TextChoices):
    PAID = "paid_leave", "Paid Leave"
    LOP = "loss_of_pay", "Loss Of Pay"
    CASUAL = "casual_leave", "Casual Leave"
    WFH = "work_from_home", "Work From Home"
    SICK = "sick_leave", "Sick Leave"
    MATERNITY = "maternity_leave", "Maternity Leave"
    PATERNITY = "paternity_leave", "Paternity Leave"
    ON_DUTY = "on_duty_leave", "On Duty Leave"
    EVENT = "event_leave", "Event Leave"
    COMP_OFF = "comp_off", "Comp Off"


class LeaveRequest(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="leave_requests")
    leave_type = models.CharField(max_length=32, default=LeaveType.PAID)
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=LeaveStatus.choices,
        default=LeaveStatus.PENDING,
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="leave_reviews",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_note = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.employee.employee_code} {self.start_date}–{self.end_date} ({self.status})"


class LeavePolicy(models.Model):
    organization = models.ForeignKey(
        "employees.Organization",
        on_delete=models.CASCADE,
        related_name="leave_policies",
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=120)
    description = models.CharField(max_length=300, blank=True)
    annual_quota = models.PositiveSmallIntegerField(default=12)
    sick_quota = models.PositiveSmallIntegerField(default=8)
    casual_quota = models.PositiveSmallIntegerField(default=6)
    other_quota = models.PositiveSmallIntegerField(default=0)
    probation_annual_quota = models.PositiveSmallIntegerField(default=0)
    probation_sick_quota = models.PositiveSmallIntegerField(default=4)
    probation_casual_quota = models.PositiveSmallIntegerField(default=2)
    probation_other_quota = models.PositiveSmallIntegerField(default=0)
    allow_unpaid = models.BooleanField(default=True)
    allow_leave_under_probation = models.BooleanField(
        default=True,
        help_text="When off, employees marked on probation cannot apply leave under this rule.",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "name"],
                name="uniq_leave_policy_name_per_org",
            ),
        ]

    def __str__(self):
        return self.name


class LeavePolicyAssignment(models.Model):
    employee = models.OneToOneField(Employee, on_delete=models.CASCADE, related_name="leave_policy_assignment")
    policy = models.ForeignKey(LeavePolicy, on_delete=models.PROTECT, related_name="assignments")
    is_on_probation = models.BooleanField(default=False)
    effective_from = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["employee__employee_code"]

    def __str__(self):
        return f"{self.employee.employee_code} -> {self.policy.name}"


class LeaveTypeRule(models.Model):
    organization = models.ForeignKey(
        "employees.Organization",
        on_delete=models.CASCADE,
        related_name="leave_type_rules",
    )
    code = models.SlugField(max_length=40)
    is_system = models.BooleanField(default=False)
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    short_name = models.CharField(max_length=12, blank=True)
    annual_quota = models.DecimalField(max_digits=6, decimal_places=1, null=True, blank=True)
    count_weekends = models.BooleanField(default=False)
    count_holidays = models.BooleanField(default=False)
    accrual_basis = models.BooleanField(default=True)
    present_day_basis = models.BooleanField(default=False)
    accrual_frequency = models.CharField(
        max_length=12,
        choices=AccrualFrequency.choices,
        default=AccrualFrequency.MONTHLY,
    )
    accrual_period = models.CharField(
        max_length=10,
        choices=AccrualPeriod.choices,
        default=AccrualPeriod.START,
    )
    allowed_under_probation = models.BooleanField(default=False)
    allowed_under_notice = models.BooleanField(default=False)
    probation_quota = models.DecimalField(max_digits=6, decimal_places=1, null=True, blank=True)
    encash_enabled = models.BooleanField(default=False)
    carry_forward_enabled = models.BooleanField(default=False)
    max_per_month = models.DecimalField(max_digits=6, decimal_places=1, null=True, blank=True)
    continuous_allowed = models.PositiveSmallIntegerField(null=True, blank=True)
    negative_allowed = models.BooleanField(default=False)
    future_dated_allowed = models.BooleanField(default=True)
    future_dated_after_days = models.PositiveSmallIntegerField(default=0)
    backdated_allowed = models.BooleanField(default=True)
    backdated_up_to_days = models.PositiveSmallIntegerField(default=90)
    apply_next_year_until_month = models.PositiveSmallIntegerField(default=2)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "code"],
                name="uniq_leave_type_rule_code_per_org",
            ),
        ]

    def __str__(self):
        return self.name


class LeaveTypeRuleAssignment(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="leave_rule_assignments")
    rule = models.ForeignKey(LeaveTypeRule, on_delete=models.CASCADE, related_name="assignments")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["employee", "rule"],
                name="uniq_employee_leave_rule",
            ),
        ]

    def __str__(self):
        return f"{self.employee.employee_code} -> {self.rule.name}"


class EmployeeLeaveProfile(models.Model):
    employee = models.OneToOneField(Employee, on_delete=models.CASCADE, related_name="leave_profile")
    is_on_probation = models.BooleanField(default=False)
    effective_from = models.DateField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.employee.employee_code} probation={self.is_on_probation}"
