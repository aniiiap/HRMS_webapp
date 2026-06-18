from decimal import Decimal

from django.db import migrations, models
import django.db.models.deletion


def seed_and_migrate(apps, schema_editor):
    Organization = apps.get_model("employees", "Organization")
    LeavePolicy = apps.get_model("leave_management", "LeavePolicy")
    LeavePolicyAssignment = apps.get_model("leave_management", "LeavePolicyAssignment")
    LeaveTypeRule = apps.get_model("leave_management", "LeaveTypeRule")
    LeaveTypeRuleAssignment = apps.get_model("leave_management", "LeaveTypeRuleAssignment")
    EmployeeLeaveProfile = apps.get_model("leave_management", "EmployeeLeaveProfile")
    LeaveRequest = apps.get_model("leave_management", "LeaveRequest")

    legacy_map = {
        "annual": "paid_leave",
        "sick": "sick_leave",
        "casual": "casual_leave",
        "unpaid": "loss_of_pay",
        "other": "event_leave",
    }
    for row in LeaveRequest.objects.all().iterator():
        new_code = legacy_map.get(row.leave_type, row.leave_type)
        if new_code != row.leave_type:
            row.leave_type = new_code
            row.save(update_fields=["leave_type"])

    defaults_template = [
        ("paid_leave", "Paid Leave", "PL", Decimal("12.0"), 10),
        ("loss_of_pay", "Loss Of Pay", "LOP", None, 20),
        ("casual_leave", "Casual Leave", "CL", Decimal("6.0"), 30),
        ("work_from_home", "Work From Home", "WFH", Decimal("90.0"), 40),
        ("sick_leave", "Sick Leave", "SL", Decimal("8.0"), 50),
        ("maternity_leave", "Maternity Leave", "ML", Decimal("182.0"), 60),
        ("paternity_leave", "Paternity Leave", "PTL", Decimal("15.0"), 70),
        ("on_duty_leave", "On Duty Leave", "OD", Decimal("30.0"), 80),
        ("event_leave", "Event Leave", "EL", Decimal("5.0"), 90),
        ("comp_off", "Comp Off", "CO", Decimal("12.0"), 100),
    ]

    org_ids = set(Organization.objects.values_list("id", flat=True))
    org_ids.update(LeavePolicy.objects.exclude(organization_id__isnull=True).values_list("organization_id", flat=True))

    for org_id in org_ids:
        policy = LeavePolicy.objects.filter(organization_id=org_id, is_active=True).order_by("id").first()
        if not policy:
            policy = LeavePolicy.objects.filter(organization_id=org_id).order_by("id").first()
        for code, name, short_name, quota, sort_order in defaults_template:
            rule_defaults = {
                "name": name,
                "short_name": short_name,
                "is_system": True,
                "annual_quota": quota,
                "sort_order": sort_order,
                "description": "This is a default description for the Leave Type. You can customise this.",
            }
            if policy:
                if code == "paid_leave":
                    rule_defaults["annual_quota"] = Decimal(str(policy.annual_quota))
                    rule_defaults["probation_quota"] = Decimal(str(policy.probation_annual_quota))
                    rule_defaults["allowed_under_probation"] = policy.allow_leave_under_probation
                elif code == "sick_leave":
                    rule_defaults["annual_quota"] = Decimal(str(policy.sick_quota))
                    rule_defaults["probation_quota"] = Decimal(str(policy.probation_sick_quota))
                elif code == "casual_leave":
                    rule_defaults["annual_quota"] = Decimal(str(policy.casual_quota))
                    rule_defaults["probation_quota"] = Decimal(str(policy.probation_casual_quota))
                elif code == "event_leave":
                    rule_defaults["annual_quota"] = Decimal(str(policy.other_quota or 0))
                    rule_defaults["probation_quota"] = Decimal(str(policy.probation_other_quota))
                elif code == "loss_of_pay" and not policy.allow_unpaid:
                    rule_defaults["is_active"] = False
            LeaveTypeRule.objects.get_or_create(
                organization_id=org_id,
                code=code,
                defaults=rule_defaults,
            )

        rules = list(LeaveTypeRule.objects.filter(organization_id=org_id, is_active=True))
        for assignment in LeavePolicyAssignment.objects.filter(employee__organization_id=org_id).select_related("employee"):
            EmployeeLeaveProfile.objects.update_or_create(
                employee_id=assignment.employee_id,
                defaults={
                    "is_on_probation": assignment.is_on_probation,
                    "effective_from": assignment.effective_from,
                },
            )
            for rule in rules:
                LeaveTypeRuleAssignment.objects.get_or_create(employee_id=assignment.employee_id, rule_id=rule.id)


