"""Generate payslip PDF for a finalized payroll employee result."""

from __future__ import annotations

import io
from decimal import Decimal

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from ..models import PayrollEmployeeResult, PayrollRun


def _inr(amount) -> str:
    return f"₹{Decimal(str(amount or 0)):,.2f}"


def build_payslip_pdf(result: PayrollEmployeeResult) -> bytes:
    run: PayrollRun = result.run
    org = run.organization
    emp = result.employee
    user = emp.user

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm, bottomMargin=16 * mm)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("Title", parent=styles["Heading1"], fontSize=16, spaceAfter=6)
    sub_style = ParagraphStyle("Sub", parent=styles["Normal"], fontSize=10, textColor=colors.grey)

    period = f"{run.period_year}-{run.period_month:02d}"
    emp_name = f"{user.first_name} {user.last_name}".strip() or user.email

    story = [
        Paragraph(org.legal_name or org.name, title_style),
        Paragraph("Salary Payslip", styles["Heading2"]),
        Paragraph(f"Pay period: {period}", sub_style),
        Spacer(1, 8),
    ]

    info = [
        ["Employee", emp_name],
        ["Employee code", emp.employee_code],
        ["Department", emp.department or "—"],
        ["Designation", emp.designation or "—"],
        ["Paid days", str(result.paid_days)],
        ["LOP days", str(result.lop_days)],
    ]
    info_table = Table(info, colWidths=[45 * mm, 120 * mm])
    info_table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(info_table)
    story.append(Spacer(1, 12))

    earnings = [["Earning", "Full month", "Prorated"]]
    for line in result.lines.filter(kind="earning").select_related("component"):
        earnings.append(
            [
                line.component.name,
                _inr(line.amount_full_month),
                _inr(line.amount_prorated),
            ]
        )
    earnings.append(["Gross (prorated)", "", _inr(result.gross_prorated)])

    earn_table = Table(earnings, colWidths=[70 * mm, 40 * mm, 40 * mm])
    earn_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.lightgrey),
                ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
            ]
        )
    )
    story.append(Paragraph("Earnings", styles["Heading3"]))
    story.append(earn_table)
    story.append(Spacer(1, 10))

    deductions = [
        ["Deduction", "Amount"],
        ["PF (employee)", _inr(result.pf_employee)],
        ["ESI (employee)", _inr(result.esi_employee)],
        ["Professional tax", _inr(result.professional_tax)],
        ["TDS", _inr(result.tds)],
        ["Total deductions", _inr(result.total_deductions)],
    ]
    ded_table = Table(deductions, colWidths=[90 * mm, 50 * mm])
    ded_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.lightgrey),
                ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
                ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
            ]
        )
    )
    story.append(Paragraph("Deductions", styles["Heading3"]))
    story.append(ded_table)
    story.append(Spacer(1, 14))

    net_table = Table([["Net pay", _inr(result.net_pay)]], colWidths=[90 * mm, 50 * mm])
    net_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#ede9fe")),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 12),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
            ]
        )
    )
    story.append(net_table)
    story.append(Spacer(1, 20))
    story.append(Paragraph("This is a system-generated payslip. Amounts are estimates until verified by Finance.", sub_style))

    doc.build(story)
    return buffer.getvalue()
