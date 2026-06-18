from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("leave_management", "0005_leavetyperule"),
    ]

    operations = [
        migrations.AlterField(
            model_name="leavetyperule",
            name="accrual_frequency",
            field=models.CharField(
                choices=[
                    ("monthly", "Monthly"),
                    ("halfyearly", "Half Yearly"),
                    ("yearly", "Yearly"),
                ],
                default="monthly",
                max_length=12,
            ),
        ),
    ]
