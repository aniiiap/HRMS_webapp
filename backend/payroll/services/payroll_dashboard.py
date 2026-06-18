"""Payroll dashboard KPIs and trends."""

from __future__ import annotations

from collections import defaultdict
from decimal import Decimal

from django.db.models import Count, Sum

from employees.models import Employee

from ..models import PayrollEmployeeResult, PayrollRun, PayrollRunStatus


def _dec(v) -> float:
    if v is None:
        return 0.0
    return float(v)


def build_dashboard(organization_id: int, *, year: int | None = None) -> dict:
    runs = PayrollRun.objects.filter(organization_id=organization_id)
    if year:
        runs = runs.filter(period_year=year)

    latest = runs.order_by("-period_year", "-period_month").first()
    active_employees = Employee.objects.filter(
        organization_id=organization_id,
        user__is_active=True,
        user__onboarding_pending=False,
    ).count()

    total_cost = Decimal("0")
    total_net = Decimal("0")
    total_deductions = Decimal("0")
    processed = 0
    pending = active_employees

    if latest:
        agg = PayrollEmployeeResult.objects.filter(run=latest).aggregate(
            gross=Sum("gross_prorated"),
            net=Sum("net_pay"),
            ded=Sum("total_deductions"),
            cnt=Count("id"),
        )
        total_cost = agg["gross"] or Decimal("0")
        total_net = agg["net"] or Decimal("0")
        total_deductions = agg["ded"] or Decimal("0")
        processed = agg["cnt"] or 0
        pending = max(0, active_employees - processed)

    trend = []
    for run in runs.order_by("-period_year", "-period_month")[:12]:
        agg = PayrollEmployeeResult.objects.filter(run=run).aggregate(
            gross=Sum("gross_prorated"),
            net=Sum("net_pay"),
        )
        trend.append(
            {
                "period": f"{run.period_year}-{run.period_month:02d}",
                "year": run.period_year,
                "month": run.period_month,
                "status": run.status,
                "gross": _dec(agg["gross"]),
                "net": _dec(agg["net"]),
            }
        )
    trend.reverse()

    dept_map: dict[str, float] = defaultdict(float)
    if latest:
        for res in PayrollEmployeeResult.objects.filter(run=latest).select_related("employee"):
            dept = (res.employee.department or "").strip() or "Unassigned"
            dept_map[dept] += _dec(res.gross_prorated)

    department_breakdown = [
        {"department": k, "gross": round(v, 2)} for k, v in sorted(dept_map.items(), key=lambda x: -x[1])
    ]

    draft_runs = runs.filter(status=PayrollRunStatus.DRAFT).count()
    finalized_runs = runs.filter(status=PayrollRunStatus.FINALIZED).count()

    return {
        "organization_id": organization_id,
        "latest_run": (
            {
                "id": latest.id,
                "period": f"{latest.period_year}-{latest.period_month:02d}",
                "status": latest.status,
                "working_days": latest.working_days,
            }
            if latest
            else None
        ),
        "kpis": {
            "total_payroll_cost": _dec(total_cost),
            "net_salary_payout": _dec(total_net),
            "total_deductions": _dec(total_deductions),
            "employees_processed": processed,
            "employees_pending": pending,
            "active_employees": active_employees,
            "draft_runs": draft_runs,
            "finalized_runs": finalized_runs,
        },
        "payroll_cost_trend": trend,
        "department_wise_payroll": department_breakdown,
    }