class Migration(migrations.Migration):

    dependencies = [
        ("employees", "0013_shifttemplate_weekend_flags"),
        ("leave_management", "0004_leavepolicy_allow_leave_under_probation"),
    ]

    operations = [
        migrations.AlterField(
            model_name="leaverequest",
            name="leave_type",
            field=models.CharField(default="paid_leave", max_length=32),
        ),
        migrations.CreateModel(
            name="LeaveTypeRule",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("code", models.SlugField(max_length=40)),
                ("is_system", models.BooleanField(default=False)),
                ("name", models.CharField(max_length=120)),
                ("description", models.TextField(blank=True)),
                ("short_name", models.CharField(blank=True, max_length=12)),
                ("annual_quota", models.DecimalField(blank=True, decimal_places=1, max_digits=6, null=True)),
                ("count_weekends", models.BooleanField(default=False)),
                ("count_holidays", models.BooleanField(default=False)),
                ("accrual_basis", models.BooleanField(default=True)),
                ("present_day_basis", models.BooleanField(default=False)),
                ("accrual_frequency", models.CharField(choices=[("monthly", "Monthly"), ("yearly", "Yearly")], default="monthly", max_length=10)),
                ("accrual_period", models.CharField(choices=[("start", "Start"), ("end", "End")], default="start", max_length=10)),
                ("allowed_under_probation", models.BooleanField(default=False)),
                ("allowed_under_notice", models.BooleanField(default=False)),
                ("probation_quota", models.DecimalField(blank=True, decimal_places=1, max_digits=6, null=True)),
                ("encash_enabled", models.BooleanField(default=False)),
                ("carry_forward_enabled", models.BooleanField(default=False)),
                ("max_per_month", models.DecimalField(blank=True, decimal_places=1, max_digits=6, null=True)),
                ("continuous_allowed", models.PositiveSmallIntegerField(blank=True, null=True)),
                ("negative_allowed", models.BooleanField(default=False)),
                ("future_dated_allowed", models.BooleanField(default=True)),
                ("future_dated_after_days", models.PositiveSmallIntegerField(default=0)),
                ("backdated_allowed", models.BooleanField(default=True)),
                ("backdated_up_to_days", models.PositiveSmallIntegerField(default=90)),
                ("apply_next_year_until_month", models.PositiveSmallIntegerField(default=2)),
                ("is_active", models.BooleanField(default=True)),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("organization", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="leave_type_rules", to="employees.organization")),
            ],
            options={
                "ordering": ["sort_order", "name"],
            },
        ),
        migrations.CreateModel(
            name="EmployeeLeaveProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("is_on_probation", models.BooleanField(default=False)),
                ("effective_from", models.DateField(blank=True, null=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("employee", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="leave_profile", to="employees.employee")),
            ],
        ),
        migrations.CreateModel(
            name="LeaveTypeRuleAssignment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("employee", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="leave_rule_assignments", to="employees.employee")),
                ("rule", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="assignments", to="leave_management.leavetyperule")),
            ],
        ),
        migrations.AddConstraint(
            model_name="leavetyperule",
            constraint=models.UniqueConstraint(fields=("organization", "code"), name="uniq_leave_type_rule_code_per_org"),
        ),
        migrations.AddConstraint(
            model_name="leavetyperuleassignment",
            constraint=models.UniqueConstraint(fields=("employee", "rule"), name="uniq_employee_leave_rule"),
        ),
        migrations.RunPython(seed_and_migrate, migrations.RunPython.noop),
    ]
