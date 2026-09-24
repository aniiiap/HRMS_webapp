import io
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.files.base import ContentFile
from django.utils import timezone
from .models import LetterTemplate, SentLetter
from employees.models import Employee, EmployeeDocument
from .serializers import LetterTemplateSerializer, SentLetterSerializer, SendLetterRequestSerializer
from .services import generate_pdf_from_html, send_letter_email, render_template_variables, recipient_email
from accounts.permissions import IsAdminOrHR

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

class SentLetterViewSet(viewsets.ModelViewSet):
    serializer_class = SentLetterSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = SentLetterPagination
    search_fields = ["subject", "employee__user__first_name", "employee__user__last_name", "template__name"]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [permissions.IsAuthenticated(), IsAdminOrHR()]
        return [permissions.IsAuthenticated()]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        # Remove any linked EmployeeDocument entries pointing to this letter
        try:
            from employees.models import EmployeeDocument
            EmployeeDocument.objects.filter(
                employee=instance.employee,
                file=f"/api/letters/history/{instance.id}/download/"
            ).delete()
        except Exception:
            pass
        # Delete the actual PDF file from storage if it exists
        if instance.pdf_file:
            try:
                instance.pdf_file.delete(save=False)
            except Exception:
                pass
        return super().destroy(request, *args, **kwargs)

    def get_queryset(self):
        if hasattr(self.request.user, 'role') and self.request.user.role == 'employee':
            return SentLetter.objects.filter(employee__user=self.request.user)
        return SentLetter.objects.filter(organization=self.request.user.organization)

    @action(detail=True, methods=["get"], url_path="download")
    def download_pdf(self, request, pk=None):
        from django.http import HttpResponse
        import traceback
        sent_letter = self.get_object()
        
        if sent_letter.status == "draft" and sent_letter.draft_html:
            try:
                org = sent_letter.organization if sent_letter.use_letterhead else None
                pdf_bytes = generate_pdf_from_html(sent_letter.draft_html, organization=org)
                response = HttpResponse(pdf_bytes, content_type='application/pdf')
                filename = f"draft_{sent_letter.id}.pdf"
                response['Content-Disposition'] = f'inline; filename="{filename}"'
                return response
            except Exception as e:
                return Response({"error": f"Failed to generate draft PDF: {str(e)}", "tb": traceback.format_exc()}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        if not sent_letter.pdf_file:
            return Response({"error": "No PDF file found."}, status=status.HTTP_404_NOT_FOUND)
        
        if sent_letter.employee.user == request.user and sent_letter.status == "sent":
            sent_letter.status = "viewed"
            sent_letter.save(update_fields=["status"])
        
        try:
            pdf_bytes = sent_letter.pdf_file.read()
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            filename = sent_letter.pdf_file.name.split('/')[-1] if sent_letter.pdf_file.name else 'document.pdf'
            response['Content-Disposition'] = f'inline; filename="{filename}"'
            return response
        except FileNotFoundError:
            return Response({"error": "This older PDF is no longer available."}, status=status.HTTP_404_NOT_FOUND)
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

            email_message = data.get("email_message", "")
            if not email_message and template:
                email_message = template.email_message
            if not email_message:
                email_message = "Please find the attached document. We request you to review, sign, and affix the company seal where required. Once completed, please upload the signed copy to your profile."

            for employee in employees:
                # Mail merge variables
                html_content = render_template_variables(base_html, employee)
                
                try:
                    use_letterhead = data.get("use_letterhead", True)
                    pdf_org = org if use_letterhead else None
                    pdf_bytes = generate_pdf_from_html(html_content, organization=pdf_org)
                except Exception as e:
                    continue # Skip if PDF fails

                file_name = f"{subject.replace(' ', '_')}.pdf"
                
                # Merge note and email_message
                email_content = ""
                if note:
                    email_content += f"<p>{note}</p>"
                email_content += f"<p>{email_message}</p>"
                
                email_html = f"<p>Hi {employee.user.first_name},</p>{email_content}"

                success, msg = send_letter_email(employee, subject, email_html, pdf_bytes, file_name)

                if success:
                    sent_letter = SentLetter(
                        organization=org,
                        employee=employee,
                        template=template,
                        subject=subject,
                        note=note,
                        status="sent",
                        use_letterhead=use_letterhead
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

            use_letterhead = data.get("use_letterhead", True)
            pdf_org = org if use_letterhead else None
            pdf_bytes = generate_pdf_from_html(html_content, organization=pdf_org)
            
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
    @action(detail=False, methods=["post"], url_path="render_html")
    def render_html(self, request):
        """Returns the HTML with variables replaced for a specific employee, so the frontend can edit it."""
        try:
            employee_id = request.data.get("employee_id")
            body_html = request.data.get("body_html", "")
            
            org = request.user.organization
            employee = None
            if employee_id:
                employee = Employee.objects.filter(id=employee_id, organization=org).first()
                
            if not employee:
                return Response({"error": "Employee not found."}, status=status.HTTP_404_NOT_FOUND)
                
            rendered_html = render_template_variables(body_html, employee)
            return Response({"rendered_html": rendered_html})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


    def _attach_to_employee_profile(self, request, employee, title, pdf_bytes, file_name, sent_letter):
        try:
            from employees.models import EmployeeDocument
            doc = EmployeeDocument(
                employee=employee,
                title=title,
                file=f"/api/letters/history/{sent_letter.id}/download/"
            )
            doc.save()
        except Exception as e:
            import traceback
            print(f"Failed to attach document to employee profile: {e}\n{traceback.format_exc()}")

    @action(detail=False, methods=["get"], url_path="generated")
    def generated(self, request):
        queryset = self.get_queryset().filter(status="draft").order_by('-sent_at')
        groups = {}
        for doc in queryset:
            emp_id = doc.employee.id
            if emp_id not in groups:
                groups[emp_id] = {
                    "employee_id": emp_id,
                    "employee_name": doc.employee.user.get_full_name(),
                    "recipient_email": recipient_email(doc.employee),
                    "documents": []
                }
            groups[emp_id]["documents"].append({
                "id": doc.id,
                "subject": doc.subject,
                "sent_at": doc.sent_at,
            })
        return Response({"groups": list(groups.values())})

    @action(detail=True, methods=["post"], url_path="send_generated")
    def send_generated(self, request, pk=None):
        doc = self.get_object()
        if doc.status != "draft":
            return Response({"error": "Only draft documents can be sent."}, status=400)
        org = doc.organization if doc.use_letterhead else None
        pdf_bytes = generate_pdf_from_html(doc.draft_html, organization=org)
        file_name = f"{doc.subject.replace(' ', '_')}.pdf"
        doc.pdf_file.save(file_name, ContentFile(pdf_bytes), save=False)
        doc.status = "sent"
        doc.save()
        self._attach_to_employee_profile(request, doc.employee, doc.subject, pdf_bytes, file_name, doc)
        email_message = doc.template.email_message if doc.template and doc.template.email_message else "Please find the attached document. We request you to review, sign, and affix the company seal where required. Once completed, please upload the signed copy to your profile."
        email_html = f"<p>Hi {doc.employee.user.first_name},</p><p>{email_message}</p>"
        send_letter_email(doc.employee, doc.subject, email_html, pdf_bytes, file_name)
        return Response({"success": True})

    @action(detail=False, methods=["post"], url_path="send_generated_batch")
    def send_generated_batch(self, request):
        employee_id = request.data.get("employee_id")
        docs = self.get_queryset().filter(employee_id=employee_id, status="draft")
        for doc in docs:
            org = doc.organization if doc.use_letterhead else None
            pdf_bytes = generate_pdf_from_html(doc.draft_html, organization=org)
            file_name = f"{doc.subject.replace(' ', '_')}.pdf"
            doc.pdf_file.save(file_name, ContentFile(pdf_bytes), save=False)
            doc.status = "sent"
            doc.save()
            self._attach_to_employee_profile(request, doc.employee, doc.subject, pdf_bytes, file_name, doc)
            email_message = doc.template.email_message if doc.template and doc.template.email_message else "Please find the attached document. We request you to review, sign, and affix the company seal where required. Once completed, please upload the signed copy to your profile."
            email_html = f"<p>Hi {doc.employee.user.first_name},</p><p>{email_message}</p>"
            send_letter_email(doc.employee, doc.subject, email_html, pdf_bytes, file_name)
        return Response({"success": True})
        
    @action(detail=False, methods=["post"], url_path="generate")
    def generate(self, request):
        try:
            ser = SendLetterRequestSerializer(data=request.data)
            if not ser.is_valid(): return Response(ser.errors, status=400)
            data = ser.validated_data
            org = request.user.organization
            employee_ids = data.get("employee_ids", [])
            if not employee_ids: return Response({"error": "No employees selected."}, status=400)
            employees = Employee.objects.filter(id__in=employee_ids, organization=org)
            if not employees.exists(): return Response({"error": "Employees not found."}, status=404)
            template = None
            if data.get("template_id"):
                try: template = LetterTemplate.objects.get(id=data["template_id"], organization=org)
                except: pass
            base_html = data["body_html"]
            subject = data["subject"]
            note = data.get("note", "")
            sent_letters = []
            for employee in employees:
                html_content = render_template_variables(base_html, employee)
                use_letterhead = data.get("use_letterhead", True)
                sent_letter = SentLetter(
                    organization=org, employee=employee, template=template,
                    subject=subject, note=note, status="draft", draft_html=html_content,
                    use_letterhead=use_letterhead
                )
                sent_letter.save()
                self._attach_to_employee_profile(request, employee, subject, None, None, sent_letter)
                sent_letters.append(sent_letter)
            return Response(SentLetterSerializer(sent_letters, many=True).data, status=201)
        except Exception as e:
            import traceback
            return Response({"error": f"Internal Server Error: {str(e)}", "traceback": traceback.format_exc()}, status=500)
