"""
India CTC → salary structure calculator (production-grade).

Identity (always enforced):
    Monthly CTC = Employee gross (in-hand) + Employer costs

Percentage components scale with CTC; fixed allowances use configured ₹ amounts
when budget allows (priority order); Special allowance balances the remainder.
"""

from __future__ import annotations

from dataclasses import dataclass, replace
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

Q2 = Decimal("0.01")


def _q(v: Decimal | int | float | str) -> Decimal:
    return Decimal(str(v)).quantize(Q2, rounding=ROUND_HALF_UP)


def _rupee(v: Decimal) -> Decimal:
    return v.quantize(Decimal("1"), rounding=ROUND_HALF_UP)


@dataclass
class CtcTemplateValues:
    """Org-configurable CTC split defaults."""

    basic_pct_of_ctc: Decimal = Decimal("40.00")
    da_pct_of_ctc: Decimal = Decimal("10.00")
    hra_pct_of_basic: Decimal = Decimal("40.00")
    variable_pay_pct_of_ctc: Decimal = Decimal("3.3333")
    gratuity_pct_of_basic: Decimal = Decimal("4.81")
    health_insurance_pct_of_ctc: Decimal = Decimal("1.61")
    transport_allowance: Decimal = Decimal("1600.00")
    cea_monthly: Decimal = Decimal("200.00")
    meal_allowance: Decimal = Decimal("2200.00")
    lta_monthly: Decimal = Decimal("500.00")
    mobile_internet: Decimal = Decimal("500.00")
    uniform_allowance: Decimal = Decimal("350.00")
    medical_allowance: Decimal = Decimal("1000.00")
    include_transport: bool = True
    include_cea: bool = True
    include_meal: bool = True
    include_lta: bool = True
    include_mobile: bool = True
    include_uniform: bool = True
    include_medical: bool = True
    include_variable_pay: bool = True
    include_employer_pf: bool = True
    include_gratuity_provision: bool = True
    include_group_health: bool = True
    include_employer_esi: bool = True


EARNING_TOGGLE_FIELDS = (
    "include_transport",
    "include_cea",
    "include_meal",
    "include_lta",
    "include_mobile",
    "include_uniform",
    "include_medical",
    "include_variable_pay",
)

EMPLOYER_TOGGLE_FIELDS = (
    "include_employer_pf",
    "include_gratuity_provision",
    "include_group_health",
    "include_employer_esi",
)

INCLUDE_TOGGLE_FIELDS = EARNING_TOGGLE_FIELDS + EMPLOYER_TOGGLE_FIELDS


def merge_template_overrides(
    template: CtcTemplateValues,
    overrides: dict[str, Any] | None,
) -> CtcTemplateValues:
    """Apply preview/save-time include toggles without changing org defaults."""
    if not overrides:
        return template
    kwargs: dict[str, bool] = {}
    for key in INCLUDE_TOGGLE_FIELDS:
        if key in overrides:
            kwargs[key] = bool(overrides[key])
    return replace(template, **kwargs) if kwargs else template


def active_includes_dict(template: CtcTemplateValues) -> dict[str, bool]:
    return {key: bool(getattr(template, key)) for key in INCLUDE_TOGGLE_FIELDS}


@dataclass
class StatutoryValues:
    pf_employer_percent: Decimal = Decimal("12.00")
    pf_employee_percent: Decimal = Decimal("12.00")
    pf_monthly_wage_ceiling: Decimal = Decimal("15000.00")
    pf_employee_contribution_type: str = "basic_da"
    pf_ceiling_enabled: bool = True
    pf_enabled: bool = True
    esi_employer_percent: Decimal = Decimal("3.25")
    esi_employee_percent: Decimal = Decimal("0.75")
    esi_gross_threshold: Decimal = Decimal("21000.00")
    esi_enabled: bool = True
    pt_enabled: bool = False
    professional_tax_monthly: Decimal = Decimal("200.00")
    standard_deduction_annual: Decimal = Decimal("75000.00")
    tds_regime: str = "new"
    include_cess_on_tds_estimate: bool = True
    tds_enabled: bool = True


