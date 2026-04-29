from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import EmployeeDocumentViewSet, EmployeeViewSet

router = DefaultRouter()
router.register("employees", EmployeeViewSet, basename="employee")
router.register("documents", EmployeeDocumentViewSet, basename="employee-document")

urlpatterns = [path("", include(router.urls))]
