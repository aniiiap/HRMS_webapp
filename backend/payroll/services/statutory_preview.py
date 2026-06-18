"""Shared PF/ESI wage and contribution math for preview + pay engine."""

from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from typing import Any

Q2 = Decimal("0.01")

PF_BASIS_CODE_SETS: dict[str, set[str]] = {
    "basic": {"BASIC"},
    "basic_special": {"BASIC", "SPECIAL_ALLOWANCE", "SPECIAL"},
    "basic_da": {"BASIC", "DA", "DEARNESS_ALLOWANCE"},
}


def _q(v: Decimal | int | float | str | None) -> Decimal:
    if v is None:
        d = Decimal("0")
    elif isinstance(v, Decimal):
        d = v
    else:
        d = Decimal(str(v))
    return d.quantize(Q2, rounding=ROUND_HALF_UP)


def resolve_pf_wage_from_codes(
    amounts_by_code: dict[str, Decimal | int | float | str],
    basis: str | None,
) -> Decimal:
    """Sum component amounts for the selected PF contribution type."""
    selected = (basis or "basic_da").strip().lower()
    codes = PF_BASIS_CODE_SETS.get(selected)
    if not codes:
        return _q(sum(Decimal(str(v)) for v in amounts_by_code.values()))
    total = Decimal("0")
    normalized = {(k or "").upper(): Decimal(str(v)) for k, v in amounts_by_code.items()}
    for code in codes:
        total += normalized.get(code, Decimal("0"))
    return _q(total)


def resolve_pf_wage_preview(
    *,
    basic: Decimal | int | float | str,
    da: Decimal | int | float | str = 0,
    special: Decimal | int | float | str = 0,
    basis: str | None = "basic_da",
) -> Decimal:
    """PF wage for CTC preview when only Basic / DA / Special are known."""
    return resolve_pf_wage_from_codes(
        {
            "BASIC": basic,
            "DA": da,
            "DEARNESS_ALLOWANCE": da,
            "SPECIAL_ALLOWANCE": special,
            "SPECIAL": special,
        },
        basis,
    )


def apply_pf_ceiling(
    pf_wage: Decimal,
    ceiling: Decimal,
    *,
    ceiling_enabled: bool = True,
) -> Decimal:
    if ceiling_enabled:
        return min(_q(pf_wage), _q(ceiling))
    return _q(pf_wage)


def compute_pf_contributions(
    pf_wage: Decimal,
    *,
    employee_percent: Decimal | int | float | str,
    employer_percent: Decimal | int | float | str,
    ceiling: Decimal | int | float | str,
    ceiling_enabled: bool = True,
    enabled: bool = True,
) -> tuple[Decimal, Decimal, Decimal]:
    """Return (employee_pf, employer_pf, pf_base_after_ceiling)."""
    if not enabled:
        return Decimal("0"), Decimal("0"), Decimal("0")
    base = apply_pf_ceiling(pf_wage, _q(ceiling), ceiling_enabled=ceiling_enabled)
    ee = _q(base * _q(employee_percent) / Decimal("100"))
    er = _q(base * _q(employer_percent) / Decimal("100"))
    return ee, er, base


def compute_esi_contributions(
    esi_base: Decimal,
    *,
    employee_percent: Decimal | int | float | str,
    employer_percent: Decimal | int | float | str,
    threshold: Decimal | int | float | str,
    enabled: bool = True,
) -> tuple[Decimal, Decimal]:
    if not enabled or _q(esi_base) > _q(threshold):
        return Decimal("0"), Decimal("0")
    base = _q(esi_base)
    ee = _q(base * _q(employee_percent) / Decimal("100"))
    er = _q(base * _q(employer_percent) / Decimal("100"))
    return ee, er


def pf_basis_label(basis: str | None) -> str:
    labels = {
        "basic": "Basic",
        "basic_special": "Basic + Special Allowance",
        "basic_da": "Basic + DA",
    }
    return labels.get((basis or "basic_da").strip().lower(), "Basic + DA")


def statutory_snapshot_fields(cfg: Any) -> dict[str, Any]:
    """JSON-serializable statutory fields for audit revisions."""
    return {
        "pay_cycle_start_day": cfg.pay_cycle_start_day,
        "pay_cycle_end_day": cfg.pay_cycle_end_day,
        "pf_enabled": cfg.pf_enabled,
        "pf_wage_basis": cfg.pf_wage_basis,
        "pf_employee_contribution_type": cfg.pf_employee_contribution_type,
        "pf_ceiling_enabled": cfg.pf_ceiling_enabled,
        "pf_employee_percent": str(cfg.pf_employee_percent),
        "pf_employer_percent": str(cfg.pf_employer_percent),
        "pf_monthly_wage_ceiling": str(cfg.pf_monthly_wage_ceiling),
        "esi_enabled": cfg.esi_enabled,
        "esi_employee_percent": str(cfg.esi_employee_percent),
        "esi_employer_percent": str(cfg.esi_employer_percent),
        "esi_gross_threshold": str(cfg.esi_gross_threshold),
        "esi_basis": cfg.esi_basis,
        "pt_enabled": cfg.pt_enabled,
        "professional_tax_monthly": str(cfg.professional_tax_monthly),
        "tds_regime": cfg.tds_regime,
        "standard_deduction_annual": str(cfg.standard_deduction_annual),
        "include_cess_on_tds_estimate": cfg.include_cess_on_tds_estimate,
        "company_bank_name": cfg.company_bank_name,
        "company_account_holder": cfg.company_account_holder,
        "company_account_number": cfg.company_account_number,
        "company_ifsc": cfg.company_ifsc,
    }
