import json
import urllib.request
import urllib.error
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings

def _send_resend_email(to_emails, subject, html_content, text_content=None, reply_to=None):
    api_key = settings.RESEND_API_KEY
    raw_from_email = settings.RESEND_FROM_EMAIL or 'noreply@globalworksphere.com'
    from_email = f"GlobalWorkSphere <{raw_from_email}>"
    
    if not api_key:
        raise Exception("Email provider is not configured properly.")
    payload = {
        "from": from_email,
        "to": to_emails,
        "subject": subject,
        "html": html_content,
    }
    if text_content:
        payload["text"] = text_content
    if reply_to:
        payload["reply_to"] = reply_to

    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "HRCore/1.0 (+https://globalworksphere.com)",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            if 200 <= resp.status < 300:
                return True
            else:
                raise Exception(f"Resend API returned {resp.status}")
    except urllib.error.HTTPError as e:
        error_msg = e.read().decode()
        print(f"Failed to send email via Resend: {e.code} {error_msg}")
        raise Exception(f"Email delivery failed: {error_msg}")
    except Exception as e:
        print(f"Failed to send email via Resend: {e}")
        raise Exception("Email delivery failed due to a server configuration issue.")

@api_view(['POST'])
@permission_classes([AllowAny])
def contact_us(request):
    try:
        data = request.data
        name = data.get('name')
        email = data.get('email')
        company = data.get('company')
        phone = data.get('phone')
        message = data.get('message')
        employees = data.get('employees', 'Not specified')

        if not all([name, email, message]):
            return Response({'error': 'Name, email and message are required'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Send lead info to admins
        admin_subject = f"Demo Request: {name} from {company or 'No Company'}"
        admin_body = f"""
        <h2>New Demo Request</h2>
        <p><strong>Name:</strong> {name}</p>
        <p><strong>Email:</strong> {email}</p>
        <p><strong>Phone:</strong> {phone}</p>
        <p><strong>Company:</strong> {company}</p>
        <p><strong>Employee Count:</strong> {employees}</p>
        <br/>
        <p><strong>Message:</strong></p>
        <p>{message}</p>
        """
        admin_text = f"New Demo Request\n\nName: {name}\nEmail: {email}\nPhone: {phone}\nCompany: {company}\nEmployee Count: {employees}\n\nMessage:\n{message}"
        _send_resend_email(['globalworksphere@gmail.com'], admin_subject, admin_body, text_content=admin_text, reply_to=email)

        # 2. Send Thank You email to the user
        user_subject = "Thank you for requesting a demo - GlobalWorkSphere"
        user_body = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Hi {name},</h2>
            <p>Thank you for reaching out to GlobalWorkSphere!</p>
            <p>We have received your demo request and our team will get back to you shortly to schedule a personalized walkthrough of our platform.</p>
            <p>In the meantime, feel free to check out our <a href="https://globalworksphere.com">website</a> for more information about our features.</p>
            <br/>
            <p>Best regards,</p>
            <p><strong>The GlobalWorkSphere Team</strong></p>
        </div>
        """
        user_text = f"Hi {name},\n\nThank you for reaching out to GlobalWorkSphere!\nWe have received your demo request and our team will get back to you shortly to schedule a personalized walkthrough of our platform.\n\nBest regards,\nThe GlobalWorkSphere Team"
        _send_resend_email([email], user_subject, user_body, text_content=user_text)
        
        return Response({'message': 'Thank you! Your request has been sent successfully.'})
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
