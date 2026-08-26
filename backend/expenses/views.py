from rest_framework import viewsets, permissions, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import ExpenseCategory, ExpenseClaim, ExpenseClaimStatus
from .serializers import ExpenseCategorySerializer, ExpenseClaimSerializer
from employees.models import Employee
from accounts.models import UserRole

class ExpenseCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseCategorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated or getattr(user, 'organization', None) is None:
            return ExpenseCategory.objects.all()
        return ExpenseCategory.objects.filter(organization=user.organization)
        return ExpenseCategory.objects.filter(organization=user.organization)

    def perform_create(self, serializer):
        user = self.request.user
        if user.organization:
            serializer.save(organization=user.organization)
        else:
            from employees.models import Organization
            serializer.save(organization=Organization.objects.first())

class ExpenseClaimViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseClaimSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        org = getattr(user, 'organization', None)
        
        if not org:
            qs = ExpenseClaim.objects.all()
        else:
            from django.db.models import Q
            qs = ExpenseClaim.objects.filter(
                Q(employee__organization=org) | Q(employee__user__organization=org)
            )
            
        # If not HR/Admin/Manager, only show their own claims
        # Or if explicitly requested via own=true query parameter
        if self.request.query_params.get('own') == 'true':
            qs = qs.filter(employee__user=user)
        elif user.is_superuser or user.role in ["admin", "hr", "owner"]:
            pass # Keep all claims
        else:
            qs = qs.filter(employee__user=user)
            
        return qs

    def perform_create(self, serializer):
        # Automatically link to the logged-in user's employee record
        user = self.request.user
        try:
            employee = Employee.objects.get(user=user)
        except Employee.DoesNotExist:
            if user.is_superuser or user.role in ["admin", "hr", "manager", "hr_admin", "org_admin", "owner"]:
                employee = Employee.objects.create(
                    user=user,
                    organization=getattr(user, 'organization', None),
                    employee_code=f"ADMIN-{user.id}"
                )
            else:
                raise serializers.ValidationError({"detail": "No employee profile found for the current user."})
        
        claim = serializer.save(employee=employee)
        
        from accounts.notifications import notify_roles
        import base64
        import mimetypes
        import os
        
        emp_name = user.get_full_name() or user.email
        category_name = claim.category.name if claim.category else 'General'
        email_html = f"""
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #2563eb;">New Expense Claim</h2>
            <p><strong>{emp_name}</strong> has submitted a new expense claim.</p>
            <table style="width: 100%; max-width: 500px; border-collapse: collapse; margin-top: 15px;">
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 35%;">Title</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">{claim.title}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Amount</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">₹ {claim.amount}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Category</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">{category_name}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Date Incurred</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">{claim.date_incurred}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Notes</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">{claim.notes or 'No notes provided'}</td>
                </tr>
            </table>
            <p style="margin-top: 20px;">Please log in to the Worksphere dashboard to review and approve/reject this expense.</p>
        </div>
        """
        
        email_attachments = []
        if claim.receipt:
            try:
                claim.receipt.open('rb')
                claim.receipt.seek(0)
                file_bytes = claim.receipt.read()
                if file_bytes:
                    content_b64 = base64.b64encode(file_bytes).decode('utf-8')
                    filename = os.path.basename(claim.receipt.name)
                    mime_type, _ = mimetypes.guess_type(filename)
                    email_attachments.append({
                        "filename": filename,
                        "content": content_b64,
                        "content_type": mime_type or "application/octet-stream"
                    })
                claim.receipt.close()
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning("Could not attach receipt: %s", e)

        target_roles = (UserRole.ADMIN,) if user.role in [UserRole.HR, UserRole.MANAGER] else (UserRole.ADMIN, UserRole.HR)
        notify_roles(
            title="New Expense Claim",
            message=f"{emp_name} submitted an expense claim for ₹ {claim.amount}.",
            type_value=f"expense_{claim.id}",
            roles=target_roles,
            organization_id=claim.employee.organization_id if claim.employee else None,
            send_email=True,
            email_html=email_html,
            email_attachments=email_attachments
        )

    def _notify_expense_decision(self, claim, decision_label):
        from accounts.notifications import notify_user
        from accounts.async_tasks import send_html_email_async
        emp_user = claim.employee.user
        org_name = claim.employee.organization.name if claim.employee and claim.employee.organization else ""
        org_block = f"<br/><b>{org_name}</b>" if org_name else ""
        
        notify_user(
            user=emp_user,
            title=f"Expense Claim {decision_label.capitalize()}",
            message=f"Your expense claim '{claim.title}' for ₹ {claim.amount} was {decision_label}.",
            type_value="expense_reviewed",
        )
        send_html_email_async(
            to_email=emp_user.email,
            subject=f"Your expense claim was {decision_label} - Worksphere",
            html=f"""
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
              <p>Dear {(emp_user.first_name or emp_user.email)},</p>
              <p>Your expense claim has been <b>{decision_label}</b>.</p>
              <p>
                <b>Title:</b> {claim.title}<br/>
                <b>Amount:</b> ₹ {claim.amount}<br/>
                <b>Admin Note:</b> {claim.admin_note or "-"}<br/>
              </p>
              <p>Regards,<br/>Worksphere Team{org_block}</p>
            </div>
            """,
        )

    # Only admins can approve or reject
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        if not (request.user.is_superuser or request.user.role in ["admin", "hr", "owner"]):
            return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)
            
        claim = self.get_object()
        if claim.status != ExpenseClaimStatus.PENDING:
            return Response({"detail": "Only pending claims can be approved."}, status=status.HTTP_400_BAD_REQUEST)
            
        approved_amount = request.data.get('approved_amount', claim.amount)
        admin_note = request.data.get('admin_note', '')
        
        claim.status = ExpenseClaimStatus.APPROVED
        claim.approved_amount = approved_amount
        claim.admin_note = admin_note
        claim.save()
        
        self._notify_expense_decision(claim, "approved")
        
        return Response(ExpenseClaimSerializer(claim).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        if not (request.user.is_superuser or request.user.role in ["admin", "hr", "owner"]):
            return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)
            
        claim = self.get_object()
        if claim.status != ExpenseClaimStatus.PENDING:
            return Response({"detail": "Only pending claims can be rejected."}, status=status.HTTP_400_BAD_REQUEST)
            
        admin_note = request.data.get('admin_note', '')
        
        claim.status = ExpenseClaimStatus.REJECTED
        claim.admin_note = admin_note
        claim.save()
        
        self._notify_expense_decision(claim, "rejected")
        
        return Response(ExpenseClaimSerializer(claim).data)

    @action(detail=True, methods=['post'])
    def reimburse(self, request, pk=None):
        if not (request.user.is_superuser or request.user.role in ["admin", "hr", "owner"]):
            return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)
            
        claim = self.get_object()
        if claim.status != ExpenseClaimStatus.APPROVED:
            return Response({"detail": "Only approved claims can be marked as reimbursed."}, status=status.HTTP_400_BAD_REQUEST)
            
        claim.is_reimbursed = True
        claim.save()
        
        return Response(ExpenseClaimSerializer(claim).data)

    @action(detail=True, methods=['post'])
    def toggle_payroll(self, request, pk=None):
        if not (request.user.is_superuser or request.user.role in ["admin", "hr", "owner"]):
            return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)
            
        claim = self.get_object()
        claim.skip_payroll = not claim.skip_payroll
        claim.save()
        
        return Response(ExpenseClaimSerializer(claim).data)

    @action(detail=False, methods=['post'])
    def bulk_approve(self, request):
        if not (request.user.is_superuser or request.user.role in ["admin", "hr", "owner"]):
            return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)
            
        claim_ids = request.data.get('claim_ids', [])
        if not claim_ids:
            return Response({"detail": "No claim IDs provided."}, status=status.HTTP_400_BAD_REQUEST)
            
        qs = self.get_queryset().filter(id__in=claim_ids, status=ExpenseClaimStatus.PENDING)
        claims_to_notify = list(qs)
        
        updated_count = qs.update(
            status=ExpenseClaimStatus.APPROVED,
            admin_note="Bulk approved by admin"
        )
        
        for claim in claims_to_notify:
            claim.status = ExpenseClaimStatus.APPROVED
            claim.admin_note = "Bulk approved by admin"
            self._notify_expense_decision(claim, "approved")
            
        return Response({"detail": f"{updated_count} claims approved."})

    @action(detail=False, methods=['post'])
    def bulk_reject(self, request):
        if not (request.user.is_superuser or request.user.role in ["admin", "hr", "owner"]):
            return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)
            
        claim_ids = request.data.get('claim_ids', [])
        if not claim_ids:
            return Response({"detail": "No claim IDs provided."}, status=status.HTTP_400_BAD_REQUEST)
            
        qs = self.get_queryset().filter(id__in=claim_ids, status=ExpenseClaimStatus.PENDING)
        claims_to_notify = list(qs)
        
        updated_count = qs.update(
            status=ExpenseClaimStatus.REJECTED,
            admin_note="Bulk rejected by admin"
        )
        
        for claim in claims_to_notify:
            claim.status = ExpenseClaimStatus.REJECTED
            claim.admin_note = "Bulk rejected by admin"
            self._notify_expense_decision(claim, "rejected")
            
        return Response({"detail": f"{updated_count} claims rejected."})
