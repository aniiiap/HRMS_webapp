from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CompanyAnnouncementViewSet,
    LoginView,
    MeView,
    NotificationViewSet,
    RefreshView,
    UserViewSet,
    invite_accept_view,
    invite_resend_view,
    notifications_mark_all_read_view,
    logout_view,
    password_reset_confirm_view,
    password_reset_request_view,
)

router = DefaultRouter()
router.register("users", UserViewSet, basename="user")
router.register("notifications", NotificationViewSet, basename="notification")
router.register("announcements", CompanyAnnouncementViewSet, basename="announcement")

urlpatterns = [
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/refresh/", RefreshView.as_view(), name="refresh"),
    path("auth/logout/", logout_view, name="logout"),
    path("auth/me/", MeView.as_view(), name="me"),
    path("auth/invite/accept/", invite_accept_view, name="invite-accept"),
    path("auth/invite/resend/", invite_resend_view, name="invite-resend"),
    path("auth/password-reset/request/", password_reset_request_view, name="password-reset-request"),
    path("auth/password-reset/confirm/", password_reset_confirm_view, name="password-reset-confirm"),
    path("notifications/mark-all-read/", notifications_mark_all_read_view, name="notifications-mark-all-read"),
    path("", include(router.urls)),
]
