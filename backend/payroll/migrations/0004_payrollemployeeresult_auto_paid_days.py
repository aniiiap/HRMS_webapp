from decimal import Decimal

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("payroll", "0003_seed_default_components_and_statutory"),
    ]

    operations = [
        migrations.AddField(
            model_name="payrollemployeeresult",
            name="auto_paid_days",
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal("0"),
                help_text="Last computed paid days from attendance/leave (before HR override).",
                max_digits=7,
            ),
        ),
        migrations.AddField(
            model_name="payrollemployeeresult",
            name="auto_lop_days",
            field=models.DecimalField(decimal_places=2, default=Decimal("0"), max_digits=7),
        ),
        migrations.AddField(
            model_name="payrollemployeeresult",
            name="paid_days_overridden",
            field=models.BooleanField(
                default=False,
                help_text="When true, paid_days were set manually and are not overwritten on refresh.",
            ),
        ),
    ]
