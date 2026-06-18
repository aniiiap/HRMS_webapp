from django.db import migrations, models
import django.db.models.deletion


def seed_structures_for_orgs(apps, schema_editor):
    Organization = apps.get_model("employees", "Organization")
    PayrollSalaryStructure = apps.get_model("payroll", "PayrollSalaryStructure")
    PayrollSalaryStructureLine = apps.get_model("payroll", "PayrollSalaryStructureLine")
    lines = [
        ("Basic", "earning", "CTC * 0.4", 10, False),
        ("HRA", "earning", "BASIC * 0.4", 20, False),
        ("Special Allowance", "earning", "Balancing Amount of CTC", 30, False),
        ("Overtime", "earning", "0", 40, False),
        ("PF Employer", "deduction", "System Calculated", 10, True),
        ("ESI Employer", "deduction", "System Calculated", 20, True),
    ]
    for org in Organization.objects.all():
        if PayrollSalaryStructure.objects.filter(organization_id=org.pk).exists():
            continue
        s = PayrollSalaryStructure.objects.create(
            organization_id=org.pk,
            name=org.name or "Company default",
            description="Default salary structure.",
            is_company_default=True,
        )
        for name, section, formula, order, system in lines:
            PayrollSalaryStructureLine.objects.create(
                structure=s,
                component_name=name,
                section=section,
                formula=formula,
                sort_order=order,
                system_calculated=system,
            )


class Migration(migrations.Migration):

    dependencies = [
        ("employees", "0013_shifttemplate_weekend_flags"),
        ("payroll", "0011_payroll_setup_settings"),
    ]

    operations = [
        migrations.CreateModel(
            name="PayrollSalaryStructure",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=120)),
                ("description", models.TextField(blank=True)),
                ("is_company_default", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "organization",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="payroll_salary_structures",
                        to="employees.organization",
                    ),
                ),
            ],
            options={"ordering": ["-is_company_default", "name"]},
        ),
        migrations.CreateModel(
            name="PayrollSalaryStructureLine",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("component_name", models.CharField(max_length=120)),
                (
                    "section",
                    models.CharField(
                        choices=[("earning", "Earning"), ("deduction", "Deduction")],
                        max_length=16,
                    ),
                ),
                ("formula", models.CharField(default="0", max_length=255)),
                ("system_calculated", models.BooleanField(default=False)),
                ("sort_order", models.PositiveSmallIntegerField(default=10)),
                (
                    "structure",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="lines",
                        to="payroll.payrollsalarystructure",
                    ),
                ),
            ],
            options={"ordering": ["section", "sort_order", "id"]},
        ),
        migrations.AddConstraint(
            model_name="payrollsalarystructure",
            constraint=models.UniqueConstraint(
                fields=("organization", "name"),
                name="uniq_salary_structure_name_per_org",
            ),
        ),
        migrations.AddField(
            model_name="employeecompensation",
            name="salary_structure",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="assigned_compensations",
                to="payroll.payrollsalarystructure",
            ),
        ),
        migrations.AddField(
            model_name="employeepayrollprofile",
            name="bank_name",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="employeepayrollprofile",
            name="account_holder_name",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="employeepayrollprofile",
            name="payment_mode",
            field=models.CharField(
                blank=True,
                choices=[("neft", "NEFT"), ("imps", "IMPS"), ("rtgs", "RTGS")],
                default="neft",
                max_length=16,
            ),
        ),
        migrations.AddField(
            model_name="payrollstatutoryconfig",
            name="company_bank_name",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="payrollstatutoryconfig",
            name="company_account_holder",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="payrollstatutoryconfig",
            name="company_account_number",
            field=models.CharField(blank=True, max_length=34),
        ),
        migrations.AddField(
            model_name="payrollstatutoryconfig",
            name="company_ifsc",
            field=models.CharField(blank=True, max_length=16),
        ),
        migrations.AddField(
            model_name="payrollemployeeresult",
            name="payout_status",
            field=models.CharField(
                choices=[("pending", "Pending"), ("paid", "Paid")],
                default="pending",
                max_length=16,
            ),
        ),
        migrations.AddField(
            model_name="payrollemployeeresult",
            name="paid_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.RunPython(seed_structures_for_orgs, migrations.RunPython.noop),
    ]
