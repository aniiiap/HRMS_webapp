from decimal import Decimal

from rest_framework import serializers

from .models import (
    CompensationRevision,
    EmployeeCompensation,
    EmployeePayrollProfile,
    EmployeeSalaryLine,
    PayrollComponent,
    PayrollCtcTemplate,
    PayrollEmployeeResult,
    PayrollRecord,
    PayrollResultLine,
    PayrollRun,
    PayrollRunStatus,
    PayrollSalaryStructure,
    PayrollSalaryStructureLine,
    PayrollStatutoryConfig,
    PayrollStatutoryConfigRevision,
    PayrollTaxDeclaration,
    SalaryCalculationMode,
    TaxDeclarationStatus,
)
class PayrollRecordSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()

    class Meta:
        model = PayrollRecord
        fields = (
            "id",
            "employee",
            "employee_name",
            "period_year",
            "period_month",
            "basic_salary",
            "allowances",
            "deductions",
            "tax",
            "net_salary",
            "notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at", "employee_name")

    def get_employee_name(self, obj):
        u = obj.employee.user
        return f"{u.first_name} {u.last_name}".strip() or u.email

    @staticmethod
    def _net(basic: Decimal, allowances: Decimal, deductions: Decimal, tax: Decimal) -> Decimal:
        return basic + allowances - deductions - tax

    def create(self, validated_data):
        basic = validated_data["basic_salary"]
        allowances = validated_data.get("allowances", Decimal("0"))
        deductions = validated_data.get("deductions", Decimal("0"))
        tax = validated_data.get("tax", Decimal("0"))
        if "net_salary" not in validated_data or validated_data.get("net_salary") is None:
            validated_data["net_salary"] = self._net(basic, allowances, deductions, tax)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        basic = validated_data.get("basic_salary", instance.basic_salary)
        allowances = validated_data.get("allowances", instance.allowances)
        deductions = validated_data.get("deductions", instance.deductions)
        tax = validated_data.get("tax", instance.tax)
        if "net_salary" not in validated_data:
            validated_data["net_salary"] = self._net(basic, allowances, deductions, tax)
        return super().update(instance, validated_data)


# --- Full payroll ---


class PayrollComponentSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollComponent
        fields = (
            "id",
            "organization",
            "code",
            "name",
            "category",
            "kind",
            "taxable",
            "pf_wage_part",
            "esi_wage_part",
            "prorate_with_attendance",
            "is_system",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "is_system", "created_at", "updated_at")

    def validate(self, attrs):
        if self.instance and self.instance.is_system:
            forbidden = {"code", "kind", "category", "is_system"}
            touched = {k for k in attrs if k in forbidden}
            if touched:
                raise serializers.ValidationError("System components cannot change code, kind, or category.")
        return attrs


class PayrollResultLineSerializer(serializers.ModelSerializer):
    component_code = serializers.CharField(source="component.code", read_only=True)
    component_name = serializers.CharField(source="component.name", read_only=True)

    class Meta:
        model = PayrollResultLine
        fields = (
            "id",
            "component",
            "component_code",
            "component_name",
            "kind",
            "amount_full_month",
            "amount_prorated",
        )
        read_only_fields = fields


