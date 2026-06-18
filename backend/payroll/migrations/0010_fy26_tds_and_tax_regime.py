"""FY 2025-26 TDS defaults and per-employee tax regime on declarations."""

from decimal import Decimal

from django.db import migrations, models


def apply_fy26_statutory_defaults(apps, schema_editor):
    PayrollStatutoryConfig = apps.get_model("payroll", "PayrollStatutoryConfig")
    PayrollStatutoryConfig.objects.filter(standard_deduction_annual=Decimal("50000.00")).update(
        standard_deduction_annual=Decimal("75000.00"),
        tds_regime="new",
    )


class Migration(migrations.Migration):

    dependencies = [
        ("payroll", "0009_default_da_ten_percent"),
    ]

    operations = [
        migrations.AddField(
            model_name="payrolltaxdeclaration",
            name="tax_regime",
            field=models.CharField(
                choices=[("old", "Old regime (India)"), ("new", "New regime (India)")],
                default="new",
                help_text="Old vs new tax regime for TDS (FY choice).",
                max_length=8,
            ),
        ),
        migrations.AlterField(
            model_name="payrollstatutoryconfig",
            name="standard_deduction_annual",
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal("75000.00"),
                help_text="Section 16 standard deduction (₹75,000 for FY 2025-26).",
                max_digits=12,
            ),
        ),
        migrations.AlterField(
            model_name="payrollstatutoryconfig",
            name="tds_regime",
            field=models.CharField(
                choices=[("old", "Old regime (India)"), ("new", "New regime (India)")],
                default="new",
                help_text="Default tax regime for TDS when employee has not declared a choice.",
                max_length=8,
            ),
        ),
        migrations.RunPython(apply_fy26_statutory_defaults, migrations.RunPython.noop),
    ]
