from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("payroll", "0010_fy26_tds_and_tax_regime"),
    ]

    operations = [
        migrations.AddField(
            model_name="payrollstatutoryconfig",
            name="pay_cycle_start_day",
            field=models.PositiveSmallIntegerField(default=1),
        ),
        migrations.AddField(
            model_name="payrollstatutoryconfig",
            name="pay_cycle_end_day",
            field=models.PositiveSmallIntegerField(default=31),
        ),
        migrations.AddField(
            model_name="payrollstatutoryconfig",
            name="pf_wage_basis",
            field=models.CharField(
                choices=[
                    ("basic", "Basic × 12%"),
                    ("basic_special", "(Basic + Special Allowance) × 12%"),
                    ("basic_da", "(Basic + DA) × 12%"),
                ],
                default="basic_da",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="payrollstatutoryconfig",
            name="pf_ceiling_enabled",
            field=models.BooleanField(
                default=True,
                help_text="When on, PF wage is capped at pf_monthly_wage_ceiling (commonly ₹15,000).",
            ),
        ),
        migrations.AddField(
            model_name="payrollstatutoryconfig",
            name="pt_enabled",
            field=models.BooleanField(
                default=False,
                help_text="Company deducts professional tax on payslips when enabled.",
            ),
        ),
    ]
