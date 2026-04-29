from decimal import Decimal

from rest_framework import serializers

from .models import PayrollRecord


class PayrollRecordSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()

    class Meta:
        model = PayrollRecord
        fields = (
            "id",
            "employee",
            "employee_name",
            "period_year",
            "period_month",
            "basic_salary",
            "allowances",
            "deductions",
            "tax",
            "net_salary",
            "notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at", "employee_name")

    def get_employee_name(self, obj):
        u = obj.employee.user
        return f"{u.first_name} {u.last_name}".strip() or u.email

    @staticmethod
    def _net(basic: Decimal, allowances: Decimal, deductions: Decimal, tax: Decimal) -> Decimal:
        return basic + allowances - deductions - tax

    def create(self, validated_data):
        basic = validated_data["basic_salary"]
        allowances = validated_data.get("allowances", Decimal("0"))
        deductions = validated_data.get("deductions", Decimal("0"))
        tax = validated_data.get("tax", Decimal("0"))
        if "net_salary" not in validated_data or validated_data.get("net_salary") is None:
            validated_data["net_salary"] = self._net(basic, allowances, deductions, tax)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        basic = validated_data.get("basic_salary", instance.basic_salary)
        allowances = validated_data.get("allowances", instance.allowances)
        deductions = validated_data.get("deductions", instance.deductions)
        tax = validated_data.get("tax", instance.tax)
        if "net_salary" not in validated_data:
            validated_data["net_salary"] = self._net(basic, allowances, deductions, tax)
        return super().update(instance, validated_data)
