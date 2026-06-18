from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import PlatformDashboardView, PlatformOrganizationViewSet

router = DefaultRouter()
router.register("organizations", PlatformOrganizationViewSet, basename="platform-organization")

urlpatterns = [
    path("dashboard/", PlatformDashboardView.as_view(), name="platform-dashboard"),
    path("", include(router.urls)),
]
