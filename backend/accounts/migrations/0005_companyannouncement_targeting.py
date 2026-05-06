from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0004_companyannouncement"),
    ]

    operations = [
        migrations.AddField(
            model_name="companyannouncement",
            name="expires_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="companyannouncement",
            name="priority",
            field=models.CharField(
                choices=[("normal", "Normal"), ("important", "Important"), ("critical", "Critical")],
                default="normal",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="companyannouncement",
            name="target_audience",
            field=models.CharField(
                choices=[("all", "All employees"), ("department", "Department"), ("role", "Role")],
                default="all",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="companyannouncement",
            name="target_value",
            field=models.CharField(
                blank=True,
                help_text="Department name for department target, or role key for role target.",
                max_length=120,
            ),
        ),
    ]
