from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("employees", "0012_backfill_tenant_scoped_models"),
    ]

    operations = [
        migrations.AddField(
            model_name="shifttemplate",
            name="saturday_working",
            field=models.BooleanField(
                default=False,
                help_text="If true, Saturday is a working day (6-day week). If false, Saturday is weekly off.",
            ),
        ),
        migrations.AddField(
            model_name="shifttemplate",
            name="sunday_working",
            field=models.BooleanField(
                default=False,
                help_text="If true, Sunday is a working day. Typical 5-day week has this false.",
            ),
        ),
    ]
