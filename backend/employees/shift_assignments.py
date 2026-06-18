"""Sync employee shift fields from template assignments."""

from __future__ import annotations

from .models import Employee, ShiftTemplate, ShiftTemplateAssignment


def apply_shift_template_to_employee(employee: Employee, template: ShiftTemplate | None) -> None:
    if not template:
        employee.shift_template = None
        employee.save(update_fields=["shift_template", "updated_at"])
        return
    employee.shift_template = template
    employee.shift_start_time = template.start_time
    employee.shift_end_time = template.end_time
    employee.grace_minutes = template.grace_minutes
    employee.early_checkout_grace_minutes = template.early_checkout_grace_minutes
    employee.save(
        update_fields=[
            "shift_template",
            "shift_start_time",
            "shift_end_time",
            "grace_minutes",
            "early_checkout_grace_minutes",
            "updated_at",
        ]
    )


def set_primary_shift_assignment(employee: Employee, template: ShiftTemplate) -> None:
    ShiftTemplateAssignment.objects.filter(employee=employee, is_primary=True).update(is_primary=False)
    assignment, _ = ShiftTemplateAssignment.objects.get_or_create(
        employee=employee,
        shift_template=template,
    )
    if not assignment.is_primary:
        assignment.is_primary = True
        assignment.save(update_fields=["is_primary"])
    apply_shift_template_to_employee(employee, template)


def promote_primary_shift_assignment(employee: Employee) -> None:
    assignment = (
        ShiftTemplateAssignment.objects.filter(employee=employee)
        .select_related("shift_template")
        .order_by("-is_primary", "created_at")
        .first()
    )
    if not assignment:
        apply_shift_template_to_employee(employee, None)
        return
    if not assignment.is_primary:
        ShiftTemplateAssignment.objects.filter(employee=employee).update(is_primary=False)
        assignment.is_primary = True
        assignment.save(update_fields=["is_primary"])
    apply_shift_template_to_employee(employee, assignment.shift_template)
