from django.contrib import admin
from .models import LetterTemplate, SentLetter

@admin.register(LetterTemplate)
class LetterTemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "organization", "created_at")
    list_filter = ("organization",)
    search_fields = ("name", "organization__name")

@admin.register(SentLetter)
class SentLetterAdmin(admin.ModelAdmin):
    list_display = ("employee", "organization", "template", "sent_at")
    list_filter = ("organization",)
    search_fields = ("employee__user__email", "organization__name")
