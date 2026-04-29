"""Helpers for employee onboarding."""


def next_employee_code() -> str:
    """Generate next unique code: EMP-00001, EMP-00002, ..."""
    from .models import Employee

    prefix = "EMP-"
    existing = (
        Employee.objects.filter(employee_code__startswith=prefix)
        .values_list("employee_code", flat=True)
    )
    max_n = 0
    for code in existing:
        part = code.replace(prefix, "", 1)
        if part.isdigit():
            max_n = max(max_n, int(part))
    n = max_n + 1
    code = f"{prefix}{n:05d}"
    while Employee.objects.filter(employee_code=code).exists():
        n += 1
        code = f"{prefix}{n:05d}"
    return code