class PayrollEmployeeResultSerializer(serializers.ModelSerializer):
    lines = PayrollResultLineSerializer(many=True, read_only=True)
    employee_name = serializers.SerializerMethodField()
    employee_code = serializers.CharField(source="employee.employee_code", read_only=True)
    department = serializers.SerializerMethodField()
    designation = serializers.CharField(source="employee.designation", read_only=True)
    working_days = serializers.SerializerMethodField()
    status = serializers.CharField(source="run.status", read_only=True)
    attendance_summary = serializers.SerializerMethodField()
    bank_account_number = serializers.SerializerMethodField()
    bank_ifsc = serializers.SerializerMethodField()
    bank_name = serializers.SerializerMethodField()
    account_holder_name = serializers.SerializerMethodField()
    payment_mode = serializers.SerializerMethodField()

    class Meta:
        model = PayrollEmployeeResult
        fields = (
            "id",
            "run",
            "employee",
            "employee_code",
            "employee_name",
            "department",
            "designation",
            "working_days",
            "status",
            "paid_days",
            "lop_days",
            "auto_paid_days",
            "auto_lop_days",
            "attendance_summary",
            "paid_days_overridden",
            "is_on_hold",
            "tds_override",
            "gross_monthly_full",
            "gross_prorated",
            "taxable_prorated",
            "total_statutory_and_taxes",
            "total_deductions",
            "net_pay",
            "payout_status",
            "paid_at",
            "bank_account_number",
            "bank_ifsc",
            "bank_name",
            "account_holder_name",
            "payment_mode",
            "pf_employee",
            "pf_employer",
            "esi_employee",
            "esi_employer",
            "professional_tax",
            "tds",
            "lines",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "gross_monthly_full",
            "gross_prorated",
            "taxable_prorated",
            "total_statutory_and_taxes",
            "total_deductions",
            "net_pay",
            "pf_employee",
            "pf_employer",
            "esi_employee",
            "esi_employer",
            "professional_tax",
            "tds",
            "lines",
            "updated_at",
            "employee_code",
            "employee_name",
            "auto_paid_days",
            "auto_lop_days",
            "attendance_summary",
        )

    def get_attendance_summary(self, obj):
        from .services.paid_days import compute_paid_days_for_employee

        run = obj.run
        b = compute_paid_days_for_employee(
            obj.employee,
            run.period_year,
            run.period_month,
            int(run.working_days),
        )

        def _f(d):
            return float(d)

        return {
            "present_days": _f(b["present_days"]),
            "paid_leave_days": _f(b["paid_leave_days"]),
            "unpaid_leave_days": _f(b["unpaid_leave_days"]),
            "absent_days": _f(b["absent_days"]),
            "half_day_penalties": _f(b["half_day_penalties"]),
            "computed_paid_days": _f(b["paid_days"]),
            "computed_lop_days": _f(b["lop_days"]),
        }

    def _payroll_profile(self, obj):
        return getattr(obj.employee, "payroll_profile", None)

    def get_bank_account_number(self, obj):
        prof = self._payroll_profile(obj)
        return prof.bank_account_number if prof else ""

    def get_bank_ifsc(self, obj):
        prof = self._payroll_profile(obj)
        return prof.bank_ifsc if prof else ""

    def get_bank_name(self, obj):
        prof = self._payroll_profile(obj)
        return prof.bank_name if prof else ""

    def get_account_holder_name(self, obj):
        prof = self._payroll_profile(obj)
        if prof and prof.account_holder_name:
            return prof.account_holder_name
        u = obj.employee.user
        return f"{u.first_name} {u.last_name}".strip() or u.email

    def get_payment_mode(self, obj):
        prof = self._payroll_profile(obj)
        return prof.payment_mode if prof else "neft"

    def get_employee_name(self, obj):
        u = obj.employee.user
        return f"{u.first_name} {u.last_name}".strip() or u.email

    def get_department(self, obj):
        return obj.employee.department or ""

    def get_working_days(self, obj):
        return obj.run.working_days


