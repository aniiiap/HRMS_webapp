from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import PayrollRecordViewSet

router = DefaultRouter()
router.register("payroll", PayrollRecordViewSet, basename="payroll")

urlpatterns = [path("", include(router.urls))]
