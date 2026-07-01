from rest_framework import viewsets, permissions, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import ExpenseCategory, ExpenseClaim, ExpenseClaimStatus
from .serializers import ExpenseCategorySerializer, ExpenseClaimSerializer
from employees.models import Employee

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
        if user.is_superuser or user.role in ["admin", "hr", "manager", "owner"]:
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
        
        serializer.save(employee=employee)

    # Only admins can approve or reject
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        if not (request.user.is_superuser or request.user.role in ["admin", "hr", "manager", "owner"]):
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
        
        return Response(ExpenseClaimSerializer(claim).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        if not (request.user.is_superuser or request.user.role in ["admin", "hr", "manager", "owner"]):
            return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)
            
        claim = self.get_object()
        if claim.status != ExpenseClaimStatus.PENDING:
            return Response({"detail": "Only pending claims can be rejected."}, status=status.HTTP_400_BAD_REQUEST)
            
        admin_note = request.data.get('admin_note', '')
        
        claim.status = ExpenseClaimStatus.REJECTED
        claim.admin_note = admin_note
        claim.save()
        
        return Response(ExpenseClaimSerializer(claim).data)

    @action(detail=True, methods=['post'])
    def reimburse(self, request, pk=None):
        if not (request.user.is_superuser or request.user.role in ["admin", "hr", "manager", "owner"]):
            return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)
            
        claim = self.get_object()
        if claim.status != ExpenseClaimStatus.APPROVED:
            return Response({"detail": "Only approved claims can be marked as reimbursed."}, status=status.HTTP_400_BAD_REQUEST)
            
        claim.is_reimbursed = True
        claim.save()
        
        return Response(ExpenseClaimSerializer(claim).data)

    @action(detail=True, methods=['post'])
    def toggle_payroll(self, request, pk=None):
        if not (request.user.is_superuser or request.user.role in ["admin", "hr", "manager", "owner"]):
            return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)
            
        claim = self.get_object()
        claim.skip_payroll = not claim.skip_payroll
        claim.save()
        
        return Response(ExpenseClaimSerializer(claim).data)

    @action(detail=False, methods=['post'])
    def bulk_approve(self, request):
        if not (request.user.is_superuser or request.user.role in ["admin", "hr", "manager", "owner"]):
            return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)
            
        claim_ids = request.data.get('claim_ids', [])
        if not claim_ids:
            return Response({"detail": "No claim IDs provided."}, status=status.HTTP_400_BAD_REQUEST)
            
        qs = self.get_queryset().filter(id__in=claim_ids, status=ExpenseClaimStatus.PENDING)
        updated_count = qs.update(
            status=ExpenseClaimStatus.APPROVED,
            admin_note="Bulk approved by admin"
        )
        return Response({"detail": f"{updated_count} claims approved."})

    @action(detail=False, methods=['post'])
    def bulk_reject(self, request):
        if not (request.user.is_superuser or request.user.role in ["admin", "hr", "manager", "owner"]):
            return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)
            
        claim_ids = request.data.get('claim_ids', [])
        if not claim_ids:
            return Response({"detail": "No claim IDs provided."}, status=status.HTTP_400_BAD_REQUEST)
            
        qs = self.get_queryset().filter(id__in=claim_ids, status=ExpenseClaimStatus.PENDING)
        updated_count = qs.update(
            status=ExpenseClaimStatus.REJECTED,
            admin_note="Bulk rejected by admin"
        )
        return Response({"detail": f"{updated_count} claims rejected."})
