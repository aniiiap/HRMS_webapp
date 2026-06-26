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
    replacements = {
        "employee_name": employee.user.get_full_name() if employee and hasattr(employee, 'user') else "",
        "employee_email": employee.user.email if employee and hasattr(employee, 'user') else "",
        "designation": employee.designation if employee else "",
        "department": employee.department if employee else "",
        "organization_name": employee.organization.name if employee and hasattr(employee, 'organization') and employee.organization else "",
        "salary": str(getattr(employee, 'salary', '')) if employee else "",
        "joining_date": employee.date_of_joining.strftime("%B %d, %Y") if employee and hasattr(employee, 'date_of_joining') and employee.date_of_joining else "",
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

    if not api_key or not from_email:
        # For local dev without keys, just return success
        print("RESEND NOT CONFIGURED: Fake sending email to", employee.user.email)
        return True, "Email 'sent' to console."

    pdf_base64 = base64.b64encode(pdf_bytes).decode("utf-8")

    payload = {
        "from": from_email,
        "to": [employee.user.email],
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
