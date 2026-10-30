from rest_framework import serializers
from .models import Asset, AssetAssignment, AssetCategory
from employees.serializers import EmployeeSerializer

class AssetCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetCategory
        fields = ['id', 'name', 'created_at']

class AssetAssignmentSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    employee_department = serializers.SerializerMethodField()

    class Meta:
        model = AssetAssignment
        fields = [
            'id', 'asset', 'employee', 'employee_name', 'employee_department',
            'holder_name', 'holder_role',
            'assigned_date', 'returned_date', 'condition_notes', 'created_at', 'updated_at'
        ]

    def get_employee_name(self, obj):
        if obj.employee and obj.employee.user:
            return obj.employee.user.get_full_name()
        return obj.holder_name or ""

    def get_employee_department(self, obj):
        if obj.employee:
            return obj.employee.department or ""
        return obj.holder_role or ""

class AssetSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    serial_number = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    current_assignment = serializers.SerializerMethodField()
    assignments = AssetAssignmentSerializer(many=True, read_only=True)

    class Meta:
        model = Asset
        fields = ['id', 'name', 'category', 'category_name', 'serial_number', 'purchase_date', 'warranty_expiry_date', 'status', 'current_assignment', 'assignments', 'created_at', 'updated_at']
        read_only_fields = ['organization']

    def validate_serial_number(self, value):
        if not value or not str(value).strip():
            return None
        return str(value).strip()

    def get_current_assignment(self, obj):
        assignment = obj.assignments.filter(returned_date__isnull=True).order_by('-assigned_date').first()
        if assignment:
            emp_name = (assignment.employee.user.get_full_name() if (assignment.employee and assignment.employee.user) else assignment.holder_name) or "Unknown"
            emp_dept = (assignment.employee.department if assignment.employee else assignment.holder_role) or ""
            return {
                'id': assignment.id,
                'employee_id': assignment.employee.id if assignment.employee else None,
                'employee_name': emp_name,
                'employee_department': emp_dept,
                'holder_name': assignment.holder_name,
                'holder_role': assignment.holder_role,
                'assigned_date': assignment.assigned_date
            }
        return None
