"""Seed and manage org salary structure templates."""

from __future__ import annotations

from employees.models import Organization

from ..models import PayrollSalaryStructure, PayrollSalaryStructureLine, StructureLineSection

DEFAULT_LINES = [
    ("Basic", StructureLineSection.EARNING, "CTC * 0.4", 10, False),
    ("HRA", StructureLineSection.EARNING, "BASIC * 0.4", 20, False),
    ("Special Allowance", StructureLineSection.EARNING, "Balancing Amount of CTC", 30, False),
    ("Overtime", StructureLineSection.EARNING, "0", 40, False),
    ("PF Employer", StructureLineSection.DEDUCTION, "System Calculated", 10, True),
    ("ESI Employer", StructureLineSection.DEDUCTION, "System Calculated", 20, True),
]


def default_structure_lines() -> list[dict]:
    return [
        {
            "component_name": name,
            "section": section,
            "formula": formula,
            "sort_order": order,
            "system_calculated": system,
        }
        for name, section, formula, order, system in DEFAULT_LINES
    ]


def ensure_default_salary_structure(org: Organization) -> PayrollSalaryStructure:
    existing = PayrollSalaryStructure.objects.filter(organization=org, is_company_default=True).first()
    if existing:
        return existing
    named = PayrollSalaryStructure.objects.filter(organization=org).first()
    if named:
        named.is_company_default = True
        named.save(update_fields=["is_company_default", "updated_at"])
        return named

    structure = PayrollSalaryStructure.objects.create(
        organization=org,
        name=org.name or "Company default",
        description="Default salary structure for the organization.",
        is_company_default=True,
    )
    for row in default_structure_lines():
        PayrollSalaryStructureLine.objects.create(structure=structure, **row)
    return structure


def duplicate_structure(structure: PayrollSalaryStructure, name: str) -> PayrollSalaryStructure:
    clone = PayrollSalaryStructure.objects.create(
        organization=structure.organization,
        name=name,
        description=structure.description,
        is_company_default=False,
    )
    for line in structure.lines.all():
        PayrollSalaryStructureLine.objects.create(
            structure=clone,
            component_name=line.component_name,
            section=line.section,
            formula=line.formula,
            system_calculated=line.system_calculated,
            sort_order=line.sort_order,
        )
    return clone


def set_company_default(structure: PayrollSalaryStructure) -> PayrollSalaryStructure:
    PayrollSalaryStructure.objects.filter(
        organization_id=structure.organization_id,
        is_company_default=True,
    ).exclude(pk=structure.pk).update(is_company_default=False)
    structure.is_company_default = True
    structure.save(update_fields=["is_company_default", "updated_at"])
    return structure
