from django.db import migrations


def seed_india_standard_components(apps, schema_editor):
    Organization = apps.get_model("employees", "Organization")
    PayrollComponent = apps.get_model("payroll", "PayrollComponent")

    components = [
        {
            "code": "LTA",
            "name": "Leave travel allowance (LTA)",
            "category": "recurring",
            "kind": "earning",
            "taxable": True,
            "pf_wage_part": False,
            "esi_wage_part": True,
            "prorate_with_attendance": True,
            "is_system": True,
        },
        {
            "code": "CEA",
            "name": "Children education allowance (CEA)",
            "category": "recurring",
            "kind": "earning",
            "taxable": False,
            "pf_wage_part": False,
            "esi_wage_part": True,
            "prorate_with_attendance": True,
            "is_system": True,
        },
        {
            "code": "MEAL_ALLOWANCE",
            "name": "Meal / food allowance",
            "category": "recurring",
            "kind": "earning",
            "taxable": False,
            "pf_wage_part": False,
            "esi_wage_part": True,
            "prorate_with_attendance": True,
            "is_system": True,
        },
        {
            "code": "MOBILE_INTERNET",
            "name": "Mobile / internet reimbursement",
            "category": "adhoc",
            "kind": "earning",
            "taxable": False,
            "pf_wage_part": False,
            "esi_wage_part": False,
            "prorate_with_attendance": False,
            "is_system": True,
        },
        {
            "code": "UNIFORM_ALLOWANCE",
            "name": "Uniform / dress allowance",
            "category": "adhoc",
            "kind": "earning",
            "taxable": False,
            "pf_wage_part": False,
            "esi_wage_part": False,
            "prorate_with_attendance": False,
            "is_system": True,
        },
        {
            "code": "VARIABLE_PAY",
            "name": "Variable / performance pay",
            "category": "variable",
            "kind": "earning",
            "taxable": True,
            "pf_wage_part": False,
            "esi_wage_part": True,
            "prorate_with_attendance": False,
            "is_system": True,
        },
        {
            "code": "CONVEYANCE",
            "name": "Conveyance allowance",
            "category": "recurring",
            "kind": "earning",
            "taxable": True,
            "pf_wage_part": False,
            "esi_wage_part": True,
            "prorate_with_attendance": True,
            "is_system": True,
        },
        {
            "code": "BONUS",
            "name": "Bonus",
            "category": "adhoc",
            "kind": "earning",
            "taxable": True,
            "pf_wage_part": False,
            "esi_wage_part": True,
            "prorate_with_attendance": False,
            "is_system": True,
        },
        {
            "code": "INCENTIVE",
            "name": "Incentive",
            "category": "variable",
            "kind": "earning",
            "taxable": True,
            "pf_wage_part": False,
            "esi_wage_part": True,
            "prorate_with_attendance": False,
            "is_system": True,
        },
        {
            "code": "OVERTIME",
            "name": "Overtime",
            "category": "variable",
            "kind": "earning",
            "taxable": True,
            "pf_wage_part": False,
            "esi_wage_part": True,
            "prorate_with_attendance": False,
            "is_system": True,
        },
        {
            "code": "ARREARS",
            "name": "Arrears",
            "category": "adhoc",
            "kind": "earning",
            "taxable": True,
            "pf_wage_part": False,
            "esi_wage_part": True,
            "prorate_with_attendance": False,
            "is_system": True,
        },
        {
            "code": "PF",
            "name": "Provident Fund (employee)",
            "category": "statutory",
            "kind": "deduction",
            "taxable": False,
            "pf_wage_part": False,
            "esi_wage_part": False,
            "prorate_with_attendance": False,
            "is_system": True,
        },
        {
            "code": "ESI",
            "name": "Employee State Insurance (ESI)",
            "category": "statutory",
            "kind": "deduction",
            "taxable": False,
            "pf_wage_part": False,
            "esi_wage_part": False,
            "prorate_with_attendance": False,
            "is_system": True,
        },
        {
            "code": "PT",
            "name": "Professional tax",
            "category": "statutory",
            "kind": "deduction",
            "taxable": False,
            "pf_wage_part": False,
            "esi_wage_part": False,
            "prorate_with_attendance": False,
            "is_system": True,
        },
        {
            "code": "TDS",
            "name": "TDS (income tax)",
            "category": "statutory",
            "kind": "deduction",
            "taxable": False,
            "pf_wage_part": False,
            "esi_wage_part": False,
            "prorate_with_attendance": False,
            "is_system": True,
        },
        {
            "code": "LOAN_RECOVERY",
            "name": "Loan recovery",
            "category": "statutory",
            "kind": "deduction",
            "taxable": False,
            "pf_wage_part": False,
            "esi_wage_part": False,
            "prorate_with_attendance": False,
            "is_system": True,
        },
        {
            "code": "SALARY_ADVANCE",
            "name": "Salary advance recovery",
            "category": "statutory",
            "kind": "deduction",
            "taxable": False,
            "pf_wage_part": False,
            "esi_wage_part": False,
            "prorate_with_attendance": False,
            "is_system": True,
        },
    ]

    for org in Organization.objects.all():
        for row in components:
            PayrollComponent.objects.get_or_create(
                organization_id=org.pk,
                code=row["code"],
                defaults={**row, "organization_id": org.pk},
            )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("payroll", "0005_compensation_and_run_statuses"),
    ]

    operations = [
        migrations.RunPython(seed_india_standard_components, noop_reverse),
    ]
