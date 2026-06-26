from django.db import models
from employees.models import Employee, Organization

class LetterTemplate(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="letter_templates")
    name = models.CharField(max_length=255)
    subject_template = models.CharField(max_length=255, blank=True)
    body_html = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("organization", "name")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.organization.name})"

from django.conf import settings
from django.core.files.storage import FileSystemStorage

local_storage = FileSystemStorage(location=settings.MEDIA_ROOT, base_url=settings.MEDIA_URL)

def get_raw_storage():
    return local_storage

class SentLetter(models.Model):
    STATUS_CHOICES = (
        ("sent", "Sent"),
        ("viewed", "Viewed"),
        ("signed", "Signed"),
    )
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="sent_letters")
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="received_letters")
    template = models.ForeignKey(LetterTemplate, on_delete=models.SET_NULL, null=True, blank=True)
    subject = models.CharField(max_length=255)
    note = models.TextField(blank=True)
    pdf_file = models.FileField(upload_to="sent_letters/", storage=local_storage)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="sent")
    signed_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-sent_at"]

    def __str__(self):
        return f"Letter to {self.employee.user.get_full_name()} at {self.sent_at}"
