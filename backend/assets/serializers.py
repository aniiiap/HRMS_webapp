from rest_framework import serializers
from .models import Asset, AssetAssignment, AssetCategory
from employees.serializers import EmployeeSerializer

class AssetCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetCategory
        fields = ['id', 'name', 'created_at']

class AssetAssignmentSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.user.get_full_name', read_only=True)
    employee_department = serializers.CharField(source='employee.department.name', read_only=True)

    class Meta:
        model = AssetAssignment
        fields = ['id', 'asset', 'employee', 'employee_name', 'employee_department', 'assigned_date', 'returned_date', 'condition_notes', 'created_at', 'updated_at']

class AssetSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    current_assignment = serializers.SerializerMethodField()
    assignments = AssetAssignmentSerializer(many=True, read_only=True)

    class Meta:
        model = Asset
        fields = ['id', 'name', 'category', 'category_name', 'serial_number', 'purchase_date', 'warranty_expiry_date', 'status', 'current_assignment', 'assignments', 'created_at', 'updated_at']
        read_only_fields = ['organization']

    def get_current_assignment(self, obj):
        assignment = obj.assignments.filter(returned_date__isnull=True).order_by('-assigned_date').first()
        if assignment:
            return {
                'id': assignment.id,
                'employee_id': assignment.employee.id,
                'employee_name': assignment.employee.user.get_full_name(),
                'assigned_date': assignment.assigned_date
            }
        return None
