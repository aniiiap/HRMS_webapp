from django.db import migrations, models


def backfill_publish_on(apps, schema_editor):
    CompanyAnnouncement = apps.get_model("accounts", "CompanyAnnouncement")
    for ann in CompanyAnnouncement.objects.filter(publish_on__isnull=True).iterator():
        ann.publish_on = ann.published_at.date() if ann.published_at else None
        ann.save(update_fields=["publish_on"])
    for ann in CompanyAnnouncement.objects.filter(notified_at__isnull=True).iterator():
        ann.notified_at = ann.published_at
        ann.save(update_fields=["notified_at"])


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0009_announcement_delivery"),
    ]

    operations = [
        migrations.AddField(
            model_name="companyannouncement",
            name="publish_on",
            field=models.DateField(
                blank=True,
                help_text="Date employees start seeing this announcement. Defaults to today.",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="companyannouncement",
            name="notified_at",
            field=models.DateTimeField(
                blank=True,
                help_text="When in-app notifications were first sent.",
                null=True,
            ),
        ),
        migrations.RunPython(backfill_publish_on, migrations.RunPython.noop),
    ]
