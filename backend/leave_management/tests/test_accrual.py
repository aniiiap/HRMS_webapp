from datetime import date
from decimal import Decimal
from types import SimpleNamespace

from django.test import SimpleTestCase

from leave_management.leave_rules import accrual_fraction, quota_for_rule


def _rule(**kwargs):
    defaults = dict(
        is_active=True,
        code="paid_leave",
        annual_quota=Decimal("12"),
        accrual_basis=True,
        present_day_basis=False,
        accrual_frequency="monthly",
        accrual_period="start",
        allowed_under_probation=False,
        probation_quota=None,
    )
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


class AccrualFractionTests(SimpleTestCase):
    def test_no_accrual_basis_returns_full_quota(self):
        rule = _rule(accrual_basis=False)
        self.assertEqual(quota_for_rule(rule, as_of=date(2026, 3, 15)), 12.0)

    def test_monthly_start_march(self):
        rule = _rule(accrual_frequency="monthly", accrual_period="start")
        self.assertAlmostEqual(accrual_fraction(rule, date(2026, 3, 1)), 3 / 12)
        self.assertEqual(quota_for_rule(rule, as_of=date(2026, 3, 1)), 3.0)

    def test_monthly_end_march_before_month_end(self):
        rule = _rule(accrual_frequency="monthly", accrual_period="end")
        self.assertAlmostEqual(accrual_fraction(rule, date(2026, 3, 15)), 2 / 12)
        self.assertEqual(quota_for_rule(rule, as_of=date(2026, 3, 15)), 2.0)

    def test_monthly_end_march_on_last_day(self):
        rule = _rule(accrual_frequency="monthly", accrual_period="end")
        self.assertAlmostEqual(accrual_fraction(rule, date(2026, 3, 31)), 3 / 12)
        self.assertEqual(quota_for_rule(rule, as_of=date(2026, 3, 31)), 3.0)

    def test_halfyearly_start_first_half(self):
        rule = _rule(accrual_frequency="halfyearly", accrual_period="start")
        self.assertEqual(accrual_fraction(rule, date(2026, 4, 10)), 0.5)
        self.assertEqual(quota_for_rule(rule, as_of=date(2026, 4, 10)), 6.0)

    def test_halfyearly_start_second_half(self):
        rule = _rule(accrual_frequency="halfyearly", accrual_period="start")
        self.assertEqual(accrual_fraction(rule, date(2026, 9, 1)), 1.0)
        self.assertEqual(quota_for_rule(rule, as_of=date(2026, 9, 1)), 12.0)

    def test_halfyearly_end_before_h1_close(self):
        rule = _rule(accrual_frequency="halfyearly", accrual_period="end")
        self.assertEqual(accrual_fraction(rule, date(2026, 5, 1)), 0.0)
        self.assertEqual(quota_for_rule(rule, as_of=date(2026, 5, 1)), 0.0)

    def test_halfyearly_end_after_h1_close(self):
        rule = _rule(accrual_frequency="halfyearly", accrual_period="end")
        self.assertEqual(accrual_fraction(rule, date(2026, 7, 1)), 0.5)
        self.assertEqual(quota_for_rule(rule, as_of=date(2026, 7, 1)), 6.0)

    def test_yearly_start(self):
        rule = _rule(accrual_frequency="yearly", accrual_period="start")
        self.assertEqual(accrual_fraction(rule, date(2026, 1, 1)), 1.0)
        self.assertEqual(quota_for_rule(rule, as_of=date(2026, 1, 1)), 12.0)

    def test_yearly_end_before_dec_31(self):
        rule = _rule(accrual_frequency="yearly", accrual_period="end")
        self.assertEqual(accrual_fraction(rule, date(2026, 11, 1)), 0.0)
        self.assertEqual(quota_for_rule(rule, as_of=date(2026, 11, 1)), 0.0)

    def test_yearly_end_on_dec_31(self):
        rule = _rule(accrual_frequency="yearly", accrual_period="end")
        self.assertEqual(accrual_fraction(rule, date(2026, 12, 31)), 1.0)
        self.assertEqual(quota_for_rule(rule, as_of=date(2026, 12, 31)), 12.0)
