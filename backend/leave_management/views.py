from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from accounts.models import UserRole
from accounts.notifications import notify_roles, notify_user
from accounts.permissions import IsManagerOrAbove
from accounts.async_tasks import send_html_email_async

from .models import LeaveRequest, LeaveStatus
from .serializers import LeaveRequestSerializer, LeaveReviewSerializer


def _apply_review(leave: LeaveRequest, reviewer, status_value: str, note: str):
    if leave.status != LeaveStatus.PENDING:
        raise ValueError("Leave is already processed.")
    leave.status = status_value
    leave.review_note = note or ""
    leave.reviewed_by = reviewer
    leave.reviewed_at = timezone.now()
    leave.save(update_fields=["status", "review_note", "reviewed_by", "reviewed_at", "updated_at"])
    return leave


class LeaveRequestViewSet(viewsets.ModelViewSet):
    queryset = LeaveRequest.objects.select_related(
        "employee", "employee__user", "reviewed_by"
    ).all()
    serializer_class = LeaveRequestSerializer
    filterset_fields = ["employee", "status", "leave_type"]
    ordering_fields = ["created_at", "start_date", "end_date"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return qs.none()
        if user.is_superuser or user.role in (
            UserRole.ADMIN,
            UserRole.HR,
            UserRole.MANAGER,
        ):
            return qs
        profile = getattr(user, "employee_profile", None)
        if profile:
            return qs.filter(employee=profile)
        return qs.none()

    def perform_create(self, serializer):
        user = self.request.user
        profile = getattr(user, "employee_profile", None)
        employee_from_payload = serializer.validated_data.get("employee")
        if employee_from_payload is not None:
            leave = serializer.save()
        else:
            if not profile:
                raise ValidationError({"employee": "No employee profile is linked to this account."})
            leave = serializer.save(employee=profile)
        emp_name = (
            profile.user.get_full_name() or profile.user.email
            if profile
            else (leave.employee.user.get_full_name() or leave.employee.user.email)
        )
        notify_roles(
            title="New leave request",
            message=f"{emp_name} applied for leave ({leave.start_date} to {leave.end_date}).",
            type_value="leave_applied",
        )

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[permissions.IsAuthenticated, IsManagerOrAbove],
    )
    def review(self, request, pk=None):
        leave = self.get_object()
        ser = LeaveReviewSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            _apply_review(
                leave,
                request.user,
                ser.validated_data["status"],
                ser.validated_data.get("review_note", ""),
            )
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        days_count = (leave.end_date - leave.start_date).days + 1
        emp_user = leave.employee.user
        decision_label = "approved" if leave.status == LeaveStatus.APPROVED else "rejected"
        notify_user(
            user=emp_user,
            title=f"Leave request {decision_label}",
            message=f"Your leave request for {leave.start_date} to {leave.end_date} was {decision_label}.",
            type_value="leave_reviewed",
        )
        send_html_email_async(
            to_email=emp_user.email,
            subject=f"Your leave request was {decision_label} - HR Core",
            html=f"""
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
              <p>Dear {(emp_user.first_name or emp_user.email)},</p>
              <p>Your leave request has been <b>{decision_label}</b>.</p>
              <p>
                <b>Leave dates:</b> {leave.start_date} to {leave.end_date}<br/>
                <b>No. of days:</b> {days_count}<br/>
                <b>Reason:</b> {leave.reason or "-"}<br/>
                <b>Review note:</b> {leave.review_note or "-"}
              </p>
              <p>Regards,<br/>HR Core Team</p>
            </div>
            """,
        )
        return Response(LeaveRequestSerializer(leave).data)
