from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils import timezone
from .models import Asset, AssetAssignment, AssetStatus, AssetCategory
from .serializers import AssetSerializer, AssetAssignmentSerializer, AssetCategorySerializer
from employees.org_scope import organization_id_from_request
from accounts.models import UserRole

class AssetCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = AssetCategorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        org_id = organization_id_from_request(self.request)
        if not org_id:
            return AssetCategory.objects.none()
        return AssetCategory.objects.filter(organization_id=org_id)

    def perform_create(self, serializer):
        org_id = organization_id_from_request(self.request)
        serializer.save(organization_id=org_id)

    def paginate_queryset(self, queryset):
        if "page" in self.request.query_params and self.request.query_params.get("nopaginate") != "true":
            return super().paginate_queryset(queryset)
        return None

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # If there are any assigned assets, prevent deletion
        assigned_assets = instance.assets.filter(assignments__returned_date__isnull=True).distinct()
        if assigned_assets.exists():
            return Response(
                {"detail": "Cannot delete this category because it has assets currently assigned to employees."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Delete unassigned assets first to satisfy PROTECT constraint
        instance.assets.all().delete()
        
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)

class AssetViewSet(viewsets.ModelViewSet):
    serializer_class = AssetSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        org_id = organization_id_from_request(self.request)
        if not org_id:
            return Asset.objects.none()

        queryset = Asset.objects.filter(organization_id=org_id)
        
        user = self.request.user
        if user.role == UserRole.EMPLOYEE:
            profile = getattr(user, 'employee_profile', None)
            if profile:
                queryset = queryset.filter(assignments__employee=profile, assignments__returned_date__isnull=True).distinct()
            else:
                queryset = Asset.objects.none()
        else:
            # HR/Admin filtering
            employee_id = self.request.query_params.get('employee')
            if employee_id:
                queryset = queryset.filter(assignments__employee_id=employee_id, assignments__returned_date__isnull=True).distinct()
                
        return queryset.select_related('category').prefetch_related(
            'assignments', 'assignments__employee', 'assignments__employee__user'
        )

    def paginate_queryset(self, queryset):
        if "page" in self.request.query_params and self.request.query_params.get("nopaginate") != "true":
            return super().paginate_queryset(queryset)
        return None

    def perform_create(self, serializer):
        org_id = organization_id_from_request(self.request)
        serializer.save(organization_id=org_id)

    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        if request.user.role == UserRole.EMPLOYEE:
             return Response({'detail': 'Not permitted.'}, status=status.HTTP_403_FORBIDDEN)
             
        asset = self.get_object()
        
        # Check for any active assignment regardless of status field (handles data inconsistency)
        active_assignment = asset.assignments.filter(returned_date__isnull=True).order_by('-assigned_date').first()
        if active_assignment:
            emp_name = (active_assignment.employee.user.get_full_name() if (active_assignment.employee and active_assignment.employee.user) else active_assignment.holder_name) or "another user"
            return Response(
                {'detail': f'Asset is already assigned to {emp_name}. Please return it first.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Also check status field for non-assignable statuses (Under Repair, Retired, etc.)
        if asset.status not in (AssetStatus.AVAILABLE, AssetStatus.ASSIGNED):
            return Response({'detail': f'Asset cannot be assigned (current status: {asset.status}).'}, status=status.HTTP_400_BAD_REQUEST)
        
        employee_id = request.data.get('employee')
        holder_name = request.data.get('holder_name', '').strip()
        holder_role = request.data.get('holder_role', '').strip()
        assigned_date = request.data.get('assigned_date', timezone.now().date())
        
        if not employee_id and not holder_name:
            return Response({'detail': 'Either an employee or holder name is required.'}, status=status.HTTP_400_BAD_REQUEST)

        org_id = organization_id_from_request(request)
        employee = None
        if employee_id:
            from employees.models import Employee
            try:
                employee = Employee.objects.get(id=employee_id, organization_id=org_id)
            except Employee.DoesNotExist:
                return Response({'detail': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

        assignment = AssetAssignment.objects.create(
            asset=asset,
            employee=employee,
            holder_name=holder_name if not employee else None,
            holder_role=holder_role if not employee else None,
            assigned_date=assigned_date,
            condition_notes=request.data.get('condition_notes', '')
        )
        
        asset.status = AssetStatus.ASSIGNED
        asset.save()
        
        return Response(AssetAssignmentSerializer(assignment).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def return_asset(self, request, pk=None):
        if request.user.role == UserRole.EMPLOYEE:
             return Response({'detail': 'Not permitted.'}, status=status.HTTP_403_FORBIDDEN)
             
        asset = self.get_object()
        
        assignment = asset.assignments.filter(returned_date__isnull=True).order_by('-assigned_date').first()
        if not assignment:
            return Response({'detail': 'No active assignment found for this asset.'}, status=status.HTTP_400_BAD_REQUEST)
            
        assignment.returned_date = request.data.get('returned_date', timezone.now().date())
        assignment.condition_notes = request.data.get('condition_notes', assignment.condition_notes)
        assignment.save()
        
        asset.status = request.data.get('new_status', AssetStatus.AVAILABLE)
        asset.save()
        
        return Response(AssetAssignmentSerializer(assignment).data)

    @action(detail=False, methods=['post'])
    def bulk_assign(self, request):
        if request.user.role == UserRole.EMPLOYEE:
            return Response({'detail': 'Not permitted.'}, status=status.HTTP_403_FORBIDDEN)
            
        asset_ids = request.data.get('asset_ids', [])
        employee_id = request.data.get('employee')
        assigned_date = request.data.get('assigned_date', timezone.now().date())
        
        if not asset_ids or not employee_id:
            return Response({'detail': 'asset_ids and employee are required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        org_id = organization_id_from_request(request)
        from employees.models import Employee
        try:
            employee = Employee.objects.get(id=employee_id, organization_id=org_id)
        except Employee.DoesNotExist:
            return Response({'detail': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)
            
        assets = Asset.objects.filter(id__in=asset_ids, organization_id=org_id, status=AssetStatus.AVAILABLE)
        
        if not assets.exists():
            return Response({'detail': 'No available assets found from the provided IDs.'}, status=status.HTTP_400_BAD_REQUEST)
            
        assignments = []
        for asset in assets:
            assignment = AssetAssignment(
                asset=asset,
                employee=employee,
                assigned_date=assigned_date,
                condition_notes=request.data.get('condition_notes', '')
            )
            assignments.append(assignment)
            asset.status = AssetStatus.ASSIGNED
            asset.save()
            
        AssetAssignment.objects.bulk_create(assignments)
        
        return Response({'detail': f'Successfully assigned {len(assignments)} assets.'}, status=status.HTTP_201_CREATED)

class AssetAssignmentViewSet(viewsets.ModelViewSet):
    serializer_class = AssetAssignmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def paginate_queryset(self, queryset):
        if "page" in self.request.query_params and self.request.query_params.get("nopaginate") != "true":
            return super().paginate_queryset(queryset)
        return None

    def get_queryset(self):
        org_id = organization_id_from_request(self.request)
        if not org_id:
            return AssetAssignment.objects.none()
            
        queryset = AssetAssignment.objects.filter(asset__organization_id=org_id)
        
        user = self.request.user
        if user.role == UserRole.EMPLOYEE:
            profile = getattr(user, 'employee_profile', None)
            if profile:
                queryset = queryset.filter(employee=profile)
            else:
                queryset = AssetAssignment.objects.none()
                
        return queryset
