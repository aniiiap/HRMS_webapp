from django.db import models
from django.conf import settings

from employees.models import Employee


class Attendance(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="attendances")
    date = models.DateField()
    check_in = models.DateTimeField(null=True, blank=True)
    check_out = models.DateTimeField(null=True, blank=True)
    notes = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-check_in"]
        constraints = [
            models.UniqueConstraint(fields=["employee", "date"], name="unique_attendance_per_day"),
        ]

    def __str__(self):
        return f"{self.employee.employee_code} {self.date}"


class AttendanceCorrectionStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"


class AttendanceCorrectionType(models.TextChoices):
    MARK_PRESENT = "mark_present", "Mark present"
    MARK_EXACT_TIME = "mark_exact_time", "Mark exact time"
    MARK_LEAVE = "mark_leave", "Mark leave"
    MANUAL_REVIEW = "manual_review", "Manual review"


class AttendanceCorrectionRequest(models.Model):
    attendance = models.ForeignKey(Attendance, on_delete=models.CASCADE, related_name="correction_requests")
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="attendance_corrections")
    requested_check_out = models.DateTimeField(null=True, blank=True)
    request_type = models.CharField(
        max_length=20,
        choices=AttendanceCorrectionType.choices,
        default=AttendanceCorrectionType.MARK_PRESENT,
    )
    reason = models.CharField(max_length=500, blank=True)
    status = models.CharField(max_length=20, choices=AttendanceCorrectionStatus.choices, default=AttendanceCorrectionStatus.PENDING)
    review_note = models.CharField(max_length=500, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="attendance_correction_reviews",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.attendance_id} correction ({self.status})"
