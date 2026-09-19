import io
import urllib.request
import urllib.error
import json
import base64
from django.conf import settings
from django.core.files.base import ContentFile
from xhtml2pdf import pisa
from employees.models import Employee

import re

def render_template_variables(html_content: str, employee: Employee) -> str:
    """Replaces placeholders like {{ employee_name }} with actual employee data."""
    if not html_content:
        return ""
    
    # Define mapping of placeholders to data
    sig_img = ""
    seal_img = ""
    logo_img = ""
    if employee and hasattr(employee, 'organization') and employee.organization:
        org = employee.organization
        if getattr(org, 'signature_image', None):
            sig_img = f'<img src="{org.signature_image.url}" style="max-height: 80px;" alt="Signature" />'
        if getattr(org, 'seal_image', None):
            seal_img = f'<img src="{org.seal_image.url}" style="max-height: 80px;" alt="Company Seal" />'
        if getattr(org, 'company_logo', None):
            logo_img = f'<img src="{org.company_logo.url}" style="max-height: 80px;" alt="Company Logo" />'

    salary_val = ""
    if employee:
        if hasattr(employee, 'compensation') and employee.compensation:
            salary_val = str(employee.compensation.monthly_gross or "")
        else:
            salary_val = str(getattr(employee, 'salary', ''))

    replacements = {
        "employee_name": employee.user.get_full_name() if employee and hasattr(employee, 'user') else "",
        "employee_email": employee.user.email if employee and hasattr(employee, 'user') else "",
        "personal_email": employee.personal_email if employee else "",
        "employee_code": employee.employee_code if employee else "",
        "phone": employee.phone if employee else "",
        "address": employee.address if employee else "",
        "date_of_birth": employee.date_of_birth.strftime("%B %d, %Y") if employee and getattr(employee, 'date_of_birth', None) else "",
        "designation": employee.designation if employee else "",
        "department": employee.department if employee else "",
        "organization_name": employee.organization.name if employee and hasattr(employee, 'organization') and employee.organization else "",
        "salary": salary_val,
        "joining_date": employee.date_of_joining.strftime("%B %d, %Y") if employee and hasattr(employee, 'date_of_joining') and employee.date_of_joining else "",
        "company_signature": sig_img,
        "company_seal": seal_img,
        "company_logo": logo_img,
    }
    
    for key, value in replacements.items():
        # Match {{ optionally with spaces/html }} key {{ optionally with spaces/html }}
        # Example: {{ <span>employee_name</span> }}
        pattern = r"{{\s*(?:<[^>]+>)*\s*" + key + r"\s*(?:<[^>]+>)*\s*}}"
        html_content = re.sub(pattern, value or "", html_content, flags=re.IGNORECASE)
        
    return html_content

def generate_pdf_from_html(html_content):
    """Generate PDF from HTML content using xhtml2pdf."""
    result = io.BytesIO()
    pdf = pisa.pisaDocument(io.BytesIO(html_content.encode("utf-8")), result, encoding='UTF-8')
    if not pdf.err:
        return result.getvalue()
    raise Exception(f"Failed to generate PDF: {pdf.err}")

def send_letter_email(employee: Employee, subject: str, note_html: str, pdf_bytes: bytes, file_name: str):
    """Sends the letter via Resend with the PDF attached."""
    api_key = getattr(settings, "RESEND_API_KEY", "")
    from_email = getattr(settings, "RESEND_FROM_EMAIL", "")

    target_email = employee.personal_email if getattr(employee, 'personal_email', None) else employee.user.email

    if not api_key or not from_email:
        # For local dev without keys, just return success
        print("RESEND NOT CONFIGURED: Fake sending email to", target_email)
        return True, "Email 'sent' to console."

    pdf_base64 = base64.b64encode(pdf_bytes).decode("utf-8")

    payload = {
        "from": from_email,
        "to": [target_email],
        "subject": subject,
        "html": note_html,
        "attachments": [
            {
                "filename": file_name,
                "content": pdf_base64,
            }
        ]
    }

    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "HRCore/1.0 (+https://hrms.staffdox.co.in)",
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req) as resp:
            if resp.status in [200, 201]:
                return True, "Email sent successfully."
            else:
                return False, f"Resend API returned status {resp.status}"
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8")
        return False, f"Resend error {exc.code}: {body}"
    except Exception as exc:
        return False, f"Error: {str(exc)}"