def merge_statutory_overrides(
    stat: StatutoryValues,
    overrides: dict[str, Any] | None,
) -> StatutoryValues:
    """Apply employee-level statutory overrides (TDS, PF, PT, ESI applicability)."""
    if not overrides:
        return stat
    kwargs: dict[str, Any] = {}
    if "pf_applicable" in overrides:
        kwargs["pf_enabled"] = stat.pf_enabled and bool(overrides["pf_applicable"])
    if "esi_applicable" in overrides:
        kwargs["esi_enabled"] = stat.esi_enabled and bool(overrides["esi_applicable"])
    if "pt_applicable" in overrides:
        kwargs["pt_enabled"] = stat.pt_enabled and bool(overrides["pt_applicable"])
    if "tds_applicable" in overrides:
        kwargs["tds_enabled"] = stat.tds_enabled and bool(overrides["tds_applicable"])
    return replace(stat, **kwargs) if kwargs else stat


def _line(
    code: str,
    name: str,
    monthly: Decimal,
    *,
    annual: Decimal | None = None,
    formula: str = "",
    tax_treatment: str = "taxable",
    tax_note: str = "",
    mode: str = "fixed",
    percent: str | None = None,
    section: str = "earning",
) -> dict[str, Any]:
    ann = annual if annual is not None else _q(monthly * Decimal("12"))
    return {
        "code": code,
        "name": name,
        "monthly": str(_q(monthly)),
        "annual": str(ann),
        "formula": formula,
        "tax_treatment": tax_treatment,
        "tax_note": tax_note,
        "mode": mode,
        "percent": percent,
        "section": section,
    }


def _employer_costs(
    monthly_ctc: Decimal,
    basic: Decimal,
    da: Decimal,
    special: Decimal,
    tpl: CtcTemplateValues,
    stat: StatutoryValues,
    employee_gross: Decimal,
) -> tuple[Decimal, Decimal, Decimal, Decimal]:
    """Employer PF, gratuity, health, ESI — zeroed when toggled off."""
    from .services.statutory_preview import compute_esi_contributions, compute_pf_contributions, resolve_pf_wage_preview

    _, employer_pf, _ = compute_pf_contributions(
        resolve_pf_wage_preview(
            basic=basic,
            da=da,
            special=special,
            basis=stat.pf_employee_contribution_type,
        ),
        employee_percent=stat.pf_employee_percent,
        employer_percent=stat.pf_employer_percent,
        ceiling=stat.pf_monthly_wage_ceiling,
        ceiling_enabled=stat.pf_ceiling_enabled,
        enabled=stat.pf_enabled and tpl.include_employer_pf,
    )
    gratuity = (
        _rupee(basic * tpl.gratuity_pct_of_basic / Decimal("100"))
        if tpl.include_gratuity_provision
        else Decimal("0")
    )
    health = (
        _q(monthly_ctc * tpl.health_insurance_pct_of_ctc / Decimal("100"))
        if tpl.include_group_health
        else Decimal("0")
    )
    _, employer_esi = compute_esi_contributions(
        employee_gross,
        employee_percent=stat.esi_employee_percent,
        employer_percent=stat.esi_employer_percent,
        threshold=stat.esi_gross_threshold,
        enabled=stat.esi_enabled and tpl.include_employer_esi,
    )
    return employer_pf, gratuity, health, employer_esi


def _fixed_allowance_specs(tpl: CtcTemplateValues) -> list[tuple[str, str, Decimal, str, str, str, bool]]:
    """Priority order: statutory/small first, larger optional allowances last."""
    return [
        ("CEA", "Children education allowance", tpl.cea_monthly, "Fixed ₹/month (statutory max ₹100/child × 2)", "partially_exempt", "Exempt u/s 10(14) in Old Regime.", tpl.include_cea),
        ("LTA", "Leave travel allowance (LTA)", tpl.lta_monthly, "Fixed ₹/month (claim with travel bills)", "partially_exempt", "Exempt u/s 10(5) in Old Regime.", tpl.include_lta),
        ("MOBILE_INTERNET", "Mobile / internet reimbursement", tpl.mobile_internet, "Fixed ₹/month (bill-based)", "partially_exempt", "Exempt against actual bills.", tpl.include_mobile),
        ("UNIFORM_ALLOWANCE", "Uniform / dress allowance", tpl.uniform_allowance, "Fixed ₹/month (bill-based)", "partially_exempt", "Exempt if uniform mandatory u/s 10(14).", tpl.include_uniform),
        ("TRANSPORT_ALLOWANCE", "Transport allowance", tpl.transport_allowance, "Fixed ₹/month", "taxable", "Under Standard Deduction in practice.", tpl.include_transport),
        ("MEAL_ALLOWANCE", "Meal / food allowance", tpl.meal_allowance, "Fixed ₹/month (₹50/meal × 2 × ~22 days)", "partially_exempt", "Voucher limit u/s 17(2).", tpl.include_meal),
        ("MEDICAL_ALLOWANCE", "Medical allowance", tpl.medical_allowance, "Fixed ₹/month", "taxable", "Absorbed into Standard Deduction.", tpl.include_medical),
    ]


