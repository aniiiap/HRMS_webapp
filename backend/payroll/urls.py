from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    EmployeeCompensationViewSet,
    EmployeePayrollProfileViewSet,
    EmployeeSalaryLineViewSet,
    PayrollComponentViewSet,
    PayrollCtcTemplateViewSet,
    PayrollSalaryStructureViewSet,
    PayrollDashboardAPIView,
    PayrollEmployeeResultViewSet,
    PayrollMonthlyHrSummaryExportView,
    PayrollRecordViewSet,
    PayrollRunViewSet,
    PayrollStatutoryConfigViewSet,
    PayrollTaxDeclarationViewSet,
)

router = DefaultRouter()
router.register("payroll/legacy-records", PayrollRecordViewSet, basename="payroll-legacy-record")
router.register("payroll/components", PayrollComponentViewSet, basename="payroll-component")
router.register("payroll/statutory-config", PayrollStatutoryConfigViewSet, basename="payroll-statutory")
router.register("payroll/ctc-template", PayrollCtcTemplateViewSet, basename="payroll-ctc-template")
router.register("payroll/salary-structures", PayrollSalaryStructureViewSet, basename="payroll-salary-structure")
router.register("payroll/runs", PayrollRunViewSet, basename="payroll-run")
router.register("payroll/results", PayrollEmployeeResultViewSet, basename="payroll-result")
router.register("payroll/salary-lines", EmployeeSalaryLineViewSet, basename="payroll-salary-line")
router.register("payroll/profiles", EmployeePayrollProfileViewSet, basename="payroll-profile")
router.register("payroll/tax-declarations", PayrollTaxDeclarationViewSet, basename="payroll-tax-declaration")
router.register("payroll/compensation", EmployeeCompensationViewSet, basename="payroll-compensation")

urlpatterns = [
    path("payroll/dashboard/", PayrollDashboardAPIView.as_view(), name="payroll-dashboard"),
    path(
        "payroll/monthly-hr-summary/",
        PayrollMonthlyHrSummaryExportView.as_view(),
        name="payroll-monthly-hr-summary",
    ),
    path("", include(router.urls)),
]
