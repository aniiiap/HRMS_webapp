import django.db.models.deletion
from django.db import migrations, models


def seed_default_organization(apps, schema_editor):
    Organization = apps.get_model("employees", "Organization")
    Employee = apps.get_model("employees", "Employee")
    org, _ = Organization.objects.get_or_create(
        slug="default",
        defaults={"name": "Default Organization", "legal_name": "", "is_active": True},
    )
    Employee.objects.filter(organization__isnull=True).update(organization=org)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("employees", "0009_employee_early_checkout_grace_minutes_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="Organization",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=200)),
                ("slug", models.SlugField(max_length=80, unique=True)),
                ("legal_name", models.CharField(blank=True, max_length=255)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "ordering": ["name"],
            },
        ),
        migrations.AddField(
            model_name="employee",
            name="organization",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="employees",
                to="employees.organization",
            ),
        ),
        migrations.RunPython(seed_default_organization, noop_reverse),
        migrations.AlterField(
            model_name="employee",
            name="organization",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="employees",
                to="employees.organization",
            ),
        ),
    ]
