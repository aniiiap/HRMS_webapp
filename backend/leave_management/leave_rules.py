"""Leave type rules — system defaults, seeding, and quota resolution."""

from calendar import monthrange
from datetime import date, timedelta
from decimal import Decimal

from django.utils import timezone

from .models import (
    AccrualFrequency,
    AccrualPeriod,
    EmployeeLeaveProfile,
    LeaveRequest,
    LeaveStatus,
    LeaveTypeRule,
    LeaveTypeRuleAssignment,
    SYSTEM_LEAVE_RULE_CODES,
)

LEGACY_LEAVE_TYPE_MAP = {
    "annual": "paid_leave",
    "sick": "sick_leave",
    "casual": "casual_leave",
    "unpaid": "loss_of_pay",
    "other": "event_leave",
}

MONTH_CHOICES = [
    (1, "January"),
    (2, "February"),
    (3, "March"),
    (4, "April"),
    (5, "May"),
    (6, "June"),
    (7, "July"),
    (8, "August"),
    (9, "September"),
    (10, "October"),
    (11, "November"),
    (12, "December"),
]

SYSTEM_RULE_DEFAULTS = [
    {
        "code": "paid_leave",
        "name": "Paid Leave",
        "short_name": "PL",
        "description": "This is a default description for the Leave Type. You can customise this.",
        "annual_quota": Decimal("12.0"),
        "sort_order": 10,
    },
    {
        "code": "loss_of_pay",
        "name": "Loss Of Pay",
        "short_name": "LOP",
        "description": "Unpaid leave when paid balance is exhausted or for special cases.",
        "annual_quota": None,
        "negative_allowed": True,
        "sort_order": 20,
    },
    {
        "code": "casual_leave",
        "name": "Casual Leave",
        "short_name": "CL",
        "description": "This is a default description for the Leave Type. You can customise this.",
        "annual_quota": Decimal("6.0"),
        "sort_order": 30,
    },
    {
        "code": "work_from_home",
        "name": "Work From Home",
        "short_name": "WFH",
        "description": "This is a default description for the Leave Type. You can customise this.",
        "annual_quota": Decimal("90.0"),
        "max_per_month": Decimal("15.0"),
        "continuous_allowed": 15,
        "future_dated_after_days": 15,
        "backdated_up_to_days": 15,
        "sort_order": 40,
    },
    {
        "code": "sick_leave",
        "name": "Sick Leave",
        "short_name": "SL",
        "description": "This is a default description for the Leave Type. You can customise this.",
        "annual_quota": Decimal("8.0"),
        "sort_order": 50,
    },
    {
        "code": "maternity_leave",
        "name": "Maternity Leave",
        "short_name": "ML",
        "description": "This is a default description for the Leave Type. You can customise this.",
        "annual_quota": Decimal("182.0"),
        "future_dated_after_days": 30,
        "backdated_up_to_days": 30,
        "sort_order": 60,
    },
    {
        "code": "paternity_leave",
        "name": "Paternity Leave",
        "short_name": "PTL",
        "description": "This is a default description for the Leave Type. You can customise this.",
        "annual_quota": Decimal("15.0"),
        "sort_order": 70,
    },
    {
        "code": "on_duty_leave",
        "name": "On Duty Leave",
        "short_name": "OD",
        "description": "This is a default description for the Leave Type. You can customise this.",
        "annual_quota": Decimal("30.0"),
        "max_per_month": Decimal("15.0"),
        "continuous_allowed": 15,
        "future_dated_after_days": 15,
        "backdated_up_to_days": 15,
        "sort_order": 80,
    },
    {
        "code": "event_leave",
        "name": "Event Leave",
        "short_name": "EL",
        "description": "This is a default description for the Leave Type. You can customise this.",
        "annual_quota": Decimal("5.0"),
        "sort_order": 90,
    },
    {
        "code": "comp_off",
        "name": "Comp Off",
        "short_name": "CO",
        "description": "Compensatory off for extra working days.",
        "annual_quota": Decimal("12.0"),
        "sort_order": 100,
    },
]


def normalize_leave_type_code(code: str) -> str:
    if not code:
        return "paid_leave"
    return LEGACY_LEAVE_TYPE_MAP.get(code, code)


