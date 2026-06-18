"""Auto-generate salary structure from annual/monthly CTC (India standard payslip flow)."""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

from django.db import transaction

from employees.models import Employee

from ..ctc_calculator import (
    compute_ctc_breakup,
    merge_template_overrides,
    merge_statutory_overrides,
    solve_annual_ctc_from_gross_target,
    statutory_from_config,
    template_from_model,
)
from ..models import (
    CtcType,
    CompensationRevision,
    EmployeeCompensation,
    EmployeeSalaryLine,
    PayrollComponent,
    PayrollCtcTemplate,
    PayrollStatutoryConfig,
    SalaryCalculationMode,
)
from .engine import ensure_payroll_profile

Q2 = Decimal("0.01")


def _q(v: Decimal | int | float | str) -> Decimal:
    from decimal import ROUND_HALF_UP

    return Decimal(str(v)).quantize(Q2, rounding=ROUND_HALF_UP)


def _get_template(org_id: int) -> PayrollCtcTemplate | None:
    return PayrollCtcTemplate.objects.filter(organization_id=org_id).first()


def _get_statutory(org_id: int) -> PayrollStatutoryConfig | None:
    return PayrollStatutoryConfig.objects.filter(organization_id=org_id).first()


def _org_template(org_id: int, template_overrides: dict | None = None):
    tpl = template_from_model(_get_template(org_id))
    return merge_template_overrides(tpl, template_overrides)


def preview_from_ctc(
    annual_ctc: Decimal | str,
    organization_id: int,
    *,
    input_mode: str = "annual",
    template_overrides: dict | None = None,
    statutory_overrides: dict | None = None,
) -> dict:
    """Full CTC breakup: earnings, employer costs, deductions, net."""
    tpl = _org_template(organization_id, template_overrides)
    stat = statutory_from_config(_get_statutory(organization_id))
    stat = merge_statutory_overrides(stat, statutory_overrides)
    result = compute_ctc_breakup(annual_ctc, tpl, stat)
    result["input_mode"] = input_mode
    if input_mode == "monthly_ctc":
        result["target_monthly_ctc"] = result["monthly_ctc"]
    elif input_mode == "annual":
        result["target_annual_ctc"] = result["annual_ctc"]
    return result


def preview_from_gross_target(
    monthly_gross_target: Decimal | str,
    organization_id: int,
    *,
    template_overrides: dict | None = None,
    statutory_overrides: dict | None = None,
) -> dict:
    """HR enters in-hand monthly gross; system solves for CTC."""
    tpl = _org_template(organization_id, template_overrides)
    stat = statutory_from_config(_get_statutory(organization_id))
    stat = merge_statutory_overrides(stat, statutory_overrides)
    _, breakup = solve_annual_ctc_from_gross_target(monthly_gross_target, tpl, stat)
    return breakup


def preview_from_gross(monthly_gross: Decimal | str) -> dict:
    """Backward-compatible wrapper: treat monthly input as monthly CTC."""
    annual = _q(Decimal(str(monthly_gross)) * Decimal("12"))
    result = compute_ctc_breakup(annual)
    lines = []
    for ln in result["earnings"]:
        lines.append(
            {
                "code": ln["code"],
                "name": ln["name"],
                "amount": ln["monthly"],
                "mode": ln.get("mode", "fixed"),
                "percent": ln.get("percent"),
            }
        )
    return {
        "monthly_gross": result["gross_salary_monthly"],
        "monthly_ctc": result["monthly_ctc"],
        "annual_ctc": result["annual_ctc"],
        "lines": lines,
        "total_earnings": result["total_earnings_monthly"],
        "full_breakup": result,
    }


def sync_payroll_profile_from_compensation(comp: EmployeeCompensation) -> None:
    profile = ensure_payroll_profile(comp.employee)
    profile.pf_eligible = comp.pf_applicable
    profile.esi_eligible = comp.esi_applicable
    profile.pt_applicable = comp.pt_applicable
    profile.save(update_fields=["pf_eligible", "esi_eligible", "pt_applicable", "updated_at"])


