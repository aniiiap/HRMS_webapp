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
                
        return queryset

    def perform_create(self, serializer):
        org_id = organization_id_from_request(self.request)
        serializer.save(organization_id=org_id)

    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        if request.user.role == UserRole.EMPLOYEE:
             return Response({'detail': 'Not permitted.'}, status=status.HTTP_403_FORBIDDEN)
             
        asset = self.get_object()
        if asset.status != AssetStatus.AVAILABLE:
            return Response({'detail': 'Asset is not available for assignment.'}, status=status.HTTP_400_BAD_REQUEST)
        
        employee_id = request.data.get('employee')
        assigned_date = request.data.get('assigned_date', timezone.now().date())
        
        if not employee_id:
            return Response({'employee': 'This field is required.'}, status=status.HTTP_400_BAD_REQUEST)

        org_id = organization_id_from_request(request)
        from employees.models import Employee
        try:
            employee = Employee.objects.get(id=employee_id, organization_id=org_id)
        except Employee.DoesNotExist:
            return Response({'detail': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

        assignment = AssetAssignment.objects.create(
            asset=asset,
            employee=employee,
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
        if asset.status != AssetStatus.ASSIGNED:
            return Response({'detail': 'Asset is not currently assigned.'}, status=status.HTTP_400_BAD_REQUEST)
        
        assignment = asset.assignments.filter(returned_date__isnull=True).order_by('-assigned_date').first()
        if not assignment:
            return Response({'detail': 'No active assignment found.'}, status=status.HTTP_400_BAD_REQUEST)
            
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
