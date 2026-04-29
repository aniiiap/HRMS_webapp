from django.urls import path

from .views import (
    AttendanceReportView,
    DashboardSummaryView,
    EmployeeDashboardView,
    PayrollReportView,
)

urlpatterns = [
    path("dashboard/", DashboardSummaryView.as_view(), name="report-dashboard"),
    path("me/", EmployeeDashboardView.as_view(), name="report-me"),
    path("attendance/", AttendanceReportView.as_view(), name="report-attendance"),
    path("payroll/", PayrollReportView.as_view(), name="report-payroll"),
]
