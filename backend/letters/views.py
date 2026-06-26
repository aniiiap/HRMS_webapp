import io
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.files.base import ContentFile
from django.utils import timezone
from .models import LetterTemplate, SentLetter
from employees.models import Employee
from .serializers import LetterTemplateSerializer, SentLetterSerializer, SendLetterRequestSerializer
from .services import generate_pdf_from_html, send_letter_email, render_template_variables

class LetterTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = LetterTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if hasattr(self.request.user, 'role') and self.request.user.role == 'employee':
            return LetterTemplate.objects.none()
        return LetterTemplate.objects.filter(organization=self.request.user.organization)

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)

from rest_framework.pagination import PageNumberPagination

class SentLetterPagination(PageNumberPagination):
    page_size = 10

class SentLetterViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SentLetterSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = SentLetterPagination
    search_fields = ["subject", "employee__user__first_name", "employee__user__last_name", "template__name"]

    def get_queryset(self):
        if hasattr(self.request.user, 'role') and self.request.user.role == 'employee':
            return SentLetter.objects.filter(employee__user=self.request.user)
        return SentLetter.objects.filter(organization=self.request.user.organization)

    @action(detail=True, methods=["get"], url_path="download")
    def download_pdf(self, request, pk=None):
        from django.http import HttpResponse
        import traceback
        sent_letter = self.get_object()
        if not sent_letter.pdf_file:
            return Response({"error": "No PDF file found."}, status=status.HTTP_404_NOT_FOUND)
        
        if sent_letter.employee.user == request.user and sent_letter.status == "sent":
            sent_letter.status = "viewed"
            sent_letter.save(update_fields=["status"])
        
        try:
            pdf_bytes = sent_letter.pdf_file.read()
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            # Use inline disposition so Chrome PDF viewer opens it
            filename = sent_letter.pdf_file.name.split('/')[-1] if sent_letter.pdf_file.name else 'document.pdf'
            response['Content-Disposition'] = f'inline; filename="{filename}"'
            return response
        except FileNotFoundError:
            return Response({"error": "This older PDF is no longer available due to the storage migration. Please send a new letter."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": f"Failed to read PDF: {str(e)}", "tb": traceback.format_exc()}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=["post"], url_path="send")
    def send_letter(self, request):
        try:
            ser = SendLetterRequestSerializer(data=request.data)
            if not ser.is_valid():
                return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

            data = ser.validated_data
            org = request.user.organization

            employee_ids = data.get("employee_ids", [])
            if not employee_ids:
                return Response({"error": "No employees selected."}, status=status.HTTP_400_BAD_REQUEST)

            employees = Employee.objects.filter(id__in=employee_ids, organization=org)
            if not employees.exists():
                return Response({"error": "Employees not found."}, status=status.HTTP_404_NOT_FOUND)

            template = None
            if data.get("template_id"):
                try:
                    template = LetterTemplate.objects.get(id=data["template_id"], organization=org)
                except LetterTemplate.DoesNotExist:
                    pass

            base_html = data["body_html"]
            subject = data["subject"]
            note = data.get("note", "")
            sent_letters = []

            for employee in employees:
                # Mail merge variables
                html_content = render_template_variables(base_html, employee)
                
                try:
                    pdf_bytes = generate_pdf_from_html(html_content)
                except Exception as e:
                    continue # Skip if PDF fails

                file_name = f"{subject.replace(' ', '_')}.pdf"
                email_html = f"<p>Hi {employee.user.first_name},</p><p>{note}</p><p>Please find the attached document.</p>" if note else f"<p>Hi {employee.user.first_name},</p><p>Please find the attached document.</p>"

                success, msg = send_letter_email(employee, subject, email_html, pdf_bytes, file_name)

                if success:
                    sent_letter = SentLetter(
                        organization=org,
                        employee=employee,
                        template=template,
                        subject=subject,
                        note=note,
                        status="sent"
                    )
                    sent_letter.pdf_file.save(file_name, ContentFile(pdf_bytes), save=False)
                    sent_letter.save()
                    sent_letters.append(sent_letter)

            return Response(SentLetterSerializer(sent_letters, many=True).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            import traceback
            return Response({"error": f"Internal Server Error: {str(e)}", "traceback": traceback.format_exc()}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=["post"], url_path="preview")
    def preview(self, request):
        try:
            ser = SendLetterRequestSerializer(data=request.data)
            if not ser.is_valid():
                return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

            data = ser.validated_data
            org = request.user.organization
            employee_ids = data.get("employee_ids", [])
            
            # For preview, just use the first employee or a dummy if none selected
            employee = None
            if employee_ids:
                employee = Employee.objects.filter(id__in=employee_ids, organization=org).first()

            base_html = data["body_html"]

            if employee:
                html_content = render_template_variables(base_html, employee)
            else:
                html_content = base_html # Or replace with dummy data manually

            pdf_bytes = generate_pdf_from_html(html_content)
            
            from django.http import HttpResponse
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            response['Content-Disposition'] = 'inline; filename="preview.pdf"'
            return response
        except Exception as e:
            import traceback
            return Response({"error": str(e), "traceback": traceback.format_exc()}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=["post"], url_path="sign")
    def sign_document(self, request, pk=None):
        sent_letter = self.get_object()
        if sent_letter.employee.user != request.user:
            return Response({"error": "You can only sign your own documents."}, status=status.HTTP_403_FORBIDDEN)
        
        sent_letter.status = "signed"
        sent_letter.signed_at = timezone.now()
        sent_letter.save(update_fields=["status", "signed_at"])
        return Response(SentLetterSerializer(sent_letter).data)
