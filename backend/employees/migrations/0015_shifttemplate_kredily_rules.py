from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("employees", "0014_shifttemplateassignment"),
    ]

    operations = [
        migrations.AddField(
            model_name="shifttemplate",
            name="description",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="shifttemplate",
            name="is_company_default",
            field=models.BooleanField(
                default=False,
                help_text="Default rule applied to new employees in this organization.",
            ),
        ),
        migrations.AddField(
            model_name="shifttemplate",
            name="enable_auto_deduction",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="shifttemplate",
            name="manual_deduction_day",
            field=models.PositiveSmallIntegerField(
                default=31,
                help_text="Day of month (1–31) for manual attendance deduction runs.",
            ),
        ),
        migrations.AddField(
            model_name="shifttemplate",
            name="enable_anomaly_tracking",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="shifttemplate",
            name="track_in_time",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="shifttemplate",
            name="track_out_time",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="shifttemplate",
            name="track_work_duration",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="shifttemplate",
            name="full_day_minutes",
            field=models.PositiveSmallIntegerField(
                default=480,
                help_text="Minimum worked minutes for a full day when work-duration tracking is on.",
            ),
        ),
        migrations.AddField(
            model_name="shifttemplate",
            name="half_day_minutes",
            field=models.PositiveSmallIntegerField(
                default=240,
                help_text="Minimum worked minutes for a half day when work-duration tracking is on.",
            ),
        ),
        migrations.AddField(
            model_name="shifttemplate",
            name="track_max_break_duration",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="shifttemplate",
            name="max_break_duration_minutes",
            field=models.PositiveSmallIntegerField(default=60),
        ),
        migrations.AddField(
            model_name="shifttemplate",
            name="track_max_break_count",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="shifttemplate",
            name="max_break_count",
            field=models.PositiveSmallIntegerField(default=2),
        ),
        migrations.AddField(
            model_name="shifttemplate",
            name="enable_auto_clock_out",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="shifttemplate",
            name="auto_clock_out_after_minutes",
            field=models.PositiveSmallIntegerField(
                default=0,
                help_text="Minutes after scheduled shift end to auto clock-out (0 means at shift end).",
            ),
        ),
        migrations.AddField(
            model_name="shifttemplate",
            name="attendance_device",
            field=models.CharField(
                choices=[("mobile", "Mobile"), ("web", "Web"), ("both", "Both")],
                default="both",
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name="shifttemplate",
            name="enable_overtime",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="shifttemplate",
            name="enable_24_hour_shift",
            field=models.BooleanField(
                default=False,
                help_text="Allow attendance punches across a full 24-hour window.",
            ),
        ),
        migrations.AddField(
            model_name="shifttemplate",
            name="enable_ip_restriction",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="shifttemplate",
            name="allowed_ip_addresses",
            field=models.TextField(
                blank=True,
                help_text="Comma-separated IP addresses allowed for web attendance.",
            ),
        ),
        migrations.AddField(
            model_name="shifttemplate",
            name="enable_geofencing",
            field=models.BooleanField(
                default=True,
                help_text="Require employees on this rule to punch within office geofence.",
            ),
        ),
    ]