def compute_ctc_breakup(
    annual_ctc: Decimal | str,
    template: CtcTemplateValues | None = None,
    statutory: StatutoryValues | None = None,
) -> dict[str, Any]:
    tpl = template or CtcTemplateValues()
    stat = statutory or StatutoryValues()
    warnings: list[str] = []
    skipped_allowances: list[str] = []

    monthly_ctc = _q(Decimal(str(annual_ctc)) / Decimal("12"))

    # —— Step 1: Percentage earnings (scale with any CTC) ——
    basic = _q(monthly_ctc * tpl.basic_pct_of_ctc / Decimal("100"))
    da = _q(monthly_ctc * tpl.da_pct_of_ctc / Decimal("100")) if tpl.da_pct_of_ctc else Decimal("0")
    hra = _q(basic * tpl.hra_pct_of_basic / Decimal("100"))
    core = basic + da + hra

    variable_nominal = Decimal("0")
    if tpl.include_variable_pay:
        variable_nominal = _rupee(monthly_ctc * tpl.variable_pay_pct_of_ctc / Decimal("100"))

    # —— Step 2: Employer costs (iterative when ESI applies) ——
    employer_pf = gratuity = health = employer_esi = Decimal("0")
    gross_budget = monthly_ctc
    special_est = Decimal("0")
    for _ in range(3):
        employer_pf, gratuity, health, employer_esi = _employer_costs(
            monthly_ctc, basic, da, special_est, tpl, stat, gross_budget
        )
        gross_budget = _q(monthly_ctc - employer_pf - gratuity - health - employer_esi)

    if core > gross_budget:
        warnings.append(
            f"Basic + DA + HRA ({_q(core)}) exceed in-hand budget ({gross_budget}) at this CTC. "
            "Reduce Basic/DA % in CTC formulas or increase CTC."
        )

    # —— Step 3: Allocate in-hand budget ——
    remaining = _q(gross_budget - core)
    variable = Decimal("0")
    if tpl.include_variable_pay and variable_nominal > Decimal("0"):
        if variable_nominal <= remaining:
            variable = variable_nominal
        else:
            variable = _rupee(max(Decimal("0"), remaining))
            if variable < variable_nominal:
                warnings.append(
                    f"Variable pay capped to ₹{variable} (nominal {tpl.variable_pay_pct_of_ctc}% = ₹{variable_nominal}) "
                    "due to CTC budget after employer costs."
                )
        remaining = _q(remaining - variable)

    fixed_lines: list[tuple[str, str, Decimal, str, str, str]] = []
    fixed_total = Decimal("0")
    for code, name, amount, formula, tax, note, enabled in _fixed_allowance_specs(tpl):
        if not enabled:
            continue
        amt = _q(amount)
        if amt <= remaining:
            fixed_lines.append((code, name, amt, formula, tax, note))
            fixed_total += amt
            remaining = _q(remaining - amt)
        else:
            skipped_allowances.append(name)

    if skipped_allowances:
        warnings.append(
            "Fixed allowance(s) not included at this CTC (no budget at full configured ₹): "
            + ", ".join(skipped_allowances)
            + ". Increase CTC or lower fixed ₹ in CTC formulas."
        )

    special = _q(remaining)
    if special < Decimal("0"):
        special = Decimal("0")

    employee_gross = _q(core + variable + fixed_total + special)

    # —— Step 4: Reconcile employer costs with final gross (ESI edge case) ——
    employer_pf, gratuity, health, employer_esi = _employer_costs(
        monthly_ctc, basic, da, special, tpl, stat, employee_gross
    )
    employer_total = _q(employer_pf + gratuity + health + employer_esi)
    ctc_check = _q(employee_gross + employer_total)

    if abs(ctc_check - monthly_ctc) > Decimal("1.00"):
        adjust = _q(monthly_ctc - employer_total - core - variable - fixed_total)
        if adjust >= Decimal("0"):
            special = adjust
            employee_gross = _q(core + variable + fixed_total + special)
            ctc_check = _q(employee_gross + employer_total)

    # Hard guarantee: in-hand gross never exceeds monthly CTC
    if employee_gross > monthly_ctc:
        special = _q(max(Decimal("0"), monthly_ctc - employer_total - core - variable - fixed_total))
        employee_gross = _q(core + variable + fixed_total + special)

    # —— Build response lines ——
    earnings: list[dict[str, Any]] = [
        _line(
            "BASIC",
            "Basic salary",
            basic,
            formula=f"{tpl.basic_pct_of_ctc}% × monthly CTC",
            tax_treatment="taxable",
            tax_note=f"With DA = {tpl.basic_pct_of_ctc + tpl.da_pct_of_ctc}% of CTC. PF & gratuity base.",
        ),
    ]
    if da > 0:
        earnings.append(
            _line(
                "DEARNESS_ALLOWANCE",
                "Dearness allowance (DA)",
                da,
                formula=f"{tpl.da_pct_of_ctc}% × monthly CTC",
                tax_treatment="taxable",
                tax_note="Included in PF wage.",
            )
        )
    earnings.append(
        _line(
            "HRA",
            "House rent allowance (HRA)",
            hra,
            formula=f"{tpl.hra_pct_of_basic}% × Basic",
            mode="percent_basic",
            percent=str(tpl.hra_pct_of_basic),
            tax_treatment="partially_exempt",
            tax_note="Exempt u/s 10(13A) in Old Regime with rent proof.",
        )
    )
    if variable > Decimal("0"):
        earnings.append(
            _line(
                "VARIABLE_PAY",
                "Performance / variable pay",
                variable,
                formula=f"{tpl.variable_pay_pct_of_ctc}% × monthly CTC",
                tax_treatment="taxable",
                tax_note="Fully taxable.",
            )
        )
    for code, name, amt, formula, tax, note in fixed_lines:
        earnings.append(_line(code, name, amt, formula=formula, tax_treatment=tax, tax_note=note))

    earnings.append(
        _line(
            "SPECIAL_ALLOWANCE",
            "Special allowance",
            special,
            formula="CTC − employer costs − Basic − DA − HRA − variable − fixed allowances",
            tax_treatment="taxable",
            tax_note="Balancing component; fully taxable.",
        )
    )

    from .services.statutory_preview import compute_esi_contributions, compute_pf_contributions, pf_basis_label, resolve_pf_wage_preview

    pf_wage_full = resolve_pf_wage_preview(
        basic=basic,
        da=da,
        special=special,
        basis=stat.pf_employee_contribution_type,
    )
    employee_pf, _, pf_base = compute_pf_contributions(
        pf_wage_full,
        employee_percent=stat.pf_employee_percent,
        employer_percent=stat.pf_employer_percent,
        ceiling=stat.pf_monthly_wage_ceiling,
        ceiling_enabled=stat.pf_ceiling_enabled,
        enabled=stat.pf_enabled,
    )
    employee_esi, _ = compute_esi_contributions(
        employee_gross,
        employee_percent=stat.esi_employee_percent,
        employer_percent=stat.esi_employer_percent,
        threshold=stat.esi_gross_threshold,
        enabled=stat.esi_enabled,
    )
    pf_formula_base = pf_basis_label(stat.pf_employee_contribution_type)
    employer: list[dict[str, Any]] = []
    if tpl.include_employer_pf and employer_pf > Decimal("0"):
        employer.append(
            _line(
                "EMPLOYER_PF",
                "Employer PF (EPF)",
                employer_pf,
                formula=f"{stat.pf_employer_percent}% × ({pf_formula_base})"
                + (f", ceiling ₹{stat.pf_monthly_wage_ceiling}" if stat.pf_ceiling_enabled else ""),
                tax_treatment="tax_free",
                tax_note="Not part of in-hand salary.",
                section="employer",
            )
        )
    if tpl.include_gratuity_provision and gratuity > Decimal("0"):
        employer.append(
            _line(
                "GRATUITY_PROVISION",
                "Gratuity provision",
                gratuity,
                formula=f"{tpl.gratuity_pct_of_basic}% × Basic",
                tax_treatment="tax_free",
                tax_note="Accrued; payable after 5+ years.",
                section="employer",
            )
        )
    if tpl.include_group_health and health > Decimal("0"):
        employer.append(
            _line(
                "GROUP_HEALTH",
                "Health insurance premium",
                health,
                formula=f"{tpl.health_insurance_pct_of_ctc}% × monthly CTC",
                tax_treatment="tax_free",
                tax_note="Employer-paid group mediclaim.",
                section="employer",
            )
        )
    if tpl.include_employer_esi and employer_esi > Decimal("0"):
        employer.append(
            _line(
                "EMPLOYER_ESI",
                "Employer ESIC",
                employer_esi,
                formula=f"{stat.esi_employer_percent}% × gross (≤ ₹{stat.esi_gross_threshold})",
                tax_treatment="tax_free",
                section="employer",
            )
        )

    from .services.tds_calculator import monthly_tds_estimate

    pt = stat.professional_tax_monthly if stat.pt_enabled else Decimal("0")
    taxable_monthly = max(Decimal("0"), employee_gross - employee_pf)
    tds_monthly = monthly_tds_estimate(
        taxable_monthly,
        regime=stat.tds_regime,
        standard_deduction_annual=stat.standard_deduction_annual,
        professional_tax_annual=_q(pt * Decimal("12")),
        include_cess=stat.include_cess_on_tds_estimate,
    )

    deductions: list[dict[str, Any]] = []
    if stat.pf_enabled and employee_pf > Decimal("0"):
        deductions.append(
            _line(
                "PF",
                "Employee PF (EPF)",
                employee_pf,
                formula=f"{stat.pf_employee_percent}% × ({pf_formula_base})"
                + (f", ceiling ₹{stat.pf_monthly_wage_ceiling}" if stat.pf_ceiling_enabled else ""),
                tax_treatment="deduction",
                section="deduction",
            )
        )
    if stat.esi_enabled and employee_esi > Decimal("0"):
        deductions.append(
            _line(
                "ESI",
                "Employee ESIC",
                employee_esi,
                formula=f"{stat.esi_employee_percent}% × gross (≤ ₹{stat.esi_gross_threshold})",
                tax_treatment="deduction",
                section="deduction",
            )
        )
    if stat.pt_enabled and pt > Decimal("0"):
        deductions.append(
            _line("PT", "Professional tax", pt, formula="State slab / month", tax_treatment="deduction", section="deduction")
        )
    if stat.tds_enabled:
        deductions.append(
            _line(
                "TDS",
                "TDS (income tax)",
                tds_monthly,
                formula=f"FY26 {stat.tds_regime} regime · nil if taxable ≤ ₹12L",
                tax_treatment="deduction",
                section="deduction",
            )
        )
    else:
        tds_monthly = Decimal("0")

    total_deductions = _q(employee_pf + employee_esi + pt + tds_monthly)
    net_take_home = _q(employee_gross - total_deductions)

    return {
        "annual_ctc": str(_q(annual_ctc)),
        "monthly_ctc": str(monthly_ctc),
        "gross_salary_monthly": str(employee_gross),
        "gross_salary_annual": str(_q(employee_gross * Decimal("12"))),
        "employer_cost_monthly": str(employer_total),
        "net_take_home_monthly": str(net_take_home),
        "ctc_reconciliation": str(_q(employee_gross + employer_total)),
        "earnings": earnings,
        "employer": employer,
        "deductions": deductions,
        "total_earnings_monthly": str(employee_gross),
        "total_deductions_monthly": str(total_deductions),
        "warnings": warnings,
        "skipped_allowances": skipped_allowances,
        "active_includes": active_includes_dict(tpl),
        "basic_plus_da_pct": str(tpl.basic_pct_of_ctc + tpl.da_pct_of_ctc),
        "formula_summary": (
            f"CTC = In-hand gross ({employee_gross}) + Employer ({employer_total}); "
            f"Basic {tpl.basic_pct_of_ctc}% + DA {tpl.da_pct_of_ctc}% + HRA {tpl.hra_pct_of_basic}% of Basic + fixed ₹ + special"
        ),
    }