@transaction.atomic
def apply_compensation_revision(
    employee: Employee,
    *,
    monthly_gross: Decimal | None,
    annual_ctc: Decimal | None,
    ctc_type: str,
    effective_from: date,
    user=None,
    note: str = "",
    generate_structure: bool = True,
    template_overrides: dict | None = None,
    statutory_overrides: dict | None = None,
) -> EmployeeCompensation:
    org_id = employee.organization_id
    if not org_id:
        raise ValueError("Employee must belong to an organization.")

    tpl = _org_template(org_id, template_overrides)
    stat = statutory_from_config(_get_statutory(org_id))
    stat = merge_statutory_overrides(stat, statutory_overrides)

    if ctc_type == CtcType.ANNUAL and annual_ctc:
        annual = _q(annual_ctc)
        breakup = compute_ctc_breakup(annual, tpl, stat)
    elif ctc_type == CtcType.GROSS and monthly_gross is not None:
        annual, breakup = solve_annual_ctc_from_gross_target(monthly_gross, tpl, stat)
    elif ctc_type == CtcType.MONTHLY and monthly_gross is not None:
        annual = _q(Decimal(str(monthly_gross)) * Decimal("12"))
        breakup = compute_ctc_breakup(annual, tpl, stat)
    elif monthly_gross is not None:
        annual, breakup = solve_annual_ctc_from_gross_target(monthly_gross, tpl, stat)
        ctc_type = CtcType.GROSS
    else:
        raise ValueError("Provide monthly_gross or annual_ctc.")
    employee_gross = _q(breakup["gross_salary_monthly"])

    comp, _ = EmployeeCompensation.objects.get_or_create(
        employee=employee,
        defaults={"organization_id": org_id, "effective_from": effective_from},
    )
    prev_gross = comp.monthly_gross
    comp.organization_id = org_id
    comp.ctc_type = ctc_type
    comp.monthly_gross = employee_gross
    comp.annual_ctc = annual
    comp.effective_from = effective_from
    comp.save()

    if prev_gross != employee_gross or not CompensationRevision.objects.filter(employee=employee).exists():
        CompensationRevision.objects.create(
            employee=employee,
            effective_from=effective_from,
            ctc_type=ctc_type,
            monthly_gross=employee_gross,
            annual_ctc=annual,
            note=note or "Compensation updated",
            created_by=user,
        )

    sync_payroll_profile_from_compensation(comp)

    if generate_structure:
        generate_from_ctc(employee, annual, effective_from, template_overrides=template_overrides, statutory_overrides=statutory_overrides)

    return comp


@transaction.atomic
def generate_from_ctc(
    employee: Employee,
    annual_ctc: Decimal | str,
    effective_from: date,
    *,
    close_previous: bool = True,
    template_overrides: dict | None = None,
    statutory_overrides: dict | None = None,
) -> list[EmployeeSalaryLine]:
    org_id = employee.organization_id
    if not org_id:
        raise ValueError("Employee must belong to an organization.")

    breakup = preview_from_ctc(annual_ctc, org_id, template_overrides=template_overrides, statutory_overrides=statutory_overrides)

    if close_previous:
        day_before = effective_from - timedelta(days=1)
        EmployeeSalaryLine.objects.filter(
            employee=employee,
            effective_to__isnull=True,
            effective_from__lt=effective_from,
        ).update(effective_to=day_before)

    created: list[EmployeeSalaryLine] = []
    order = 10

    for ln in breakup["earnings"]:
        amount = Decimal(ln["monthly"])
        if amount <= 0:
            continue
        component = PayrollComponent.objects.filter(
            organization_id=org_id,
            code__iexact=ln["code"],
        ).first()
        if not component:
            continue

        mode = SalaryCalculationMode.FIXED
        pct = None
        if ln.get("mode") == "percent_basic" and ln.get("percent"):
            mode = SalaryCalculationMode.PERCENT_BASIC
            pct = Decimal(str(ln["percent"]))

        line, _ = EmployeeSalaryLine.objects.update_or_create(
            employee=employee,
            component=component,
            effective_from=effective_from,
            defaults={
                "calculation_mode": mode,
                "monthly_amount": amount if mode == SalaryCalculationMode.FIXED else Decimal("0"),
                "percent_of_basic": pct,
                "effective_to": None,
                "sort_order": order,
            },
        )
        created.append(line)
        order += 5

    return created


@transaction.atomic
def generate_from_gross(
    employee: Employee,
    monthly_gross: Decimal | str,
    effective_from: date,
    *,
    close_previous: bool = True,
) -> list[EmployeeSalaryLine]:
    """Treat monthly amount as monthly CTC and generate full structure."""
    annual = _q(Decimal(str(monthly_gross)) * Decimal("12"))
    return generate_from_ctc(employee, annual, effective_from, close_previous=close_previous)
