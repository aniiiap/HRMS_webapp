from decimal import Decimal

from django.db import migrations, models


def set_default_da(apps, schema_editor):
    PayrollCtcTemplate = apps.get_model("payroll", "PayrollCtcTemplate")
    PayrollCtcTemplate.objects.filter(da_pct_of_ctc=Decimal("0.00")).update(da_pct_of_ctc=Decimal("10.00"))


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("payroll", "0008_payrollctctemplate_and_components"),
    ]

    operations = [
        migrations.AlterField(
            model_name="payrollctctemplate",
            name="da_pct_of_ctc",
            field=models.DecimalField(decimal_places=2, default=Decimal("10.00"), max_digits=6),
        ),
        migrations.RunPython(set_default_da, noop_reverse),
    ]
