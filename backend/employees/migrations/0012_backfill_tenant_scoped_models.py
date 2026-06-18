from django.db import migrations


def backfill_org_scoped(apps, schema_editor):
    Organization = apps.get_model("employees", "Organization")
    Employee = apps.get_model("employees", "Employee")
    ShiftTemplate = apps.get_model("employees", "ShiftTemplate")
    OfficeLocationSettings = apps.get_model("employees", "OfficeLocationSettings")
    LeavePolicy = apps.get_model("leave_management", "LeavePolicy")
    CompanyAnnouncement = apps.get_model("accounts", "CompanyAnnouncement")

    org = Organization.objects.order_by("id").first()
    if not org:
        return

    ShiftTemplate.objects.filter(organization__isnull=True).update(organization=org)
    OfficeLocationSettings.objects.filter(organization__isnull=True).update(organization=org)
    LeavePolicy.objects.filter(organization__isnull=True).update(organization=org)
    CompanyAnnouncement.objects.filter(organization__isnull=True).update(organization=org)
    Employee.objects.filter(organization__isnull=True).update(organization=org)


class Migration(migrations.Migration):

    dependencies = [
        ("employees", "0011_officelocationsettings_organization_and_more"),
        ("leave_management", "0003_leavepolicy_organization_alter_leavepolicy_name_and_more"),
        ("accounts", "0007_companyannouncement_organization"),
    ]

    operations = [
        migrations.RunPython(backfill_org_scoped, migrations.RunPython.noop),
    ]
