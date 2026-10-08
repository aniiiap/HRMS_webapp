from django.db.models.signals import post_save
from django.dispatch import receiver
from employees.models import Organization
from helpdesk.models import HelpdeskCategory

@receiver(post_save, sender=Organization)
def create_default_helpdesk_categories(sender, instance, created, **kwargs):
    if created:
        defaults = ['HR Query', 'IT Support', 'Payroll & Compensation', 'Other']
        for name in defaults:
            HelpdeskCategory.objects.get_or_create(organization=instance, name=name)
