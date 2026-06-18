"""Ensure new SaaS organizations get statutory config and default salary components."""

from decimal import Decimal

from django.db.models.signals import post_save
from django.dispatch import receiver

from employees.models import Organization

from .default_components import seed_standard_components_for_organization
from .models import PayrollComponent, PayrollCtcTemplate, PayrollStatutoryConfig
from .services.structure_templates import ensure_default_salary_structure


@receiver(post_save, sender=Organization)
def seed_payroll_defaults_for_organization(sender, instance, created, **kwargs):
    if not created:
        return
    PayrollStatutoryConfig.objects.get_or_create(
        organization=instance,
        defaults={
            "pf_enabled": True,
            "pf_employee_percent": Decimal("12.00"),
            "pf_employer_percent": Decimal("12.00"),
            "pf_monthly_wage_ceiling": Decimal("15000.00"),
            "esi_enabled": True,
            "esi_employee_percent": Decimal("0.75"),
            "esi_employer_percent": Decimal("3.25"),
            "esi_gross_threshold": Decimal("21000.00"),
            "esi_basis": "gross",
            "professional_tax_monthly": Decimal("200.00"),
            "tds_regime": "new",
            "standard_deduction_annual": Decimal("75000.00"),
            "include_cess_on_tds_estimate": True,
        },
    )
    seed_standard_components_for_organization(instance, PayrollComponent)
    PayrollCtcTemplate.objects.get_or_create(organization=instance)
    ensure_default_salary_structure(instance)
