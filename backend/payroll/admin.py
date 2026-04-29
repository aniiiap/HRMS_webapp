from django.contrib import admin

from .models import PayrollRecord


@admin.register(PayrollRecord)
class PayrollRecordAdmin(admin.ModelAdmin):
    list_display = ("employee", "period_year", "period_month", "net_salary")
    list_filter = ("period_year", "period_month")
