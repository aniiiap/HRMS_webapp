from decimal import Decimal

from django.db import migrations


def seed_org_payroll(apps, schema_editor):
    Organization = apps.get_model("employees", "Organization")
    PayrollComponent = apps.get_model("payroll", "PayrollComponent")
    PayrollStatutoryConfig = apps.get_model("payroll", "PayrollStatutoryConfig")

    components = [
        {
            "code": "BASIC",
            "name": "Basic salary",
            "category": "basic_structure",
            "kind": "earning",
            "taxable": True,
            "pf_wage_part": True,
            "esi_wage_part": True,
            "prorate_with_attendance": True,
            "is_system": True,
        },
        {
            "code": "HRA",
            "name": "House rent allowance",
            "category": "recurring",
            "kind": "earning",
            "taxable": True,
            "pf_wage_part": False,
            "esi_wage_part": True,
            "prorate_with_attendance": True,
            "is_system": True,
        },
        {
            "code": "SPECIAL_ALLOWANCE",
            "name": "Special allowance",
            "category": "recurring",
            "kind": "earning",
            "taxable": True,
            "pf_wage_part": True,
            "esi_wage_part": True,
            "prorate_with_attendance": True,
            "is_system": True,
        },
    ]

    for org in Organization.objects.all():
        PayrollStatutoryConfig.objects.get_or_create(
            organization_id=org.pk,
            defaults={
                "pf_enabled": True,
                "pf_employee_percent": Decimal("12.00"),
                "pf_employer_percent": Decimal("12.00"),
                "pf_monthly_wage_ceiling": Decimal("15000.00"),
                "esi_enabled": True,
                "esi_employee_percent": Decimal("0.75"),
                "esi_employer_percent": Decimal("3.25"),
                "esi_gross_threshold": Decimal("21000.00"),
                "esi_basis": "gross",
                "professional_tax_monthly": Decimal("200.00"),
                "tds_regime": "old",
                "standard_deduction_annual": Decimal("50000.00"),
                "include_cess_on_tds_estimate": True,
            },
        )
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
        ("payroll", "0002_full_payroll_module"),
    ]

    operations = [
        migrations.RunPython(seed_org_payroll, noop_reverse),
    ]