def solve_annual_ctc_from_gross_target(
    monthly_gross_target: Decimal | str,
    template: CtcTemplateValues | None = None,
    statutory: StatutoryValues | None = None,
) -> tuple[Decimal, dict[str, Any]]:
    """
    When HR says "salary is ₹20,000/month" they mean in-hand gross (payslip earnings).
    Find the annual CTC that produces that gross after employer costs and structure.
    """
    target = _q(monthly_gross_target)
    tpl = template or CtcTemplateValues()
    stat = statutory or StatutoryValues()

    lo = _q(target * Decimal("12"))
    hi = _q(target * Decimal("12") * Decimal("2.5"))

    for _ in range(64):
        mid = _q((lo + hi) / Decimal("2"))
        breakup = compute_ctc_breakup(mid, tpl, stat)
        gross = Decimal(breakup["gross_salary_monthly"])
        if gross < target:
            lo = mid
        else:
            hi = mid

    annual = hi
    breakup = compute_ctc_breakup(annual, tpl, stat)
    breakup["input_mode"] = "gross"
    breakup["target_monthly_gross"] = str(target)
    return annual, breakup


def template_from_model(obj) -> CtcTemplateValues:
    if obj is None:
        return CtcTemplateValues()
    return CtcTemplateValues(
        basic_pct_of_ctc=obj.basic_pct_of_ctc,
        da_pct_of_ctc=obj.da_pct_of_ctc,
        hra_pct_of_basic=obj.hra_pct_of_basic,
        variable_pay_pct_of_ctc=obj.variable_pay_pct_of_ctc,
        gratuity_pct_of_basic=obj.gratuity_pct_of_basic,
        health_insurance_pct_of_ctc=obj.health_insurance_pct_of_ctc,
        transport_allowance=obj.transport_allowance,
        cea_monthly=obj.cea_monthly,
        meal_allowance=obj.meal_allowance,
        lta_monthly=obj.lta_monthly,
        mobile_internet=obj.mobile_internet,
        uniform_allowance=obj.uniform_allowance,
        medical_allowance=obj.medical_allowance,
        include_transport=obj.include_transport,
        include_cea=obj.include_cea,
        include_meal=obj.include_meal,
        include_lta=obj.include_lta,
        include_mobile=obj.include_mobile,
        include_uniform=obj.include_uniform,
        include_medical=obj.include_medical,
        include_variable_pay=obj.include_variable_pay,
    )