class PayrollRunSerializer(serializers.ModelSerializer):
    result_count = serializers.SerializerMethodField()

    class Meta:
        model = PayrollRun
        fields = (
            "id",
            "organization",
            "period_year",
            "period_month",
            "status",
            "working_days",
            "notes",
            "result_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "status", "result_count", "created_at", "updated_at")

    def get_result_count(self, obj):
        return obj.employee_results.count()

    def validate(self, attrs):
        if self.instance and self.instance.status != PayrollRunStatus.DRAFT:
            if any(
                k in attrs
                for k in ("period_year", "period_month", "organization", "working_days")
            ):
                raise serializers.ValidationError("Only draft payroll runs can change period or working days.")
        if not self.instance:
            org = attrs.get("organization")
            y = attrs.get("period_year")
            m = attrs.get("period_month")
            if org and y and m:
                exists = PayrollRun.objects.filter(organization=org, period_year=y, period_month=m).exists()
                if exists:
                    raise serializers.ValidationError(
                        {"period_month": "A payroll run already exists for this organization and period."}
                    )
        return attrs


class PayrollCtcTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollCtcTemplate
        fields = (
            "id",
            "organization",
            "basic_pct_of_ctc",
            "da_pct_of_ctc",
            "hra_pct_of_basic",
            "variable_pay_pct_of_ctc",
            "gratuity_pct_of_basic",
            "health_insurance_pct_of_ctc",
            "transport_allowance",
            "cea_monthly",
            "meal_allowance",
            "lta_monthly",
            "mobile_internet",
            "uniform_allowance",
            "medical_allowance",
            "include_transport",
            "include_cea",
            "include_meal",
            "include_lta",
            "include_mobile",
            "include_uniform",
            "include_medical",
            "include_variable_pay",
            "updated_at",
        )
        read_only_fields = ("id", "updated_at")


class PayrollStatutoryConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollStatutoryConfig
        fields = (
            "id",
            "organization",
            "pay_cycle_start_day",
            "pay_cycle_end_day",
            "pf_enabled",
            "pf_wage_basis",
            "pf_employee_contribution_type",
            "pf_ceiling_enabled",
            "pf_employee_percent",
            "pf_employer_percent",
            "pf_monthly_wage_ceiling",
            "esi_enabled",
            "esi_employee_percent",
            "esi_employer_percent",
            "esi_gross_threshold",
            "esi_basis",
            "pt_enabled",
            "professional_tax_monthly",
            "tds_regime",
            "standard_deduction_annual",
            "include_cess_on_tds_estimate",
            "company_bank_name",
            "company_account_holder",
            "company_account_number",
            "company_ifsc",
            "updated_at",
        )
        read_only_fields = ("id", "updated_at")

    def validate(self, attrs):
        attrs = super().validate(attrs)
        contribution = attrs.get("pf_employee_contribution_type")
        if contribution:
            attrs["pf_wage_basis"] = contribution
        elif attrs.get("pf_wage_basis"):
            attrs["pf_employee_contribution_type"] = attrs["pf_wage_basis"]
        return attrs


class PayrollStatutoryConfigRevisionSerializer(serializers.ModelSerializer):
    changed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = PayrollStatutoryConfigRevision
        fields = ("id", "config", "snapshot", "changed_by", "changed_by_name", "created_at")
        read_only_fields = fields

    def get_changed_by_name(self, obj):
        if not obj.changed_by:
            return ""
        u = obj.changed_by
        return f"{u.first_name} {u.last_name}".strip() or u.email


class EmployeePayrollProfileSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    organization = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = EmployeePayrollProfile
        fields = (
            "id",
            "employee",
            "employee_name",
            "organization",
            "pan",
            "bank_name",
            "account_holder_name",
            "bank_account_number",
            "bank_ifsc",
            "payment_mode",
            "pf_eligible",
            "esi_eligible",
            "pt_applicable",
            "updated_at",
        )
        read_only_fields = ("id", "organization", "updated_at", "employee_name")

    def get_employee_name(self, obj):
        u = obj.employee.user
        return f"{u.first_name} {u.last_name}".strip() or u.email


class EmployeeSalaryLineSerializer(serializers.ModelSerializer):
    component_code = serializers.CharField(source="component.code", read_only=True)
    component_name = serializers.CharField(source="component.name", read_only=True)

    class Meta:
        model = EmployeeSalaryLine
        fields = (
            "id",
            "employee",
            "component",
            "component_code",
            "component_name",
            "calculation_mode",
            "monthly_amount",
            "percent_of_basic",
            "effective_from",
            "effective_to",
            "sort_order",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "component_code", "component_name", "created_at", "updated_at")

    def validate(self, attrs):
        employee = attrs.get("employee") or getattr(self.instance, "employee", None)
        component = attrs.get("component") or getattr(self.instance, "component", None)
        if employee and component and employee.organization_id != component.organization_id:
            raise serializers.ValidationError("Component must belong to the same organization as the employee.")
        mode = attrs.get("calculation_mode") or getattr(
            self.instance, "calculation_mode", SalaryCalculationMode.FIXED
        )
        if mode in (SalaryCalculationMode.PERCENT_BASIC, SalaryCalculationMode.PERCENT_GROSS):
            pct = attrs.get("percent_of_basic")
            if pct is None and self.instance:
                pct = self.instance.percent_of_basic
            if pct is None:
                raise serializers.ValidationError({"percent_of_basic": "Required for percentage-based mode."})
        return attrs


class CompensationRevisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompensationRevision
        fields = (
            "id",
            "employee",
            "effective_from",
            "ctc_type",
            "monthly_gross",
            "annual_ctc",
            "note",
            "created_at",
        )
        read_only_fields = fields


class PayrollSalaryStructureLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollSalaryStructureLine
        fields = ("id", "component_name", "section", "formula", "system_calculated", "sort_order")
        read_only_fields = ("id",)


class PayrollSalaryStructureSerializer(serializers.ModelSerializer):
    lines = PayrollSalaryStructureLineSerializer(many=True)
    employee_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = PayrollSalaryStructure
        fields = (
            "id",
            "organization",
            "name",
            "description",
            "is_company_default",
            "lines",
            "employee_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "organization", "is_company_default", "employee_count", "created_at", "updated_at")

    def create(self, validated_data):
        lines_data = validated_data.pop("lines", [])
        org = validated_data.pop("organization", None) or self.context.get("organization")
        if not org:
            raise serializers.ValidationError({"organization": "Required."})
        structure = PayrollSalaryStructure.objects.create(organization=org, **validated_data)
        for line in lines_data:
            PayrollSalaryStructureLine.objects.create(structure=structure, **line)
        return structure

    def update(self, instance, validated_data):
        lines_data = validated_data.pop("lines", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if lines_data is not None:
            instance.lines.all().delete()
            for line in lines_data:
                PayrollSalaryStructureLine.objects.create(structure=instance, **line)
        return instance


class EmployeeCompensationSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    salary_structure_name = serializers.SerializerMethodField()
    revision_history = serializers.SerializerMethodField()

    class Meta:
        model = EmployeeCompensation
        fields = (
            "id",
            "employee",
            "employee_name",
            "organization",
            "ctc_type",
            "annual_ctc",
            "monthly_gross",
            "effective_from",
            "payroll_group",
            "salary_structure",
            "salary_structure_name",
            "pf_applicable",
            "esi_applicable",
            "pt_applicable",
            "tds_applicable",
            "template_overrides",
            "revision_history",
            "updated_at",
        )
        read_only_fields = ("id", "organization", "updated_at", "employee_name", "revision_history")

    def get_employee_name(self, obj):
        u = obj.employee.user
        return f"{u.first_name} {u.last_name}".strip() or u.email

    def get_salary_structure_name(self, obj):
        if obj.salary_structure_id:
            return obj.salary_structure.name
        return None

    def get_revision_history(self, obj):
        qs = CompensationRevision.objects.filter(employee=obj.employee).order_by("-effective_from")[:24]
        return CompensationRevisionSerializer(qs, many=True).data


class PayrollTaxDeclarationSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()

    class Meta:
        model = PayrollTaxDeclaration
        fields = (
            "id",
            "employee",
            "employee_name",
            "financial_year",
            "tax_regime",
            "section_80c",
            "section_80d",
            "other_chapter_vi_a",
            "status",
            "updated_at",
        )
        read_only_fields = ("id", "updated_at", "employee_name")

    def get_employee_name(self, obj):
        u = obj.employee.user
        return f"{u.first_name} {u.last_name}".strip() or u.email
