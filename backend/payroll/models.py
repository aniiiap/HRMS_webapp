"""Production payroll: components, salary lines, statutory config, pay runs (Kredily-style).

Compliance figures (PF %, ESI %, slabs) are configurable per organization. Validate with a CA
before using in production; rules change with government notifications.
"""

from decimal import Decimal

from django.conf import settings
from django.db import models

from employees.models import Employee, Organization


# --- Legacy simple payroll row (kept for backward-compatible DB / migrations) ---


class PayrollRecord(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="payroll_records")
    period_year = models.PositiveIntegerField()
    period_month = models.PositiveIntegerField()
    basic_salary = models.DecimalField(max_digits=12, decimal_places=2)
    allowances = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    net_salary = models.DecimalField(max_digits=12, decimal_places=2)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-period_year", "-period_month", "employee__employee_code"]
        constraints = [
            models.UniqueConstraint(
                fields=["employee", "period_year", "period_month"],
                name="unique_payroll_period_per_employee",
            ),
        ]

    def __str__(self):
        return f"{self.employee.employee_code} {self.period_year}-{self.period_month:02d}"


# --- Full payroll module ---


class PayrollComponentCategory(models.TextChoices):
    BASIC_STRUCTURE = "basic_structure", "Basic structure"
    RECURRING = "recurring", "Recurring"
    VARIABLE = "variable", "Variable"
    ADHOC = "adhoc", "Adhoc"
    STATUTORY = "statutory", "Statutory"


class PayrollComponentKind(models.TextChoices):
    EARNING = "earning", "Earning"
    DEDUCTION = "deduction", "Deduction"


class PayrollComponent(models.Model):
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="payroll_components",
    )
    code = models.SlugField(max_length=40)
    name = models.CharField(max_length=120)
    category = models.CharField(
        max_length=32,
        choices=PayrollComponentCategory.choices,
        default=PayrollComponentCategory.RECURRING,
    )
    kind = models.CharField(max_length=16, choices=PayrollComponentKind.choices)
    taxable = models.BooleanField(default=True)
    pf_wage_part = models.BooleanField(
        default=False,
        help_text="Include prorated amount in PF wage (before monthly ceiling).",
    )
    esi_wage_part = models.BooleanField(
        default=False,
        help_text="Include prorated amount in gross used for ESI eligibility and calculation.",
    )
    prorate_with_attendance = models.BooleanField(
        default=True,
        help_text="If false, full monthly amount applies (e.g. some variable payouts).",
    )
    is_system = models.BooleanField(
        default=False,
        help_text="Seeded components; cannot be deleted.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["organization_id", "code"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "code"],
                name="uniq_payroll_component_code_per_org",
            ),
        ]

    def __str__(self):
        return f"{self.code} ({self.organization.slug})"


class SalaryCalculationMode(models.TextChoices):
    FIXED = "fixed", "Fixed monthly"
    PERCENT_BASIC = "percent_basic", "Percent of basic"
    PERCENT_GROSS = "percent_gross", "Percent of gross"


class CtcType(models.TextChoices):
    GROSS = "gross", "Monthly gross (in-hand)"
    MONTHLY = "monthly", "Monthly CTC"
    ANNUAL = "annual", "Annual CTC"


class EmployeeSalaryLine(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="salary_lines")
    component = models.ForeignKey(
        PayrollComponent,
        on_delete=models.PROTECT,
        related_name="employee_salary_lines",
    )
    calculation_mode = models.CharField(
        max_length=20,
        choices=SalaryCalculationMode.choices,
        default=SalaryCalculationMode.FIXED,
    )
    monthly_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0"),
        help_text="Fixed component amount, or ignored when using percent_basic.",
    )
    percent_of_basic = models.DecimalField(
        max_digits=8,
        decimal_places=4,
        null=True,
        blank=True,
        help_text="When mode is percent_basic: % of resolved monthly basic.",
    )
    effective_from = models.DateField()
    effective_to = models.DateField(null=True, blank=True)
    sort_order = models.PositiveSmallIntegerField(default=10)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["employee_id", "sort_order", "id"]

    def __str__(self):
        return f"{self.employee.employee_code} · {self.component.code}"


