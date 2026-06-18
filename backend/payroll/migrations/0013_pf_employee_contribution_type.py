from django.db import migrations, models


def backfill_contribution_type(apps, schema_editor):
    PayrollStatutoryConfig = apps.get_model("payroll", "PayrollStatutoryConfig")
    for row in PayrollStatutoryConfig.objects.all().iterator():
        row.pf_employee_contribution_type = row.pf_wage_basis or "basic_da"
        row.save(update_fields=["pf_employee_contribution_type"])


class Migration(migrations.Migration):
    dependencies = [
        ("payroll", "0012_salary_structures_and_payout"),
    ]

    operations = [
        migrations.AddField(
            model_name="payrollstatutoryconfig",
            name="pf_employee_contribution_type",
            field=models.CharField(
                choices=[
                    ("basic", "Basic × 12%"),
                    ("basic_special", "(Basic + Special Allowance) × 12%"),
                    ("basic_da", "(Basic + DA) × 12%"),
                ],
                default="basic_da",
                help_text="Kredily-style employee contribution type selector for PF basis.",
                max_length=20,
            ),
        ),
        migrations.RunPython(backfill_contribution_type, migrations.RunPython.noop),
    ]
