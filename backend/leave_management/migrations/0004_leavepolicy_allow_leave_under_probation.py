from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("leave_management", "0003_leavepolicy_organization_alter_leavepolicy_name_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="leavepolicy",
            name="allow_leave_under_probation",
            field=models.BooleanField(
                default=True,
                help_text="When off, employees marked on probation cannot apply leave under this rule.",
            ),
        ),
    ]
