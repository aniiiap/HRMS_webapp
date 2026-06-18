from decimal import Decimal

from django.test import TestCase

from payroll.ctc_calculator import CtcTemplateValues, StatutoryValues, compute_ctc_breakup
from payroll.services.statutory_preview import (
    compute_pf_contributions,
    resolve_pf_wage_preview,
)


class PfWagePreviewTests(TestCase):
    def test_basic_only_contribution_type(self):
        wage = resolve_pf_wage_preview(basic=40000, da=10000, special=5000, basis="basic")
        self.assertEqual(wage, Decimal("40000.00"))

    def test_basic_special_contribution_type(self):
        wage = resolve_pf_wage_preview(basic=40000, da=10000, special=5000, basis="basic_special")
        self.assertEqual(wage, Decimal("45000.00"))

    def test_basic_da_contribution_type(self):
        wage = resolve_pf_wage_preview(basic=40000, da=10000, special=5000, basis="basic_da")
        self.assertEqual(wage, Decimal("50000.00"))

    def test_pf_ceiling_applied(self):
        ee, er, base = compute_pf_contributions(
            Decimal("50000"),
            employee_percent=Decimal("12"),
            employer_percent=Decimal("12"),
            ceiling=Decimal("15000"),
            ceiling_enabled=True,
            enabled=True,
        )
        self.assertEqual(base, Decimal("15000.00"))
        self.assertEqual(ee, Decimal("1800.00"))
        self.assertEqual(er, Decimal("1800.00"))

    def test_ctc_breakup_uses_contribution_type_not_hardcoded_basic_da(self):
        stat = StatutoryValues(
            pf_employee_contribution_type="basic",
            pf_ceiling_enabled=False,
            pf_enabled=True,
        )
        tpl = CtcTemplateValues(include_employer_pf=False, include_employer_esi=False, include_gratuity_provision=False, include_group_health=False)
        result = compute_ctc_breakup(Decimal("1200000"), tpl, stat)
        pf_line = next(l for l in result["deductions"] if l["code"] == "PF")
        basic = Decimal(next(l for l in result["earnings"] if l["code"] == "BASIC")["monthly"])
        expected = (basic * Decimal("12") / Decimal("100")).quantize(Decimal("0.01"))
        self.assertEqual(Decimal(pf_line["monthly"]), expected)
