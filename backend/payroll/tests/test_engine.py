from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase

from employees.models import Employee, Organization

from .models import (
    EmployeeSalaryLine,
    PayrollComponent,
    PayrollComponentCategory,
    PayrollComponentKind,
    PayrollEmployeeResult,
    PayrollRun,
    PayrollStatutoryConfig,
    SalaryCalculationMode,
)
from .services.engine import compute_employee_payroll, recalculate_run, resolve_monthly_amounts

User = get_user_model()


class PayrollEngineTests(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(name="Acme", slug="acme-test")
        self.stat, _ = PayrollStatutoryConfig.objects.get_or_create(
            organization=self.org,
            defaults={},
        )
        self.user = User.objects.create_user(email="e1@example.com", password="x", first_name="A", last_name="B")
        self.employee = Employee.objects.create(
            user=self.user,
            organization=self.org,
            employee_code="EMP-T1",
        )
        self.basic = PayrollComponent.objects.create(
            organization=self.org,
            code="BASIC",
            name="Basic",
            category=PayrollComponentCategory.BASIC_STRUCTURE,
            kind=PayrollComponentKind.EARNING,
            taxable=True,
            pf_wage_part=True,
            esi_wage_part=True,
            is_system=False,
        )
        self.hra = PayrollComponent.objects.create(
            organization=self.org,
            code="HRA",
            name="HRA",
            category=PayrollComponentCategory.RECURRING,
            kind=PayrollComponentKind.EARNING,
            taxable=True,
            pf_wage_part=False,
            esi_wage_part=True,
            is_system=False,
        )
        EmployeeSalaryLine.objects.create(
            employee=self.employee,
            component=self.basic,
            calculation_mode=SalaryCalculationMode.FIXED,
            monthly_amount=Decimal("30000"),
            effective_from=date(2025, 1, 1),
            sort_order=1,
        )
        EmployeeSalaryLine.objects.create(
            employee=self.employee,
            component=self.hra,
            calculation_mode=SalaryCalculationMode.PERCENT_BASIC,
            monthly_amount=Decimal("0"),
            percent_of_basic=Decimal("40"),
            effective_from=date(2025, 1, 1),
            sort_order=2,
        )

    def test_resolve_monthly_amounts_percent_basic(self):
        lines = list(EmployeeSalaryLine.objects.filter(employee=self.employee).order_by("sort_order"))
        basic, amounts = resolve_monthly_amounts(lines)
        self.assertEqual(basic, Decimal("30000"))
        self.assertEqual(amounts[self.basic.id], Decimal("30000"))
        self.assertEqual(amounts[self.hra.id], Decimal("12000"))

    def test_compute_proration_and_pf(self):
        run = PayrollRun.objects.create(
            organization=self.org,
            period_year=2026,
            period_month=5,
            working_days=22,
        )
        res = PayrollEmployeeResult.objects.create(
            run=run,
            employee=self.employee,
            paid_days=Decimal("11"),
            lop_days=Decimal("11"),
        )
        compute_employee_payroll(res, self.stat)
        res.refresh_from_db()
        self.assertEqual(res.gross_monthly_full, Decimal("42000.00"))
        self.assertEqual(res.gross_prorated, Decimal("21000.00"))
        self.assertGreater(res.pf_employee, Decimal("0"))

    def test_recalculate_run(self):
        run = PayrollRun.objects.create(
            organization=self.org,
            period_year=2026,
            period_month=4,
            working_days=22,
        )
        PayrollEmployeeResult.objects.create(
            run=run,
            employee=self.employee,
            paid_days=Decimal("22"),
            lop_days=Decimal("0"),
        )
        n = recalculate_run(run)
        self.assertEqual(n, 1)
        res = run.employee_results.first()
        self.assertGreater(res.net_pay, Decimal("0"))
