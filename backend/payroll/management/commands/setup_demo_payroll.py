import datetime
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from accounts.models import UserRole
from employees.models import Employee, Organization
from payroll.models import (
    PayrollComponent,
    PayrollComponentCategory,
    PayrollComponentKind,
    PayrollCtcTemplate,
    PayrollSalaryStructure,
    PayrollStatutoryConfig,
    EmployeeCompensation,
    PayrollRun,
    PayrollEmployeeResult,
    SalaryCalculationMode,
    StructureLineSection
)
from payroll.services.engine import recalculate_run
from payroll.services.paid_days import apply_auto_paid_days_to_result
from payroll.services.structure_builder import apply_compensation_revision

User = get_user_model()

class Command(BaseCommand):
    help = "Sets up a demo payroll environment with Kredily-style structures."

    def handle(self, *args, **options):
        self.stdout.write("Starting demo payroll setup...")

        # 1. Create Organization
        org, created = Organization.objects.get_or_create(
            slug="demo-corp",
            defaults={"name": "Demo Corp"}
        )
        self.stdout.write(f"Organization 'Demo Corp' {'created' if created else 'found'}.")

        # 2. Create Users & Employees
        hr_user, _ = User.objects.get_or_create(
            email="hr@democorp.com",
            defaults={"first_name": "Demo", "last_name": "HR", "role": UserRole.HR, "is_staff": True}
        )
        if not hr_user.check_password("password123"):
            hr_user.set_password("password123")
            hr_user.save()
        
        hr_emp, _ = Employee.objects.get_or_create(
            user=hr_user,
            organization=org,
            defaults={"employee_code": "DEMO-HR-001", "date_of_joining": datetime.date(2020, 1, 1)}
        )

        emp_user, _ = User.objects.get_or_create(
            email="employee@democorp.com",
            defaults={"first_name": "John", "last_name": "Doe", "role": UserRole.EMPLOYEE}
        )
        if not emp_user.check_password("password123"):
            emp_user.set_password("password123")
            emp_user.save()
            
        emp, _ = Employee.objects.get_or_create(
            user=emp_user,
            organization=org,
            defaults={"employee_code": "DEMO-EMP-002", "date_of_joining": datetime.date(2023, 6, 1)}
        )

        self.stdout.write("Employees created: hr@democorp.com, employee@democorp.com")

        # 3. Setup Statutory Config
        stat, _ = PayrollStatutoryConfig.objects.get_or_create(
            organization=org,
            defaults={
                "pf_enabled": True,
                "esi_enabled": True,
                "pt_enabled": True,
                "pf_monthly_wage_ceiling": Decimal("15000.00"),
                "esi_gross_threshold": Decimal("21000.00"),
                "professional_tax_monthly": Decimal("200.00")
            }
        )
        self.stdout.write("Statutory configuration set.")

        # 4. Setup Components & Structure
        basic, _ = PayrollComponent.objects.get_or_create(
            organization=org, code="basic", defaults={
                "name": "Basic", "category": PayrollComponentCategory.BASIC_STRUCTURE, "kind": PayrollComponentKind.EARNING,
                "taxable": True, "pf_wage_part": True, "esi_wage_part": True
            }
        )
        hra, _ = PayrollComponent.objects.get_or_create(
            organization=org, code="hra", defaults={
                "name": "HRA", "category": PayrollComponentCategory.RECURRING, "kind": PayrollComponentKind.EARNING,
                "taxable": True, "pf_wage_part": False, "esi_wage_part": True
            }
        )
        special, _ = PayrollComponent.objects.get_or_create(
            organization=org, code="special_allowance", defaults={
                "name": "Special Allowance", "category": PayrollComponentCategory.RECURRING, "kind": PayrollComponentKind.EARNING,
                "taxable": True, "pf_wage_part": False, "esi_wage_part": True
            }
        )

        structure, _ = PayrollSalaryStructure.objects.get_or_create(
            organization=org, name="Default Structure", defaults={"is_company_default": True}
        )
        
        # Add lines if not exist
        if not structure.lines.exists():
            structure.lines.create(component_name="Basic", section=StructureLineSection.EARNING, formula="BASIC_FORMULA", system_calculated=True, sort_order=1)
            structure.lines.create(component_name="HRA", section=StructureLineSection.EARNING, formula="HRA_FORMULA", system_calculated=True, sort_order=2)
            structure.lines.create(component_name="Special Allowance", section=StructureLineSection.EARNING, formula="SPECIAL_ALLOWANCE_FORMULA", system_calculated=True, sort_order=3)
            structure.lines.create(component_name="PF (Employee)", section=StructureLineSection.DEDUCTION, formula="PF_FORMULA", system_calculated=True, sort_order=10)

        # 5. Apply Compensation Revision
        self.stdout.write("Applying compensation to Employee...")
        comp = apply_compensation_revision(
            emp,
            monthly_gross=Decimal("45000.00"),
            annual_ctc=Decimal("540000.00"),
            ctc_type="gross",
            effective_from=datetime.date(2025, 1, 1),
            user=hr_user,
            note="Initial Demo CTC",
            generate_structure=True
        )
        comp.salary_structure = structure
        comp.save()

        # 6. Create Payroll Run for Current Month
        now = timezone.now()
        year = now.year
        month = now.month
        
        run, run_created = PayrollRun.objects.get_or_create(
            organization=org, period_year=year, period_month=month,
            defaults={"working_days": 22, "status": "draft"}
        )
        
        res, _ = PayrollEmployeeResult.objects.get_or_create(
            run=run, employee=emp, defaults={"paid_days": Decimal("22"), "lop_days": Decimal("0")}
        )
        
        apply_auto_paid_days_to_result(res, force=True)
        recalculate_run(run)
        
        self.stdout.write(f"Payroll Run for {year}-{month} created and calculated.")
        self.stdout.write(self.style.SUCCESS("Demo setup complete!"))
