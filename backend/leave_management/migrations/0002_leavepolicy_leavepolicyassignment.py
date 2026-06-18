from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("employees", "0009_employee_early_checkout_grace_minutes_and_more"),
        ("leave_management", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="LeavePolicy",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=120, unique=True)),
                ("description", models.CharField(blank=True, max_length=300)),
                ("annual_quota", models.PositiveSmallIntegerField(default=12)),
                ("sick_quota", models.PositiveSmallIntegerField(default=8)),
                ("casual_quota", models.PositiveSmallIntegerField(default=6)),
                ("other_quota", models.PositiveSmallIntegerField(default=0)),
                ("probation_annual_quota", models.PositiveSmallIntegerField(default=0)),
                ("probation_sick_quota", models.PositiveSmallIntegerField(default=4)),
                ("probation_casual_quota", models.PositiveSmallIntegerField(default=2)),
                ("probation_other_quota", models.PositiveSmallIntegerField(default=0)),
                ("allow_unpaid", models.BooleanField(default=True)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="LeavePolicyAssignment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("is_on_probation", models.BooleanField(default=False)),
                ("effective_from", models.DateField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "employee",
                    models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="leave_policy_assignment", to="employees.employee"),
                ),
                (
                    "policy",
                    models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="assignments", to="leave_management.leavepolicy"),
                ),
            ],
            options={"ordering": ["employee__employee_code"]},
        ),
    ]
