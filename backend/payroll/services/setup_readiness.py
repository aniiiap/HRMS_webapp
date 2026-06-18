"""Payroll module onboarding checklist (Kredily-style setup wizard)."""

from __future__ import annotations

from employees.models import Employee

from ..models import (
    EmployeeCompensation,
    EmployeeSalaryLine,
    PayrollComponent,
    PayrollCtcTemplate,
    PayrollRun,
    PayrollStatutoryConfig,
)


def _item(key: str, label: str, done: bool, *, hint: str = "", section: str = "setup", sub_tab: str = "settings") -> dict:
    return {
        "key": key,
        "label": label,
        "done": done,
        "hint": hint,
        "section": section,
        "sub_tab": sub_tab,
    }


def build_payroll_setup_status(organization_id: int) -> dict:
    statutory, _ = PayrollStatutoryConfig.objects.get_or_create(organization_id=organization_id)

    component_count = PayrollComponent.objects.filter(organization_id=organization_id).count()
    has_ctc_template = PayrollCtcTemplate.objects.filter(organization_id=organization_id).exists()

    active_employees = Employee.objects.filter(
        organization_id=organization_id,
        user__is_active=True,
        user__onboarding_pending=False,
    ).count()

    with_comp = EmployeeCompensation.objects.filter(employee__organization_id=organization_id).count()
    with_lines = (
        EmployeeSalaryLine.objects.filter(employee__organization_id=organization_id)
        .values("employee_id")
        .distinct()
        .count()
    )
    assigned_count = max(with_comp, with_lines)

    bank_ready = bool(
        (statutory.company_account_number or "").strip()
        and (statutory.company_ifsc or "").strip()
        and (statutory.company_bank_name or "").strip()
    )

    pf_configured = not statutory.pf_enabled or bool(statutory.pf_employee_contribution_type)
    esi_configured = True  # toggle alone is enough

    items = [
        _item(
            "statutory",
            "Payroll settings (PF / ESI / PT)",
            pf_configured and esi_configured,
            hint="Configure statutory programs and contribution types.",
            sub_tab="settings",
        ),
        _item(
            "components",
            "Salary components",
            component_count > 0,
            hint="Default India components are seeded on first use; add custom ones if needed.",
            section="advanced",
            sub_tab="components",
        ),
        _item(
            "ctc_template",
            "CTC split template",
            has_ctc_template,
            hint="Used when building salary from annual/monthly CTC.",
            section="setup",
            sub_tab="create",
        ),
        _item(
            "assign_salary",
            "Employees with salary structure",
            active_employees == 0 or assigned_count >= active_employees,
            hint=f"{assigned_count} of {active_employees} active employees have compensation or salary lines.",
            sub_tab="assign",
        ),
        _item(
            "bank_account",
            "Company payout bank account",
            bank_ready,
            hint="Required for NEFT payout file header.",
            sub_tab="settings",
        ),
        _item(
            "first_run",
            "First payroll run created",
            PayrollRun.objects.filter(organization_id=organization_id).exists(),
            hint="Create a draft run from Run Payroll → Overview.",
            section="run",
            sub_tab="overview",
        ),
    ]

    done_count = sum(1 for i in items if i["done"])
    return {
        "organization_id": organization_id,
        "is_complete": done_count == len(items),
        "completed_count": done_count,
        "total_count": len(items),
        "items": items,
        "summary": {
            "active_employees": active_employees,
            "employees_with_salary": assigned_count,
            "component_count": component_count,
        },
    }
