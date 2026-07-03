"""Payroll calculation engine (India-oriented, configurable).

TDS uses FY 2025-26 slabs + Section 87A rebate via ``tds_calculator`` — not legal advice.
"""

from calendar import monthrange
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from django.db import transaction
from django.db.models import Q

from employees.models import Employee, Organization

from ..models import (
    ESIBasis,
    EmployeeCompensation,
    EmployeePayrollProfile,
    EmployeeSalaryLine,
    PayrollComponentKind,
    PayrollEmployeeResult,
    PayrollResultLine,
    PayrollRun,
    PayrollRunStatus,
    PayrollStatutoryConfig,
    PayrollTaxDeclaration,
    SalaryCalculationMode,
    TaxDeclarationStatus,
    TaxRegime,
)

Q2 = Decimal("0.01")

from .statutory_preview import PF_BASIS_CODE_SETS, compute_esi_contributions, compute_pf_contributions, resolve_pf_wage_from_codes


def financial_year_label(d: date) -> str:
    """India FY Apr–Mar as '2025-26'."""
    if d.month >= 4:
        y1, y2 = d.year, d.year + 1
    else:
        y1, y2 = d.year - 1, d.year
    return f"{y1}-{str(y2)[-2:]}"


def _q(v: Decimal | int | float | str | None) -> Decimal:
    """Quantize to 2 dp; coerces non-Decimal (e.g. plain ``0`` from ``sum()`` on empty lists)."""
    if v is None:
        d = Decimal("0")
    elif isinstance(v, Decimal):
        d = v
    else:
        d = Decimal(str(v))
    return d.quantize(Q2, rounding=ROUND_HALF_UP)


def _employee_compensation(employee: Employee) -> EmployeeCompensation | None:
    try:
        return employee.compensation
    except EmployeeCompensation.DoesNotExist:
        return None


def pf_applies(employee: Employee, profile: EmployeePayrollProfile, statutory: PayrollStatutoryConfig) -> bool:
    if not statutory.pf_enabled or not profile.pf_eligible:
        return False
    comp = _employee_compensation(employee)
    if comp is not None and not comp.pf_applicable:
        return False
    return True


def esi_applies(employee: Employee, profile: EmployeePayrollProfile, statutory: PayrollStatutoryConfig) -> bool:
    if not statutory.esi_enabled or not profile.esi_eligible:
        return False
    comp = _employee_compensation(employee)
    if comp is not None and not comp.esi_applicable:
        return False
    return True


def ensure_payroll_profile(employee: Employee) -> EmployeePayrollProfile:
    org = employee.organization
    if not org:
        raise ValueError("Employee has no organization; assign one before payroll.")
    profile, _ = EmployeePayrollProfile.objects.get_or_create(
        employee=employee,
        defaults={"organization": org},
    )
    if profile.organization_id != org.id:
        profile.organization = org
        profile.save(update_fields=["organization", "updated_at"])
    return profile


def _period_anchor(run: PayrollRun) -> date:
    return date(run.period_year, run.period_month, 1)


def _active_salary_lines(employee: Employee, on_day: date) -> list[EmployeeSalaryLine]:
    qs = (
        EmployeeSalaryLine.objects.filter(employee=employee, effective_from__lte=on_day)
        .filter(Q(effective_to__isnull=True) | Q(effective_to__gte=on_day))
        .select_related("component")
        .order_by("sort_order", "-effective_from", "id")
    )
    lines = list(qs)
    if not lines:
        qs_fallback = (
            EmployeeSalaryLine.objects.filter(employee=employee, effective_to__isnull=True)
            .select_related("component")
            .order_by("sort_order", "-effective_from", "id")
        )
        lines = list(qs_fallback)
        
    # Deduplicate by component (keep the most recent effective_from)
    seen_components = set()
    deduped = []
    for line in lines:
        if line.component_id not in seen_components:
            seen_components.add(line.component_id)
            deduped.append(line)
            
    return deduped


def _proration_ratio(paid_days: Decimal | int | float | str, working_days: int) -> Decimal:
    if working_days <= 0:
        return Decimal("1")
    pd = paid_days if isinstance(paid_days, Decimal) else Decimal(str(paid_days))
    r = pd / Decimal(str(working_days))
    if r > Decimal("1"):
        r = Decimal("1")
    if r < Decimal("0"):
        r = Decimal("0")
    return r


