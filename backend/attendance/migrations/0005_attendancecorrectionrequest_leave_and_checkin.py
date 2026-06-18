from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("attendance", "0004_alter_attendancecorrectionrequest_request_type"),
    ]

    operations = [
        migrations.AddField(
            model_name="attendancecorrectionrequest",
            name="requested_check_in",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="attendancecorrectionrequest",
            name="leave_start_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="attendancecorrectionrequest",
            name="leave_end_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="attendancecorrectionrequest",
            name="leave_type",
            field=models.CharField(blank=True, default="", max_length=20),
        ),
    ]