class EmployeeCompensation(models.Model):
    """CTC / gross compensation — separate from onboarding; drives salary structure."""

    employee = models.OneToOneField(
        Employee,
        on_delete=models.CASCADE,
        related_name="compensation",
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.PROTECT,
        related_name="employee_compensations",
    )
    ctc_type = models.CharField(
        max_length=16,
        choices=CtcType.choices,
        default=CtcType.GROSS,
    )
    annual_ctc = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    monthly_gross = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    effective_from = models.DateField()
    payroll_group = models.CharField(max_length=80, blank=True, default="default")
    salary_structure = models.ForeignKey(
        "PayrollSalaryStructure",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_compensations",
    )
    pf_applicable = models.BooleanField(default=True)
    esi_applicable = models.BooleanField(default=True)
    pt_applicable = models.BooleanField(default=True)
    tds_applicable = models.BooleanField(default=True)
    template_overrides = models.JSONField(default=dict, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Employee compensation"

    def __str__(self):
        return f"Compensation · {self.employee.employee_code}"


class CompensationRevision(models.Model):
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="compensation_revisions",
    )
    effective_from = models.DateField()
    ctc_type = models.CharField(max_length=16, choices=CtcType.choices, default=CtcType.MONTHLY)
    monthly_gross = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    annual_ctc = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    note = models.CharField(max_length=255, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="compensation_revisions_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-effective_from", "-id"]

    def __str__(self):
        return f"{self.employee.employee_code} from {self.effective_from}"


class EmployeePayrollProfile(models.Model):
    employee = models.OneToOneField(
        Employee,
        on_delete=models.CASCADE,
        related_name="payroll_profile",
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.PROTECT,
        related_name="payroll_profiles",
    )
    pan = models.CharField(max_length=16, blank=True)
    bank_name = models.CharField(max_length=120, blank=True)
    account_holder_name = models.CharField(max_length=120, blank=True)
    bank_account_number = models.CharField(max_length=34, blank=True)
    bank_ifsc = models.CharField(max_length=16, blank=True)
    payment_mode = models.CharField(
        max_length=16,
        choices=[("neft", "NEFT"), ("imps", "IMPS"), ("rtgs", "RTGS")],
        default="neft",
        blank=True,
    )
    pf_eligible = models.BooleanField(default=True)
    esi_eligible = models.BooleanField(default=True)
    pt_applicable = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Payroll profile · {self.employee.employee_code}"


class ESIBasis(models.TextChoices):
    GROSS = "gross", "Prorated gross (earnings)"
    PF_WAGE = "pf_wage", "PF wage"


class TaxRegime(models.TextChoices):
    OLD = "old", "Old regime (India)"
    NEW = "new", "New regime (India)"


class PayrollCtcTemplate(models.Model):
    """Org-level CTC → salary split formulas (admin can override defaults)."""

    organization = models.OneToOneField(
        Organization,
        on_delete=models.CASCADE,
        related_name="payroll_ctc_template",
    )
    basic_pct_of_ctc = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("40.00"))
    da_pct_of_ctc = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("10.00"))
    hra_pct_of_basic = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("40.00"))
    variable_pay_pct_of_ctc = models.DecimalField(max_digits=7, decimal_places=4, default=Decimal("3.3333"))
    gratuity_pct_of_basic = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("4.81"))
    health_insurance_pct_of_ctc = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("1.61"))
    transport_allowance = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("1600.00"))
    cea_monthly = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("200.00"))
    meal_allowance = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("2200.00"))
    lta_monthly = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("500.00"))
    mobile_internet = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("500.00"))
    uniform_allowance = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("350.00"))
    medical_allowance = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("1000.00"))
    include_transport = models.BooleanField(default=True)
    include_cea = models.BooleanField(default=True)
    include_meal = models.BooleanField(default=True)
    include_lta = models.BooleanField(default=True)
    include_mobile = models.BooleanField(default=True)
    include_uniform = models.BooleanField(default=True)
    include_medical = models.BooleanField(default=True)
    include_variable_pay = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"CTC template · {self.organization.slug}"


class PfWageBasis(models.TextChoices):
    BASIC = "basic", "Basic × 12%"
    BASIC_SPECIAL = "basic_special", "(Basic + Special Allowance) × 12%"
    BASIC_DA = "basic_da", "(Basic + DA) × 12%"