def resolve_monthly_amounts(lines: list[EmployeeSalaryLine]) -> tuple[Decimal, dict[int, Decimal]]:
    by_id: dict[int, Decimal] = {}
    basic = Decimal("0")

    for line in lines:
        c = line.component
        if line.calculation_mode == SalaryCalculationMode.FIXED:
            amt = _q(line.monthly_amount)
            by_id[c.id] = by_id.get(c.id, Decimal("0")) + amt
            if c.code.upper() == "BASIC":
                basic += amt

    for line in lines:
        c = line.component
        if line.calculation_mode == SalaryCalculationMode.PERCENT_BASIC:
            pct = line.percent_of_basic or Decimal("0")
            amt = _q(basic * pct / Decimal("100"))
            by_id[c.id] = by_id.get(c.id, Decimal("0")) + amt

    gross = sum(by_id.values(), Decimal("0"))
    for line in lines:
        c = line.component
        if line.calculation_mode == SalaryCalculationMode.PERCENT_GROSS:
            pct = line.percent_of_basic or Decimal("0")
            amt = _q(gross * pct / Decimal("100"))
            by_id[c.id] = by_id.get(c.id, Decimal("0")) + amt
            gross += amt

    return basic, by_id


def resolve_pf_wage_full(
    lines: list[EmployeeSalaryLine],
    comp_amounts: dict[int, Decimal],
    basis: str | None,
) -> Decimal:
    """Resolve PF wage according to selected contribution type/basis."""
    selected = (basis or "").strip().lower()
    codes = PF_BASIS_CODE_SETS.get(selected)
    if codes:
        amounts_by_code: dict[str, Decimal] = {}
        for line in lines:
            c = line.component
            if c.kind != PayrollComponentKind.EARNING:
                continue
            code = (c.code or "").upper()
            if code in codes:
                amounts_by_code[code] = comp_amounts.get(c.id, Decimal("0"))
        return resolve_pf_wage_from_codes(amounts_by_code, selected)
    # Backward compatibility: old behavior using component flags.
    return _q(
        sum(
            (
                comp_amounts.get(line.component_id, Decimal("0"))
                for line in lines
                if line.component.kind == PayrollComponentKind.EARNING and line.component.pf_wage_part
            ),
            Decimal("0"),
        )
    )


