from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("employees", "0010_organization_employee_organization"),
        ("accounts", "0005_companyannouncement_targeting"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="organization",
            field=models.ForeignKey(
                blank=True,
                help_text="Company tenant for Admin/HR without an employee profile.",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="users",
                to="employees.organization",
            ),
        ),
    ]
