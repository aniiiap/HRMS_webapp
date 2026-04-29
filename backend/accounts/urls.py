from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    LoginView,
    MeView,
    NotificationViewSet,
    RefreshView,
    UserViewSet,
    invite_accept_view,
    invite_resend_view,
    notifications_mark_all_read_view,
    logout_view,
)

router = DefaultRouter()
router.register("users", UserViewSet, basename="user")
router.register("notifications", NotificationViewSet, basename="notification")

urlpatterns = [
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/refresh/", RefreshView.as_view(), name="refresh"),
    path("auth/logout/", logout_view, name="logout"),
    path("auth/me/", MeView.as_view(), name="me"),
    path("auth/invite/accept/", invite_accept_view, name="invite-accept"),
    path("auth/invite/resend/", invite_resend_view, name="invite-resend"),
    path("notifications/mark-all-read/", notifications_mark_all_read_view, name="notifications-mark-all-read"),
    path("", include(router.urls)),
]
