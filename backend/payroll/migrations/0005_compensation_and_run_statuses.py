# Generated manually for enterprise payroll

import django.db.models.deletion
from decimal import Decimal
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("employees", "0012_backfill_tenant_scoped_models"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("payroll", "0004_payrollemployeeresult_auto_paid_days"),
    ]

    operations = [
        migrations.AlterField(
            model_name="employeesalaryline",
            name="calculation_mode",
            field=models.CharField(
                choices=[
                    ("fixed", "Fixed monthly"),
                    ("percent_basic", "Percent of basic"),
                    ("percent_gross", "Percent of gross"),
                ],
                default="fixed",
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="payrollrun",
            name="status",
            field=models.CharField(
                choices=[
                    ("draft", "Draft"),
                    ("processing", "Processing"),
                    ("ready", "Ready"),
                    ("finalized", "Finalized"),
                    ("paid", "Paid"),
                ],
                default="draft",
                max_length=20,
            ),
        ),
        migrations.CreateModel(
            name="EmployeeCompensation",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "ctc_type",
                    models.CharField(
                        choices=[("monthly", "Monthly"), ("annual", "Annual")],
                        default="monthly",
                        max_length=16,
                    ),
                ),
                ("annual_ctc", models.DecimalField(blank=True, decimal_places=2, max_digits=14, null=True)),
                ("monthly_gross", models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ("effective_from", models.DateField()),
                ("payroll_group", models.CharField(blank=True, default="default", max_length=80)),
                ("pf_applicable", models.BooleanField(default=True)),
                ("esi_applicable", models.BooleanField(default=True)),
                ("pt_applicable", models.BooleanField(default=True)),
                ("tds_applicable", models.BooleanField(default=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "employee",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="compensation",
                        to="employees.employee",
                    ),
                ),
                (
                    "organization",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="employee_compensations",
                        to="employees.organization",
                    ),
                ),
            ],
            options={"verbose_name": "Employee compensation"},
        ),
        migrations.CreateModel(
            name="CompensationRevision",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("effective_from", models.DateField()),
                (
                    "ctc_type",
                    models.CharField(
                        choices=[("monthly", "Monthly"), ("annual", "Annual")],
                        default="monthly",
                        max_length=16,
                    ),
                ),
                ("monthly_gross", models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ("annual_ctc", models.DecimalField(blank=True, decimal_places=2, max_digits=14, null=True)),
                ("note", models.CharField(blank=True, max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="compensation_revisions_created",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "employee",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="compensation_revisions",
                        to="employees.employee",
                    ),
                ),
            ],
            options={"ordering": ["-effective_from", "-id"]},
        ),
    ]