def seed_org_leave_rules(organization_id, policy=None):
    """Create system leave rules for an organization (idempotent)."""
    if not organization_id:
        return []
    created = []
    for spec in SYSTEM_RULE_DEFAULTS:
        defaults = {k: v for k, v in spec.items() if k not in ("code", "name")}
        if policy:
            if spec["code"] == "paid_leave":
                defaults["annual_quota"] = Decimal(str(policy.annual_quota))
                defaults["probation_quota"] = policy.probation_annual_quota
                defaults["allowed_under_probation"] = policy.allow_leave_under_probation
            elif spec["code"] == "sick_leave":
                defaults["annual_quota"] = Decimal(str(policy.sick_quota))
                defaults["probation_quota"] = policy.probation_sick_quota
            elif spec["code"] == "casual_leave":
                defaults["annual_quota"] = Decimal(str(policy.casual_quota))
                defaults["probation_quota"] = policy.probation_casual_quota
            elif spec["code"] == "loss_of_pay":
                if not policy.allow_unpaid:
                    defaults["is_active"] = False
            elif spec["code"] == "event_leave":
                defaults["annual_quota"] = Decimal(str(policy.other_quota or 0))
                defaults["probation_quota"] = policy.probation_other_quota
        rule, was_created = LeaveTypeRule.objects.get_or_create(
            organization_id=organization_id,
            code=spec["code"],
            defaults={"name": spec["name"], "is_system": True, **defaults},
        )
        if was_created:
            created.append(rule)
    return created


def leave_days_in_year(employee, leave_type_code, year, precalculated_usages=None):
    code = normalize_leave_type_code(leave_type_code)
    legacy_codes = [code]
    for old, new in LEGACY_LEAVE_TYPE_MAP.items():
        if new == code:
            legacy_codes.append(old)
            
    if precalculated_usages is not None:
        return sum(precalculated_usages.get(employee.id, {}).get(c, 0) for c in legacy_codes)
        
    rows = LeaveRequest.objects.filter(
        employee=employee,
        status=LeaveStatus.APPROVED,
        leave_type__in=legacy_codes,
        start_date__year=year,
    ).only("start_date", "end_date", "half_day")
    total = 0
    for row in rows:
        days = (row.end_date - row.start_date).days + 1
        if row.half_day in ("first_half", "second_half"):
            total += 0.5
        else:
            total += days
    return total


def employee_on_probation(employee):
    profile = getattr(employee, "leave_profile", None)
    if profile:
        return profile.is_on_probation
    assignment = getattr(employee, "leave_policy_assignment", None)
    if assignment:
        return assignment.is_on_probation
    return False


def resolve_leave_rule(employee, leave_type_code):
    code = normalize_leave_type_code(leave_type_code)
    org_id = employee.organization_id
    if not org_id:
        return None
    rule = LeaveTypeRule.objects.filter(organization_id=org_id, code=code, is_active=True).first()
    return rule


def employee_has_rule(employee, rule):
    if not rule:
        return False
        
    if hasattr(employee, '_prefetched_objects_cache') and 'leave_rule_assignments' in employee._prefetched_objects_cache:
        assignments = employee.leave_rule_assignments.all()
        if not assignments:
            return False
        for asn in assignments:
            if asn.rule_id == rule.id:
                return True
        return False

    return LeaveTypeRuleAssignment.objects.filter(employee=employee, rule=rule).exists()


def _base_annual_quota(rule, is_on_probation=False):
    """Full-year quota before accrual / present-day adjustments."""
    if not rule or not rule.is_active:
        return None
    if rule.code == "loss_of_pay":
        return None
    if is_on_probation:
        if not rule.allowed_under_probation:
            return 0.0
        if rule.probation_quota is not None:
            return float(rule.probation_quota)
    if rule.annual_quota is None:
        return None
    return float(rule.annual_quota)


def accrual_fraction(rule, as_of: date) -> float:
    """
    Share of the annual quota credited by `as_of` (0.0–1.0).
    Ignored when accrual_basis is False (caller uses 1.0).
    """
    freq = rule.accrual_frequency
    period = rule.accrual_period
    year = as_of.year
    month = as_of.month
    day = as_of.day

    if freq == AccrualFrequency.YEARLY:
        if period == AccrualPeriod.START:
            return 1.0
        # End of calendar year
        if month == 12 and day >= 31:
            return 1.0
        return 0.0

    if freq == AccrualFrequency.HALFYEARLY:
        h1_complete = month > 6 or (month == 6 and day >= 30)
        h2_complete = month == 12 and day >= 31
        if period == AccrualPeriod.START:
            elapsed = 2 if month >= 7 else 1
        else:
            elapsed = (1 if h1_complete else 0) + (1 if h2_complete else 0)
        return elapsed / 2.0

    # Monthly (default)
    if period == AccrualPeriod.START:
        elapsed = month
    else:
        last_day = monthrange(year, month)[1]
        elapsed = month if day >= last_day else max(month - 1, 0)
    return elapsed / 12.0


def present_day_ratio(employee, as_of: date) -> float:
    """Present working days / scheduled working days from 1 Jan through as_of."""
    from attendance.models import Attendance
    from employees.week_schedule import is_scheduled_working_day

    start = date(as_of.year, 1, 1)
    working = 0
    present = 0
    d = start
    present_dates = set(
        Attendance.objects.filter(
            employee=employee,
            date__gte=start,
            date__lte=as_of,
            check_in__isnull=False,
        ).values_list("date", flat=True)
    )
    while d <= as_of:
        if is_scheduled_working_day(employee, d):
            working += 1
            if d in present_dates:
                present += 1
        d += timedelta(days=1)
    if working == 0:
        return 1.0
    return present / working