class PayrollStatutoryConfig(models.Model):
    organization = models.OneToOneField(
        Organization,
        on_delete=models.CASCADE,
        related_name="payroll_statutory",
    )
    pay_cycle_start_day = models.PositiveSmallIntegerField(default=1)
    pay_cycle_end_day = models.PositiveSmallIntegerField(default=31)
    pf_enabled = models.BooleanField(default=True)
    pf_wage_basis = models.CharField(
        max_length=20,
        choices=PfWageBasis.choices,
        default=PfWageBasis.BASIC_DA,
    )
    pf_employee_contribution_type = models.CharField(
        max_length=20,
        choices=PfWageBasis.choices,
        default=PfWageBasis.BASIC_DA,
        help_text="Kredily-style employee contribution type selector for PF basis.",
    )
    pf_ceiling_enabled = models.BooleanField(
        default=True,
        help_text="When on, PF wage is capped at pf_monthly_wage_ceiling (commonly ₹15,000).",
    )
    pf_employee_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("12.00"))
    pf_employer_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("12.00"))
    pf_monthly_wage_ceiling = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("15000.00"),
        help_text="EPFO wage ceiling for contribution (commonly ₹15,000/mo; verify current law).",
    )
    esi_enabled = models.BooleanField(default=True)
    esi_employee_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0.75"))
    esi_employer_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("3.25"))
    esi_gross_threshold = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("21000.00"),
        help_text="ESI applies when gross is at or below this (configurable).",
    )
    esi_basis = models.CharField(
        max_length=16,
        choices=ESIBasis.choices,
        default=ESIBasis.GROSS,
    )
    pt_enabled = models.BooleanField(
        default=False,
        help_text="Company deducts professional tax on payslips when enabled.",
    )
    professional_tax_monthly = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("200.00"),
        help_text="Flat PT per month when applicable (state slabs can be layered later).",
    )
    tds_regime = models.CharField(
        max_length=8,
        choices=TaxRegime.choices,
        default=TaxRegime.NEW,
        help_text="Default tax regime for TDS when employee has not declared a choice.",
    )
    standard_deduction_annual = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("75000.00"),
        help_text="Section 16 standard deduction (₹75,000 for FY 2025-26).",
    )
    include_cess_on_tds_estimate = models.BooleanField(
        default=True,
        help_text="Apply 4% health & education cess on estimated annual tax, spread monthly.",
    )
    company_bank_name = models.CharField(max_length=120, blank=True)
    company_account_holder = models.CharField(max_length=120, blank=True)
    company_account_number = models.CharField(max_length=34, blank=True)
    company_ifsc = models.CharField(max_length=16, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Statutory · {self.organization.slug}"


class PayrollStatutoryConfigRevision(models.Model):
    """Audit trail for payroll statutory settings changes."""

    config = models.ForeignKey(
        PayrollStatutoryConfig,
        on_delete=models.CASCADE,
        related_name="revisions",
    )
    snapshot = models.JSONField()
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payroll_statutory_revisions",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"Statutory revision · {self.config.organization.slug} · {self.created_at:%Y-%m-%d}"


class StructureLineSection(models.TextChoices):
    EARNING = "earning", "Earning"
    DEDUCTION = "deduction", "Deduction"


class PayrollSalaryStructure(models.Model):
    """Named salary structure template (Kredily-style create structure)."""

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="payroll_salary_structures",
    )
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    is_company_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_company_default", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "name"],
                name="uniq_salary_structure_name_per_org",
            ),
        ]

    def __str__(self):
        return f"{self.name} · {self.organization.slug}"


class PayrollSalaryStructureLine(models.Model):
    structure = models.ForeignKey(
        PayrollSalaryStructure,
        on_delete=models.CASCADE,
        related_name="lines",
    )
    component_name = models.CharField(max_length=120)
    section = models.CharField(max_length=16, choices=StructureLineSection.choices)
    formula = models.CharField(max_length=255, default="0")
    system_calculated = models.BooleanField(default=False)
    sort_order = models.PositiveSmallIntegerField(default=10)

    class Meta:
        ordering = ["section", "sort_order", "id"]

    def __str__(self):
        return f"{self.component_name} ({self.section})"


class PayoutStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    PAID = "paid", "Paid"


class PayrollRunStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    PROCESSING = "processing", "Processing"
    READY = "ready", "Ready"
    FINALIZED = "finalized", "Finalized"
    PAID = "paid", "Paid"


class PayrollRun(models.Model):
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="payroll_runs",
    )
    period_year = models.PositiveIntegerField()
    period_month = models.PositiveIntegerField()
    status = models.CharField(
        max_length=16,
        choices=PayrollRunStatus.choices,
        default=PayrollRunStatus.DRAFT,
    )
    working_days = models.PositiveSmallIntegerField(
        default=22,
        help_text="Paid-day denominator for proration (pay register).",
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-period_year", "-period_month", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "period_year", "period_month"],
                name="uniq_payroll_run_period_per_org",
            ),
        ]

    def __str__(self):
        return f"{self.organization.slug} {self.period_year}-{self.period_month:02d} ({self.status})"


class PayrollEmployeeResult(models.Model):
    run = models.ForeignKey(
        PayrollRun,
        on_delete=models.CASCADE,
        related_name="employee_results",
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="payroll_run_results",
    )
    paid_days = models.DecimalField(max_digits=7, decimal_places=2, default=Decimal("0"))
    lop_days = models.DecimalField(max_digits=7, decimal_places=2, default=Decimal("0"))
    auto_paid_days = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        default=Decimal("0"),
        help_text="Last computed paid days from attendance/leave (before HR override).",
    )
    auto_lop_days = models.DecimalField(max_digits=7, decimal_places=2, default=Decimal("0"))
    paid_days_overridden = models.BooleanField(
        default=False,
        help_text="When true, paid_days were set manually and are not overwritten on refresh.",
    )
    is_on_hold = models.BooleanField(default=False)
    payout_status = models.CharField(
        max_length=16,
        choices=PayoutStatus.choices,
        default=PayoutStatus.PENDING,
    )
    paid_at = models.DateTimeField(null=True, blank=True)
    tds_override = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    gross_monthly_full = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    gross_prorated = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    taxable_prorated = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    total_statutory_and_taxes = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    total_deductions = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    net_pay = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))

    pf_employee = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    pf_employer = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    esi_employee = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    esi_employer = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    professional_tax = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    tds = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["employee__employee_code"]
        constraints = [
            models.UniqueConstraint(
                fields=["run", "employee"],
                name="uniq_payroll_result_run_employee",
            ),
        ]

    def __str__(self):
        return f"{self.run_id} · {self.employee.employee_code}"


class PayrollResultLine(models.Model):
    result = models.ForeignKey(
        PayrollEmployeeResult,
        on_delete=models.CASCADE,
        related_name="lines",
    )
    component = models.ForeignKey(
        PayrollComponent,
        on_delete=models.PROTECT,
        related_name="payroll_result_lines",
    )
    kind = models.CharField(max_length=16, choices=PayrollComponentKind.choices)
    amount_full_month = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    amount_prorated = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))

    class Meta:
        ordering = ["result_id", "kind", "component__code"]

    def __str__(self):
        return f"{self.component.code} {self.amount_prorated}"


class TaxDeclarationStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    SUBMITTED = "submitted", "Submitted"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"


class PayrollTaxDeclaration(models.Model):
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="payroll_tax_declarations",
    )
    financial_year = models.CharField(max_length=9, help_text="e.g. 2025-26")
    tax_regime = models.CharField(
        max_length=8,
        choices=TaxRegime.choices,
        default=TaxRegime.NEW,
        help_text="Old vs new tax regime for TDS (FY choice).",
    )
    section_80c = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    section_80d = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    other_chapter_vi_a = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    status = models.CharField(
        max_length=16,
        choices=TaxDeclarationStatus.choices,
        default=TaxDeclarationStatus.DRAFT,
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["employee", "financial_year"],
                name="uniq_tax_declaration_employee_fy",
            ),
        ]
        ordering = ["-financial_year", "employee_id"]

    def __str__(self):
        return f"{self.employee.employee_code} {self.financial_year}"