def statutory_from_config(cfg) -> StatutoryValues:
    if cfg is None:
        return StatutoryValues()
    contribution_type = (
        getattr(cfg, "pf_employee_contribution_type", None)
        or getattr(cfg, "pf_wage_basis", None)
        or "basic_da"
    )
    return StatutoryValues(
        pf_employer_percent=cfg.pf_employer_percent,
        pf_employee_percent=cfg.pf_employee_percent,
        pf_monthly_wage_ceiling=cfg.pf_monthly_wage_ceiling,
        pf_employee_contribution_type=contribution_type,
        pf_ceiling_enabled=getattr(cfg, "pf_ceiling_enabled", True),
        pf_enabled=getattr(cfg, "pf_enabled", True),
        esi_employer_percent=cfg.esi_employer_percent,
        esi_employee_percent=getattr(cfg, "esi_employee_percent", Decimal("0.75")),
        esi_gross_threshold=cfg.esi_gross_threshold,
        esi_enabled=getattr(cfg, "esi_enabled", True),
        pt_enabled=getattr(cfg, "pt_enabled", False),
        professional_tax_monthly=cfg.professional_tax_monthly,
        standard_deduction_annual=cfg.standard_deduction_annual,
        tds_regime=cfg.tds_regime,
        include_cess_on_tds_estimate=cfg.include_cess_on_tds_estimate,
    )