def quota_for_rule(rule, is_on_probation=False, employee=None, as_of=None, present_ratio=None):
    """
    Leave balance available as of `as_of`, respecting accrual and present-day rules.
    """
    annual = _base_annual_quota(rule, is_on_probation)
    if annual is None:
        return None
    if annual == 0:
        return 0.0

    as_of = as_of or timezone.localdate()

    fraction = 1.0
    if rule.accrual_basis:
        fraction = accrual_fraction(rule, as_of)

    quota = annual * fraction

    if rule.present_day_basis and employee is not None:
        if present_ratio is None:
            present_ratio = present_day_ratio(employee, as_of)
        quota *= present_ratio

    # Round to 1 decimal to match quota field precision
    return round(quota, 1)


def validate_leave_request_dates(rule, start, end, today):
    errors = []
    if rule.future_dated_allowed is False and start > today:
        errors.append("Future-dated leave is not allowed for this leave type.")
    elif rule.future_dated_allowed and rule.future_dated_after_days and start > today:
        from datetime import timedelta

        max_future = today + timedelta(days=rule.future_dated_after_days)
        if start > max_future:
            errors.append(
                f"Future-dated leave is only allowed up to {rule.future_dated_after_days} days ahead."
            )
    if rule.backdated_allowed is False and end < today:
        errors.append("Backdated leave is not allowed for this leave type.")
    elif rule.backdated_allowed and rule.backdated_up_to_days and end < today:
        from datetime import timedelta

        min_back = today - timedelta(days=rule.backdated_up_to_days)
        if start < min_back:
            errors.append(
                f"Backdated leave is only allowed up to {rule.backdated_up_to_days} days in the past."
            )
    return errors


def employee_leave_balance_rows(employee, year=None):
    """Dashboard-friendly balance rows for one employee."""
    from django.utils import timezone as tz

    year = year or tz.localdate().year
    org_id = employee.organization_id
    if not org_id:
        return []
    if not LeaveTypeRule.objects.filter(organization_id=org_id).exists():
        seed_org_leave_rules(org_id)
    rules = LeaveTypeRule.objects.filter(organization_id=org_id, is_active=True).order_by("sort_order")
    on_probation = employee_on_probation(employee)
    rows = []
    for rule in rules:
        if not employee_has_rule(employee, rule):
            continue
        if rule.code == "loss_of_pay":
            continue
        quota = quota_for_rule(rule, on_probation, employee=employee, as_of=tz.localdate())
        if quota is None:
            continue
        used = leave_days_in_year(employee, rule.code, year)
        rows.append(
            {
                "leave_type": rule.code,
                "label": rule.name,
                "quota": quota,
                "used": used,
                "remaining": max(quota - used, 0),
            }
        )
    return rows


def resolve_policy(employee):
    """Legacy bridge for reports/payroll that still expect a policy tuple."""
    from .models import LeavePolicy

    assignment = getattr(employee, "leave_policy_assignment", None)
    on_prob = employee_on_probation(employee)
    if assignment and assignment.policy and assignment.policy.is_active:
        return assignment.policy, on_prob
    org_id = employee.organization_id
    fallback = None
    if org_id:
        fallback = LeavePolicy.objects.filter(organization_id=org_id, is_active=True).order_by("id").first()
    if not fallback:
        fallback = LeavePolicy.objects.filter(is_active=True).order_by("id").first()
    return fallback, on_prob


def quota_for(policy, leave_type, is_on_probation, employee=None, as_of=None):
    """Legacy bridge — prefers LeaveTypeRule when available."""
    from .models import LeaveType

    code = normalize_leave_type_code(leave_type)
    if policy and getattr(policy, "organization_id", None):
        rule = LeaveTypeRule.objects.filter(organization_id=policy.organization_id, code=code).first()
        if rule:
            q = quota_for_rule(rule, is_on_probation, employee=employee, as_of=as_of)
            if q is None:
                return None
            return int(q) if float(q).is_integer() else float(q)
    if code == "loss_of_pay":
        return None if (policy.allow_unpaid if policy else True) else 0
    legacy_map = {
        "paid_leave": ("annual_quota", "probation_annual_quota"),
        "sick_leave": ("sick_quota", "probation_sick_quota"),
        "casual_leave": ("casual_quota", "probation_casual_quota"),
        "event_leave": ("other_quota", "probation_other_quota"),
    }
    keys = legacy_map.get(code)
    if not policy or not keys:
        return 0
    reg_key, prob_key = keys
    return getattr(policy, prob_key if is_on_probation else reg_key, 0) or 0
