"""Salary structure validation before payroll processing."""

from __future__ import annotations

from calendar import monthrange
from datetime import date

from django.db.models import Q

from employees.models import Employee

from ..models import EmployeeSalaryLine, PayrollComponent


def has_active_basic_salary(employee: Employee, on_day: date | None = None) -> bool:
    on_day = on_day or date.today()
    return EmployeeSalaryLine.objects.filter(
        employee=employee,
        effective_from__lte=on_day,
        component__code__iexact="BASIC",
        component__organization_id=employee.organization_id,
    ).filter(Q(effective_to__isnull=True) | Q(effective_to__gte=on_day)).exists()


def salary_structure_warnings(employee: Employee, period_year: int, period_month: int) -> list[str]:
    warnings: list[str] = []
    if not employee.organization_id:
        warnings.append("Employee has no organization assigned.")
        return warnings

    _, last = monthrange(period_year, period_month)
    on_day = date(period_year, period_month, last)

    if not has_active_basic_salary(employee, on_day):
        warnings.append("Missing active BASIC salary component for this pay period.")

    has_any = EmployeeSalaryLine.objects.filter(
        employee=employee,
        effective_from__lte=on_day,
    ).filter(Q(effective_to__isnull=True) | Q(effective_to__gte=on_day)).exists()

    if not has_any:
        warnings.append("No salary structure lines configured.")

    earning_components = PayrollComponent.objects.filter(
        organization_id=employee.organization_id,
        kind="earning",
    ).count()
    if earning_components == 0:
        warnings.append("Organization has no earning components defined.")

    return warnings


def run_employee_warnings(employee: Employee, run) -> list[str]:
    warnings = salary_structure_warnings(employee, run.period_year, run.period_month)
    if not employee.user.is_active:
        warnings.append("Employee account is inactive.")
    return warnings


def validate_run_ready_to_finalize(run) -> dict:
    """Return blocking issues that must be resolved before finalize."""
    blockers: list[dict] = []
    for res in run.employee_results.select_related("employee", "employee__user"):
        warnings = run_employee_warnings(res.employee, run)
        critical = [
            w
            for w in warnings
            if any(
                k in w
                for k in (
                    "BASIC",
                    "No salary structure",
                    "inactive",
                    "no organization",
                )
            )
        ]
        if res.is_on_hold:
            critical.append("Payroll is on hold for this employee.")
        if critical:
            u = res.employee.user
            blockers.append(
                {
                    "employee_id": res.employee_id,
                    "employee_code": res.employee.employee_code,
                    "employee_name": f"{u.first_name} {u.last_name}".strip() or u.email,
                    "issues": critical,
                }
            )
    return {
        "can_finalize": len(blockers) == 0,
        "blocker_count": len(blockers),
        "blockers": blockers,
    }
