"""CSV exports for payroll reports."""

from __future__ import annotations

import csv
import io
from decimal import Decimal

from django.http import HttpResponse

from ..models import PayrollEmployeeResult, PayrollRun, PayrollStatutoryConfig


def _str_dec(v) -> str:
    if v is None:
        return "0.00"
    if isinstance(v, Decimal):
        return f"{v:.2f}"
    return str(v)


def export_pay_register_csv(run: PayrollRun) -> HttpResponse:
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(
        [
            "Employee Code",
            "Employee Name",
            "Department",
            "Working Days",
            "Paid Days",
            "LOP Days",
            "Gross (Full)",
            "Gross (Prorated)",
            "Total Deductions",
            "PF",
            "ESI",
            "PT",
            "TDS",
            "Employer PF",
            "Employer ESI",
            "Net Pay",
            "On Hold",
        ]
    )
    qs = (
        PayrollEmployeeResult.objects.filter(run=run)
        .select_related("employee", "employee__user")
        .order_by("employee__employee_code")
    )
    for r in qs:
        u = r.employee.user
        name = f"{u.first_name} {u.last_name}".strip() or u.email
        dept = r.employee.department or ""
        w.writerow(
            [
                r.employee.employee_code,
                name,
                dept,
                run.working_days,
                _str_dec(r.paid_days),
                _str_dec(r.lop_days),
                _str_dec(r.gross_monthly_full),
                _str_dec(r.gross_prorated),
                _str_dec(r.total_deductions),
                _str_dec(r.pf_employee),
                _str_dec(r.esi_employee),
                _str_dec(r.professional_tax),
                _str_dec(r.tds),
                _str_dec(r.pf_employer),
                _str_dec(r.esi_employer),
                _str_dec(r.net_pay),
                "Yes" if r.is_on_hold else "No",
            ]
        )
    resp = HttpResponse("\ufeff" + buf.getvalue(), content_type="text/csv; charset=utf-8")
    resp["Content-Disposition"] = (
        f'attachment; filename="pay_register_{run.period_year}_{run.period_month:02d}.csv"'
    )
    return resp


def export_statutory_csv(run: PayrollRun, kind: str) -> HttpResponse:
    """kind: pf | esi | pt | tds | bank"""
    headers_map = {
        "pf": ["Employee Code", "Name", "PF Employee", "PF Employer", "Gross Prorated"],
        "esi": ["Employee Code", "Name", "ESI Employee", "ESI Employer", "Gross Prorated"],
        "pt": ["Employee Code", "Name", "Professional Tax", "Gross Prorated"],
        "tds": ["Employee Code", "Name", "TDS", "Taxable Prorated"],
        "bank": [
            "Beneficiary Name",
            "Account Number",
            "IFSC",
            "Bank Name",
            "Amount (INR)",
            "Payment Mode",
            "Employee Code",
            "Narration",
        ],
    }
    if kind not in headers_map:
        raise ValueError(f"Unknown report kind: {kind}")

    buf = io.StringIO()
    w = csv.writer(buf)
    if kind == "bank":
        config = PayrollStatutoryConfig.objects.filter(organization_id=run.organization_id).first()
        if config and config.company_account_number:
            w.writerow(
                [
                    "Company debit account",
                    config.company_account_number,
                    config.company_ifsc or "",
                    config.company_bank_name or "",
                    config.company_account_holder or "",
                ]
            )
    w.writerow(headers_map[kind])
    qs = PayrollEmployeeResult.objects.filter(run=run).select_related(
        "employee", "employee__user", "employee__payroll_profile"
    )
    narration = f"Salary {run.period_year}-{run.period_month:02d}"
    for r in qs.order_by("employee__employee_code"):
        if kind == "bank" and (r.is_on_hold or r.net_pay <= Decimal("0")):
            continue
        u = r.employee.user
        name = f"{u.first_name} {u.last_name}".strip() or u.email
        prof = getattr(r.employee, "payroll_profile", None)
        if kind == "pf":
            w.writerow([r.employee.employee_code, name, _str_dec(r.pf_employee), _str_dec(r.pf_employer), _str_dec(r.gross_prorated)])
        elif kind == "esi":
            w.writerow([r.employee.employee_code, name, _str_dec(r.esi_employee), _str_dec(r.esi_employer), _str_dec(r.gross_prorated)])
        elif kind == "pt":
            w.writerow([r.employee.employee_code, name, _str_dec(r.professional_tax), _str_dec(r.gross_prorated)])
        elif kind == "tds":
            w.writerow([r.employee.employee_code, name, _str_dec(r.tds), _str_dec(r.taxable_prorated)])
        else:
            beneficiary = (prof.account_holder_name if prof and prof.account_holder_name else name)
            account = prof.bank_account_number if prof else ""
            ifsc = prof.bank_ifsc if prof else ""
            bank_name = prof.bank_name if prof else ""
            mode = (prof.payment_mode if prof and prof.payment_mode else "neft").upper()
            w.writerow(
                [
                    beneficiary,
                    account,
                    ifsc,
                    bank_name,
                    _str_dec(r.net_pay),
                    mode,
                    r.employee.employee_code,
                    narration,
                ]
            )

    resp = HttpResponse("\ufeff" + buf.getvalue(), content_type="text/csv; charset=utf-8")
    resp["Content-Disposition"] = f'attachment; filename="payroll_{kind}_{run.period_year}_{run.period_month:02d}.csv"'
    return resp
