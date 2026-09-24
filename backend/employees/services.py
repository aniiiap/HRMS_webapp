
from io import BytesIO
from django.template.loader import render_to_string
from django.conf import settings
from xhtml2pdf import pisa
import base64

def get_abs_url(field, base_url):
    if not field: return ""
    url = field.url if hasattr(field, 'url') else str(field)
    if url.startswith("http"): return url
    return f"{base_url}{url}"

def generate_id_card_pdf(employee, id_template):
    base_url = settings.SITE_URL if hasattr(settings, "SITE_URL") else "http://localhost:8000"
    
    context = {
        "employee": employee,
        "template": id_template,
        "profile_image_url": get_abs_url(employee.profile_image, base_url),
        "org_logo_url": get_abs_url(employee.organization.company_logo, base_url) if employee.organization else "",
        "front_bg_url": get_abs_url(id_template.front_background_image, base_url) if id_template else "",
        "back_bg_url": get_abs_url(id_template.back_background_image, base_url) if id_template else "",
        "signature_url": get_abs_url(id_template.authorized_signature_image, base_url) if id_template else "",
    }
    html_content = render_to_string("id_card_template.html", context)
    
    result = BytesIO()
    pdf = pisa.pisaDocument(BytesIO(html_content.encode("utf-8")), result, encoding="UTF-8")
    if not pdf.err:
        return result.getvalue()
    raise Exception(f"Failed to generate ID Card: {pdf.err}")

