from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import LeaveRequestViewSet

router = DefaultRouter()
router.register("leaves", LeaveRequestViewSet, basename="leave")

urlpatterns = [path("", include(router.urls))]
