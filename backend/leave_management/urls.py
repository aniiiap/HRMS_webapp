from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import LeavePolicyViewSet, LeaveRequestViewSet, LeaveTypeRuleViewSet

router = DefaultRouter()
router.register("leaves", LeaveRequestViewSet, basename="leave")
router.register("leave-policies", LeavePolicyViewSet, basename="leave-policy")
router.register("leave-rules", LeaveTypeRuleViewSet, basename="leave-rule")
from .views import HolidayViewSet
router.register("holidays", HolidayViewSet, basename="holiday")

urlpatterns = [path("", include(router.urls))]
