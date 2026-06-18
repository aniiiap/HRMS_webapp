"""India income-tax TDS estimates (FY 2025-26).

Slab rates and Section 87A rebate per Union Budget 2025 (new regime default).
Simplified projection: annualize monthly taxable salary, spread tax ÷ 12.
Not a substitute for CA-reviewed payroll tax software or Form 16.
"""

from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP

from ..models import TaxRegime

Q2 = Decimal("0.01")

# FY 2025-26 — standard deduction under Section 16 (salary)
STANDARD_DEDUCTION_NEW = Decimal("75000")
STANDARD_DEDUCTION_OLD = Decimal("75000")

# Section 87A rebate caps
REBATE_87A_NEW_CAP = Decimal("60000")
REBATE_87A_NEW_INCOME_LIMIT = Decimal("1200000")
REBATE_87A_OLD_CAP = Decimal("12500")
REBATE_87A_OLD_INCOME_LIMIT = Decimal("500000")

CESS_RATE = Decimal("0.04")


def _q(v: Decimal | int | float | str | None) -> Decimal:
    if v is None:
        d = Decimal("0")
    elif isinstance(v, Decimal):
        d = v
    else:
        d = Decimal(str(v))
    return d.quantize(Q2, rounding=ROUND_HALF_UP)


def _slab_tax(taxable: Decimal, slabs: list[tuple[Decimal, Decimal]]) -> Decimal:
    """Progressive tax on positive taxable income."""
    t = max(Decimal("0"), taxable)
    tax = Decimal("0")
    remaining = t
    prev = Decimal("0")
    for cap, rate in slabs:
        width = cap - prev
        chunk = min(remaining, width)
        tax += chunk * rate
        remaining -= chunk
        if remaining <= 0:
            break
        prev = cap
    if remaining > 0:
        _, last_rate = slabs[-1]
        tax += remaining * last_rate
    return tax


# New regime FY 2025-26 (resident individual)
_NEW_REGIME_SLABS: list[tuple[Decimal, Decimal]] = [
    (Decimal("400000"), Decimal("0")),
    (Decimal("800000"), Decimal("0.05")),
    (Decimal("1200000"), Decimal("0.10")),
    (Decimal("1600000"), Decimal("0.15")),
    (Decimal("2000000"), Decimal("0.20")),
    (Decimal("2400000"), Decimal("0.25")),
    (Decimal("999999999"), Decimal("0.30")),
]

# Old regime FY 2025-26
_OLD_REGIME_SLABS: list[tuple[Decimal, Decimal]] = [
    (Decimal("250000"), Decimal("0")),
    (Decimal("500000"), Decimal("0.05")),
    (Decimal("1000000"), Decimal("0.20")),
    (Decimal("999999999"), Decimal("0.30")),
]


def _apply_rebate_87a(tax: Decimal, taxable_income: Decimal, regime: str) -> Decimal:
    if regime == TaxRegime.NEW:
        if taxable_income <= REBATE_87A_NEW_INCOME_LIMIT:
            return max(Decimal("0"), tax - min(tax, REBATE_87A_NEW_CAP))
    else:
        if taxable_income <= REBATE_87A_OLD_INCOME_LIMIT:
            return max(Decimal("0"), tax - min(tax, REBATE_87A_OLD_CAP))
    return tax


def annual_income_tax(
    taxable_annual: Decimal,
    *,
    regime: str = TaxRegime.NEW,
    include_cess: bool = True,
) -> Decimal:
    """Tax on annual taxable income after standard deduction & Chapter VI-A."""
    taxable = max(Decimal("0"), taxable_annual)
    slabs = _NEW_REGIME_SLABS if regime == TaxRegime.NEW else _OLD_REGIME_SLABS
    tax = _slab_tax(taxable, slabs)
    tax = _apply_rebate_87a(tax, taxable, regime)
    if include_cess and tax > 0:
        tax *= Decimal("1") + CESS_RATE
    return _q(tax)


def standard_deduction_for_regime(regime: str, configured: Decimal | None = None) -> Decimal:
    if configured is not None and configured > 0:
        return _q(configured)
    return STANDARD_DEDUCTION_NEW if regime == TaxRegime.NEW else STANDARD_DEDUCTION_OLD


def monthly_tds_estimate(
    taxable_monthly: Decimal,
    *,
    regime: str = TaxRegime.NEW,
    standard_deduction_annual: Decimal | None = None,
    chapter_vi_a_annual: Decimal = Decimal("0"),
    professional_tax_annual: Decimal = Decimal("0"),
    include_cess: bool = True,
) -> Decimal:
    """
    Project monthly TDS from one month's taxable earnings.

    taxable_monthly: prorated taxable gross minus employee PF (if PF is pre-tax).
    chapter_vi_a: only meaningful for old regime (80C, 80D, etc.).
    """
    annual_gross_taxable = _q(taxable_monthly * Decimal("12"))
    std = standard_deduction_for_regime(regime, standard_deduction_annual)
    deductions = std
    if regime == TaxRegime.OLD:
        deductions += _q(chapter_vi_a_annual)
    deductions += _q(professional_tax_annual)
    annual_taxable = max(Decimal("0"), annual_gross_taxable - deductions)
    annual_tax = annual_income_tax(annual_taxable, regime=regime, include_cess=include_cess)
    if annual_tax <= 0:
        return Decimal("0")
    return _q(annual_tax / Decimal("12"))


def gross_annual_zero_tds_threshold(regime: str = TaxRegime.NEW) -> Decimal:
    """Approximate annual gross above which TDS typically starts (after std deduction)."""
    if regime == TaxRegime.NEW:
        return REBATE_87A_NEW_INCOME_LIMIT + STANDARD_DEDUCTION_NEW
    return REBATE_87A_OLD_INCOME_LIMIT + STANDARD_DEDUCTION_OLD
