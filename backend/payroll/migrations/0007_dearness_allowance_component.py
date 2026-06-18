from django.db import migrations


def seed_da_component(apps, schema_editor):
    Organization = apps.get_model("employees", "Organization")
    PayrollComponent = apps.get_model("payroll", "PayrollComponent")

    row = {
        "code": "DEARNESS_ALLOWANCE",
        "name": "Dearness allowance (DA)",
        "category": "basic_structure",
        "kind": "earning",
        "taxable": True,
        "pf_wage_part": True,
        "esi_wage_part": True,
        "prorate_with_attendance": True,
        "is_system": True,
    }

    for org in Organization.objects.all():
        PayrollComponent.objects.get_or_create(
            organization_id=org.pk,
            code=row["code"],
            defaults={**row, "organization_id": org.pk},
        )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("payroll", "0006_seed_india_standard_payroll_components"),
    ]

    operations = [
        migrations.RunPython(seed_da_component, noop_reverse),
    ]
