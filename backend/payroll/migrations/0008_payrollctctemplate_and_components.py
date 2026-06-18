from decimal import Decimal

from django.db import migrations, models


def seed_ctc_template_and_components(apps, schema_editor):
    Organization = apps.get_model("employees", "Organization")
    PayrollCtcTemplate = apps.get_model("payroll", "PayrollCtcTemplate")
    PayrollComponent = apps.get_model("payroll", "PayrollComponent")

    new_components = [
        {
            "code": "TRANSPORT_ALLOWANCE",
            "name": "Transport allowance",
            "category": "recurring",
            "kind": "earning",
            "taxable": True,
            "pf_wage_part": False,
            "esi_wage_part": True,
            "prorate_with_attendance": True,
            "is_system": True,
        },
        {
            "code": "MEDICAL_ALLOWANCE",
            "name": "Medical allowance",
            "category": "recurring",
            "kind": "earning",
            "taxable": True,
            "pf_wage_part": False,
            "esi_wage_part": True,
            "prorate_with_attendance": True,
            "is_system": True,
        },
    ]

    for org in Organization.objects.all():
        PayrollCtcTemplate.objects.get_or_create(organization_id=org.pk)
        for row in new_components:
            PayrollComponent.objects.get_or_create(
                organization_id=org.pk,
                code=row["code"],
                defaults={**row, "organization_id": org.pk},
            )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("payroll", "0007_dearness_allowance_component"),
    ]

    operations = [
        migrations.CreateModel(
            name="PayrollCtcTemplate",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("basic_pct_of_ctc", models.DecimalField(decimal_places=2, default=Decimal("40.00"), max_digits=6)),
                ("da_pct_of_ctc", models.DecimalField(decimal_places=2, default=Decimal("0.00"), max_digits=6)),
                ("hra_pct_of_basic", models.DecimalField(decimal_places=2, default=Decimal("40.00"), max_digits=6)),
                ("variable_pay_pct_of_ctc", models.DecimalField(decimal_places=2, default=Decimal("3.33"), max_digits=6)),
                ("gratuity_pct_of_basic", models.DecimalField(decimal_places=2, default=Decimal("4.81"), max_digits=6)),
                ("health_insurance_pct_of_ctc", models.DecimalField(decimal_places=2, default=Decimal("1.61"), max_digits=6)),
                ("transport_allowance", models.DecimalField(decimal_places=2, default=Decimal("1600.00"), max_digits=10)),
                ("cea_monthly", models.DecimalField(decimal_places=2, default=Decimal("200.00"), max_digits=10)),
                ("meal_allowance", models.DecimalField(decimal_places=2, default=Decimal("2200.00"), max_digits=10)),
                ("lta_monthly", models.DecimalField(decimal_places=2, default=Decimal("500.00"), max_digits=10)),
                ("mobile_internet", models.DecimalField(decimal_places=2, default=Decimal("500.00"), max_digits=10)),
                ("uniform_allowance", models.DecimalField(decimal_places=2, default=Decimal("350.00"), max_digits=10)),
                ("medical_allowance", models.DecimalField(decimal_places=2, default=Decimal("1000.00"), max_digits=10)),
                ("include_transport", models.BooleanField(default=True)),
                ("include_cea", models.BooleanField(default=True)),
                ("include_meal", models.BooleanField(default=True)),
                ("include_lta", models.BooleanField(default=True)),
                ("include_mobile", models.BooleanField(default=True)),
                ("include_uniform", models.BooleanField(default=True)),
                ("include_medical", models.BooleanField(default=True)),
                ("include_variable_pay", models.BooleanField(default=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "organization",
                    models.OneToOneField(
                        on_delete=models.deletion.CASCADE,
                        related_name="payroll_ctc_template",
                        to="employees.organization",
                    ),
                ),
            ],
        ),
        migrations.RunPython(seed_ctc_template_and_components, noop_reverse),
    ]
