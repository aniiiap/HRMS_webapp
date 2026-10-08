from django.db import migrations

def seed_default_categories(apps, schema_editor):
    Organization = apps.get_model('employees', 'Organization')
    HelpdeskCategory = apps.get_model('helpdesk', 'HelpdeskCategory')
    
    defaults = ['HR Query', 'IT Support', 'Payroll & Compensation', 'Other']
    
    for org in Organization.objects.all():
        for name in defaults:
            HelpdeskCategory.objects.get_or_create(organization=org, name=name)

def reverse_seed(apps, schema_editor):
    # Optional: we could delete them, but it's fine to leave them if reversed.
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('employees', '0034_organization_attendance_anomaly_backdate_days'),
        ('helpdesk', '0003_ticket_asset_alter_ticket_category_helpdeskcategory'),
    ]

    operations = [
        migrations.RunPython(seed_default_categories, reverse_seed),
    ]
