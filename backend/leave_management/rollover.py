"""Year-end leave balance carry-forward rollover service."""

from datetime import date
from decimal import Decimal
from typing import Any

from django.utils import timezone
from employees.models import Employee
from .models import LeaveBalanceOverride, LeaveTypeRule
from .leave_rules import employee_on_probation, leave_days_in_year, quota_for_rule


def preview_or_execute_leave_rollover(
    organization_id: int,
    from_year: int,
    to_year: int,
    dry_run: bool = True,
) -> dict[str, Any]:
    """
    Evaluate remaining balances for year ``from_year`` for rules where carry_forward_enabled is True.
    If dry_run is False, persists the carried forward days into LeaveBalanceOverride for ``to_year``.
    """
    rules = list(
        LeaveTypeRule.objects.filter(
            organization_id=organization_id,
            carry_forward_enabled=True,
            is_active=True,
        ).order_by("sort_order")
    )

    if not rules:
        return {
            "organization_id": organization_id,
            "from_year": from_year,
            "to_year": to_year,
            "dry_run": dry_run,
            "rules_count": 0,
            "eligible_grants_count": 0,
            "applied_count": 0,
            "items": [],
            "message": "No leave rules in this organization have carry-forward enabled.",
        }

    employees = list(
        Employee.objects.select_related("user")
        .filter(organization_id=organization_id, user__is_active=True)
        .order_by("employee_code")
    )

    as_of_end_prev = date(from_year, 12, 31)
    items = []
    applied_count = 0

    for emp in employees:
        on_prob = employee_on_probation(emp)
        overrides = {
            o.leave_type: o
            for o in LeaveBalanceOverride.objects.filter(employee=emp, year=from_year)
        }

        for rule in rules:
            cycle = getattr(rule, "carry_forward_cycle", "calendar_year")
            if cycle == "financial_year":
                as_of_eval = date(from_year, 3, 31)
            elif cycle == "anniversary" and emp.date_of_joining:
                doj = emp.date_of_joining
                try:
                    as_of_eval = date(from_year, doj.month, doj.day)
                except ValueError:
                    as_of_eval = date(from_year, 2, 28)
            else:
                as_of_eval = date(from_year, 12, 31)

            base_quota = quota_for_rule(rule, is_on_probation=on_prob, employee=emp, as_of=as_of_eval)
            if base_quota is None:
                continue

            ovr = overrides.get(rule.code)
            carry_prev = float(ovr.carry_forward or 0) if ovr else 0.0
            quota_ovr = float(ovr.quota) if (ovr and ovr.quota is not None) else None
            adj_prev = float(ovr.used_adjustment or 0) if ovr else 0.0

            total_quota = (quota_ovr if quota_ovr is not None else base_quota) + carry_prev
            used = leave_days_in_year(emp, rule.code, from_year) + adj_prev
            remaining = max(0.0, total_quota - used)

            if remaining <= 0:
                continue

            # Cap carry-forward at annual quota if defined
            cap = float(rule.annual_quota) if rule.annual_quota is not None else None
            to_carry = min(remaining, cap) if cap is not None else remaining
            to_carry = round(to_carry, 1)

            if to_carry <= 0:
                continue

            name = f"{emp.user.first_name} {emp.user.last_name}".strip() or emp.user.email
            item = {
                "employee_id": emp.id,
                "employee_code": emp.employee_code,
                "employee_name": name,
                "rule_code": rule.code,
                "rule_name": rule.name,
                "carry_forward_cycle": cycle,
                "from_year": from_year,
                "to_year": to_year,
                "prev_total_quota": total_quota,
                "prev_used": used,
                "prev_remaining": remaining,
                "carry_forward_applied": to_carry,
            }
            items.append(item)

            if not dry_run:
                override_target, created = LeaveBalanceOverride.objects.get_or_create(
                    employee=emp,
                    leave_type=rule.code,
                    year=to_year,
                    defaults={"carry_forward": Decimal(str(to_carry))},
                )
                if not created:
                    override_target.carry_forward = Decimal(str(to_carry))
                    override_target.save(update_fields=["carry_forward", "updated_at"])
                applied_count += 1

    return {
        "organization_id": organization_id,
        "from_year": from_year,
        "to_year": to_year,
        "dry_run": dry_run,
        "rules_count": len(rules),
        "eligible_grants_count": len(items),
        "applied_count": applied_count if not dry_run else 0,
        "items": items,
        "message": (
            f"Preview complete: {len(items)} carry-forward entries calculated."
            if dry_run
            else f"Success: {applied_count} carry-forward balances applied for {to_year}."
        ),
    }