def compute_employee_payroll(
    result: PayrollEmployeeResult,
    statutory: PayrollStatutoryConfig | None = None,
) -> dict[str, Any]:
    """Recompute and persist lines + totals for one PayrollEmployeeResult. Returns summary dict."""
    run = result.run
    employee = result.employee
    anchor = _period_anchor(run)
    last_day = date(run.period_year, run.period_month, monthrange(run.period_year, run.period_month)[1])

    if statutory is None:
        statutory = PayrollStatutoryConfig.objects.get(organization_id=run.organization_id)

    profile = ensure_payroll_profile(employee)
    lines = _active_salary_lines(employee, last_day)

    _, comp_amounts = resolve_monthly_amounts(lines)

    ratio = _proration_ratio(result.paid_days, run.working_days)

    gross_full = Decimal("0")
    taxable_full = Decimal("0")
    pf_basis = (
        getattr(statutory, "pf_employee_contribution_type", None)
        or getattr(statutory, "pf_wage_basis", None)
        or "basic_da"
    )
    pf_wage_full = resolve_pf_wage_full(lines, comp_amounts, pf_basis)
    esi_gross_full = Decimal("0")

    breakdown: list[dict[str, Any]] = []

    for line in lines:
        c = line.component
        if c.kind != PayrollComponentKind.EARNING:
            continue
        full = comp_amounts.get(c.id, Decimal("0"))
        prorate = c.prorate_with_attendance
        prorated = _q(full * ratio) if prorate else _q(full)
        gross_full += full
        if c.taxable:
            taxable_full += full
        if c.esi_wage_part:
            esi_gross_full += full
        breakdown.append(
            {
                "component": c,
                "kind": PayrollComponentKind.EARNING,
                "full": full,
                "prorated": prorated,
            }
        )

    # Automatically fetch and add approved expense claims
    from expenses.models import ExpenseClaim, ExpenseClaimStatus
    from payroll.models import PayrollComponent, PayrollComponentCategory
    
    unreimbursed_claims = ExpenseClaim.objects.filter(
        employee=employee,
        status=ExpenseClaimStatus.APPROVED,
        is_reimbursed=False,
        skip_payroll=False
    )
    total_expenses = sum((claim.approved_amount or claim.amount) for claim in unreimbursed_claims)
    
    if total_expenses > Decimal("0"):
        total_expenses = _q(total_expenses)
        reimbursement_comp, _ = PayrollComponent.objects.get_or_create(
            organization=run.organization,
            code="REIMBURSEMENT",
            defaults={
                "name": "Expense Reimbursements",
                "category": PayrollComponentCategory.ADHOC,
                "kind": PayrollComponentKind.EARNING,
                "taxable": False,
                "prorate_with_attendance": False,
                "is_system": True,
            }
        )
        # Reimbursements are not prorated or taxable
        gross_full += total_expenses
        breakdown.append(
            {
                "component": reimbursement_comp,
                "kind": PayrollComponentKind.EARNING,
                "full": total_expenses,
                "prorated": total_expenses,
            }
        )

    gross_prorated = _q(sum((b["prorated"] for b in breakdown), Decimal("0")))
    taxable_prorated = _q(
        sum((b["prorated"] for b in breakdown if b["component"].taxable), Decimal("0"))
    )

    pf_wage_prorated = _q(pf_wage_full * ratio)
    esi_base_full = esi_gross_full if statutory.esi_basis == ESIBasis.GROSS else pf_wage_full
    esi_base_prorated = _q(esi_base_full * ratio)

    pf_ee = Decimal("0")
    pf_er = Decimal("0")
    if pf_applies(employee, profile, statutory):
        pf_ee, pf_er, _ = compute_pf_contributions(
            pf_wage_prorated,
            employee_percent=statutory.pf_employee_percent,
            employer_percent=statutory.pf_employer_percent,
            ceiling=statutory.pf_monthly_wage_ceiling,
            ceiling_enabled=statutory.pf_ceiling_enabled,
            enabled=True,
        )

    esi_ee = Decimal("0")
    esi_er = Decimal("0")
    if esi_applies(employee, profile, statutory):
        esi_ee, esi_er = compute_esi_contributions(
            esi_base_prorated,
            employee_percent=statutory.esi_employee_percent,
            employer_percent=statutory.esi_employer_percent,
            threshold=statutory.esi_gross_threshold,
            enabled=True,
        )

    pt = Decimal("0")
    if statutory.pt_enabled and profile.pt_applicable:
        pt = _q(statutory.professional_tax_monthly)

    fy = financial_year_label(anchor)
    decl = (
        PayrollTaxDeclaration.objects.filter(
            employee=employee,
            financial_year=fy,
            status=TaxDeclarationStatus.APPROVED,
        )
        .first()
    )
    approved_chapter_vi = Decimal("0")
    if decl:
        approved_chapter_vi = _q(decl.section_80c + decl.section_80d + decl.other_chapter_vi_a)

    taxable_for_tds = max(Decimal("0"), taxable_prorated - pf_ee)

    comp = _employee_compensation(employee)
    tds_applicable = comp is None or comp.tds_applicable

    if result.tds_override is not None:
        tds = _q(result.tds_override)
    elif not tds_applicable:
        tds = Decimal("0")
    else:
        from .tds_calculator import monthly_tds_estimate

        regime = statutory.tds_regime
        if decl and getattr(decl, "tax_regime", None):
            regime = decl.tax_regime
        pt_annual = _q(pt * Decimal("12")) if pt else Decimal("0")
        tds = monthly_tds_estimate(
            taxable_for_tds,
            regime=regime,
            standard_deduction_annual=statutory.standard_deduction_annual,
            chapter_vi_a_annual=approved_chapter_vi if regime == TaxRegime.OLD else Decimal("0"),
            professional_tax_annual=pt_annual,
            include_cess=statutory.include_cess_on_tds_estimate,
        )

    total_ded = _q(pf_ee + esi_ee + pt + tds)
    net = _q(gross_prorated - total_ded)

    if result.is_on_hold:
        net = Decimal("0")
        total_ded = _q(gross_prorated)

    with transaction.atomic():
        PayrollResultLine.objects.filter(result=result).delete()
        for b in breakdown:
            PayrollResultLine.objects.create(
                result=result,
                component=b["component"],
                kind=PayrollComponentKind.EARNING,
                amount_full_month=b["full"],
                amount_prorated=b["prorated"],
            )

        result.gross_monthly_full = _q(gross_full)
        result.gross_prorated = gross_prorated
        result.taxable_prorated = taxable_prorated
        result.pf_employee = pf_ee
        result.pf_employer = pf_er
        result.esi_employee = esi_ee
        result.esi_employer = esi_er
        result.professional_tax = pt
        result.tds = tds
        result.total_statutory_and_taxes = _q(pf_ee + esi_ee + pt + tds)
        result.total_deductions = total_ded
        result.net_pay = net
        result.save()

    return {
        "gross_prorated": str(gross_prorated),
        "net_pay": str(net),
        "pf_employee": str(pf_ee),
        "tds": str(tds),
    }


def recalculate_run(run: PayrollRun, *, refresh_paid_days: bool = True, force_paid_days: bool = False) -> int:
    from .paid_days import apply_auto_paid_days_to_result

    org = Organization.objects.get(pk=run.organization_id)
    statutory, _ = PayrollStatutoryConfig.objects.get_or_create(organization=org)
    count = 0
    for res in run.employee_results.select_related("employee", "employee__compensation", "run"):
        if refresh_paid_days and run.status in (PayrollRunStatus.DRAFT, PayrollRunStatus.READY):
            apply_auto_paid_days_to_result(res, force=force_paid_days)
        compute_employee_payroll(res, statutory)
        count += 1
    return count
