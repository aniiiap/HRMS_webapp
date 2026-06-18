from django.db import migrations, models
import django.db.models.deletion


def backfill_shift_assignments(apps, schema_editor):
    Employee = apps.get_model("employees", "Employee")
    ShiftTemplateAssignment = apps.get_model("employees", "ShiftTemplateAssignment")
    for emp in Employee.objects.exclude(shift_template_id=None).iterator():
        ShiftTemplateAssignment.objects.get_or_create(
            employee_id=emp.id,
            shift_template_id=emp.shift_template_id,
            defaults={"is_primary": True},
        )


class Migration(migrations.Migration):

    dependencies = [
        ("employees", "0013_shifttemplate_weekend_flags"),
    ]

    operations = [
        migrations.CreateModel(
            name="ShiftTemplateAssignment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("is_primary", models.BooleanField(default=False, help_text="Primary rule used for attendance punches and schedule.")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "employee",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="shift_template_assignments",
                        to="employees.employee",
                    ),
                ),
                (
                    "shift_template",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="employee_assignments",
                        to="employees.shifttemplate",
                    ),
                ),
            ],
            options={
                "ordering": ["-is_primary", "created_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="shifttemplateassignment",
            constraint=models.UniqueConstraint(
                fields=("employee", "shift_template"),
                name="uniq_shift_template_per_employee",
            ),
        ),
        migrations.RunPython(backfill_shift_assignments, migrations.RunPython.noop),
    ]
