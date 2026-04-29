from django.contrib import admin

from .models import Employee, EmployeeDocument


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ("employee_code", "user", "department", "designation", "date_of_joining")
    search_fields = ("employee_code", "user__email")
    list_filter = ("department",)


@admin.register(EmployeeDocument)
class EmployeeDocumentAdmin(admin.ModelAdmin):
    list_display = ("title", "employee", "uploaded_at")
