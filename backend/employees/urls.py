from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import EmployeeDocumentViewSet, EmployeeViewSet, OrganizationViewSet

router = DefaultRouter()
router.register("organizations", OrganizationViewSet, basename="organization")
router.register("employees", EmployeeViewSet, basename="employee")
router.register("documents", EmployeeDocumentViewSet, basename="employee-document")
from .views import ResignationViewSet
router.register("resignations", ResignationViewSet, basename="resignation")

urlpatterns = [path("", include(router.urls))]
