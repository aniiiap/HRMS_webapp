from django.contrib import admin

from .models import (
    EmployeePayrollProfile,
    EmployeeSalaryLine,
    PayrollComponent,
    PayrollEmployeeResult,
    PayrollRecord,
    PayrollResultLine,
    PayrollRun,
    PayrollStatutoryConfig,
    PayrollTaxDeclaration,
)


@admin.register(PayrollRecord)
class PayrollRecordAdmin(admin.ModelAdmin):
    list_display = ("employee", "period_year", "period_month", "net_salary")
    list_filter = ("period_year", "period_month")


@admin.register(PayrollComponent)
class PayrollComponentAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "organization", "kind", "category", "is_system")
    list_filter = ("organization", "kind", "category")


@admin.register(EmployeeSalaryLine)
class EmployeeSalaryLineAdmin(admin.ModelAdmin):
    list_display = ("employee", "component", "calculation_mode", "monthly_amount", "effective_from")
    list_filter = ("calculation_mode",)


@admin.register(EmployeePayrollProfile)
class EmployeePayrollProfileAdmin(admin.ModelAdmin):
    list_display = ("employee", "organization", "pf_eligible", "esi_eligible")


@admin.register(PayrollStatutoryConfig)
class PayrollStatutoryConfigAdmin(admin.ModelAdmin):
    list_display = ("organization", "pf_enabled", "esi_enabled", "tds_regime")


@admin.register(PayrollRun)
class PayrollRunAdmin(admin.ModelAdmin):
    list_display = ("organization", "period_year", "period_month", "status", "working_days")
    list_filter = ("status", "organization")


@admin.register(PayrollEmployeeResult)
class PayrollEmployeeResultAdmin(admin.ModelAdmin):
    list_display = ("run", "employee", "net_pay", "paid_days", "is_on_hold")
    list_filter = ("is_on_hold",)


@admin.register(PayrollResultLine)
class PayrollResultLineAdmin(admin.ModelAdmin):
    list_display = ("result", "component", "amount_prorated")


@admin.register(PayrollTaxDeclaration)
class PayrollTaxDeclarationAdmin(admin.ModelAdmin):
    list_display = ("employee", "financial_year", "status")
