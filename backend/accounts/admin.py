from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import CompanyAnnouncement, User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    ordering = ("email",)
    list_display = ("email", "first_name", "last_name", "role", "is_staff", "is_active")
    search_fields = ("email", "first_name", "last_name")
    list_filter = ("role", "is_staff", "is_active")

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal", {"fields": ("first_name", "last_name", "role")}),
        (
            "Permissions",
            {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")},
        ),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "password1", "password2", "first_name", "last_name", "role", "is_staff"),
            },
        ),
    )


@admin.register(CompanyAnnouncement)
class CompanyAnnouncementAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "priority",
        "target_audience",
        "target_value",
        "is_active",
        "expires_at",
        "published_at",
        "created_by",
    )
    search_fields = ("title", "message", "created_by__email", "created_by__first_name", "created_by__last_name")
    list_filter = ("priority", "target_audience", "is_active", "published_at", "expires_at")
