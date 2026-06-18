from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("employees", "0013_shifttemplate_weekend_flags"),
        ("accounts", "0008_passwordresettoken"),
    ]

    operations = [
        migrations.AddField(
            model_name="companyannouncement",
            name="send_email",
            field=models.BooleanField(
                default=False,
                help_text="Also email recipients (requires Resend configuration).",
            ),
        ),
        migrations.AddField(
            model_name="companyannouncement",
            name="send_sms",
            field=models.BooleanField(
                default=False,
                help_text="Also SMS recipients with a phone on file (requires paid SMS provider).",
            ),
        ),
        migrations.AlterField(
            model_name="companyannouncement",
            name="target_audience",
            field=models.CharField(
                choices=[
                    ("all", "All employees"),
                    ("department", "Department"),
                    ("role", "Role"),
                    ("employees", "Selected employees"),
                ],
                default="all",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="companyannouncement",
            name="target_employees",
            field=models.ManyToManyField(
                blank=True,
                help_text="When target_audience is employees, only these employees receive the announcement.",
                related_name="targeted_announcements",
                to="employees.employee",
            ),
        ),
        migrations.CreateModel(
            name="AnnouncementDismissal",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("dismissed_at", models.DateTimeField(auto_now_add=True)),
                (
                    "announcement",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="dismissals",
                        to="accounts.companyannouncement",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="announcement_dismissals",
                        to="accounts.user",
                    ),
                ),
            ],
            options={
                "constraints": [
                    models.UniqueConstraint(
                        fields=("user", "announcement"),
                        name="uniq_announcement_dismissal_per_user",
                    )
                ],
            },
        ),
    ]
