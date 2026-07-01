from rest_framework import serializers
from .models import ExpenseCategory, ExpenseClaim

class ExpenseCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseCategory
        fields = ['id', 'name', 'description']

class ExpenseClaimSerializer(serializers.ModelSerializer):
    category = serializers.PrimaryKeyRelatedField(queryset=ExpenseCategory.objects.all(), required=False, allow_null=True)
    category_name = serializers.SerializerMethodField()

    def get_category_name(self, obj):
        return obj.category.name if obj.category else None

    employee_name = serializers.CharField(source='employee.user.get_full_name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_code', read_only=True)

    class Meta:
        model = ExpenseClaim
        fields = [
            'id', 'employee', 'employee_name', 'employee_code',
            'category', 'category_name', 'title', 'amount', 
            'date_incurred', 'receipt', 'notes', 'status',
            'approved_amount', 'admin_note', 'is_reimbursed',
            'skip_payroll', 'payroll_run', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'employee', 'status', 'approved_amount', 'admin_note', 
            'is_reimbursed', 'skip_payroll', 'payroll_run'
        ]
