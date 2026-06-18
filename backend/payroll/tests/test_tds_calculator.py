from decimal import Decimal

from django.test import SimpleTestCase

from payroll.models import TaxRegime
from payroll.services.tds_calculator import (
    annual_income_tax,
    gross_annual_zero_tds_threshold,
    monthly_tds_estimate,
)


class TdsCalculatorTests(SimpleTestCase):
    def test_new_regime_no_tax_below_12l_taxable(self):
        # ₹10L annual gross → ~₹9.25L taxable after ₹75k std deduction
        monthly = Decimal("83333.33")
        tds = monthly_tds_estimate(monthly, regime=TaxRegime.NEW)
        self.assertEqual(tds, Decimal("0.00"))

    def test_new_regime_tax_above_12l_taxable(self):
        # ₹15L annual gross → taxable well above ₹12L
        monthly = Decimal("125000")
        tds = monthly_tds_estimate(monthly, regime=TaxRegime.NEW)
        self.assertGreater(tds, Decimal("0"))

    def test_old_regime_chapter_vi_reduces_tds(self):
        monthly = Decimal("80000")
        without = monthly_tds_estimate(monthly, regime=TaxRegime.OLD, chapter_vi_a_annual=Decimal("0"))
        with_80c = monthly_tds_estimate(
            monthly, regime=TaxRegime.OLD, chapter_vi_a_annual=Decimal("150000")
        )
        self.assertGreater(without, with_80c)

    def test_zero_tds_threshold_new_regime(self):
        self.assertEqual(gross_annual_zero_tds_threshold(TaxRegime.NEW), Decimal("1275000"))

    def test_87a_at_exactly_12l_taxable(self):
        tax = annual_income_tax(Decimal("1200000"), regime=TaxRegime.NEW, include_cess=True)
        self.assertEqual(tax, Decimal("0.00"))
