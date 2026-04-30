from calendar import monthrange
from datetime import date, timedelta
import csv

from django.core.cache import cache
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from accounts.models import UserRole
from accounts.notifications import notify_roles, notify_user
from accounts.async_tasks import send_html_email_async
from accounts.permissions import IsManagerOrAbove
from employees.models import Employee
from leave_management.models import LeaveRequest, LeaveStatus, LeaveType

from .models import Attendance, AttendanceCorrectionRequest, AttendanceCorrectionStatus, AttendanceCorrectionType
from .serializers import (
    AttendanceCorrectionCreateSerializer,
    AttendanceCorrectionRequestSerializer,
    AttendanceCorrectionReviewSerializer,
    AttendanceSerializer,
    CheckInSerializer,
    CheckOutSerializer,
)


class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.select_related("employee", "employee__user").all()
    serializer_class = AttendanceSerializer
    filterset_fields = ["employee", "date"]
    ordering_fields = ["date", "check_in", "check_out"]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "attendance_read"

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

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy", "review_correction"):
            return [permissions.IsAuthenticated(), IsManagerOrAbove()]
        return [permissions.IsAuthenticated()]

    def get_throttles(self):
        if self.action in ("check_in", "check_out"):
            self.throttle_scope = "attendance_punch"
        elif self.action in ("request_correction",):
            self.throttle_scope = "attendance_correction_request"
        elif self.action in ("review_correction",):
            self.throttle_scope = "attendance_correction_review"
        else:
            self.throttle_scope = "attendance_read"
        return super().get_throttles()

    @action(detail=False, methods=["post"])
    def check_in(self, request):
        profile = getattr(request.user, "employee_profile", None)
        if not profile:
            return Response({"error": "No employee profile linked."}, status=status.HTTP_400_BAD_REQUEST)
        ser = CheckInSerializer(data=request.data, context={"employee": profile})
        ser.is_valid(raise_exception=True)
        att = ser.save()
        return Response(AttendanceSerializer(att).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"])
    def check_out(self, request):
        profile = getattr(request.user, "employee_profile", None)
        if not profile:
            return Response({"error": "No employee profile linked."}, status=status.HTTP_400_BAD_REQUEST)
        ser = CheckOutSerializer(data=request.data, context={"employee": profile})
        ser.is_valid(raise_exception=True)
        att = ser.save()
        return Response(AttendanceSerializer(att).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated, IsManagerOrAbove])
    def heatmap(self, request):
        today = date.today()
        year = int(request.query_params.get("year", today.year))
        month = int(request.query_params.get("month", today.month))
        cache_key = f"attendance:heatmap:{request.user.id}:{year}:{month}"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)
        _, last_day = monthrange(year, month)
        start = date(year, month, 1)
        end = date(year, month, last_day)

        # Build employee list from Employee table (not Attendance rows),
        # so each employee appears exactly once.
        user = request.user
        emp_qs = Employee.objects.select_related("user")
        if not (user.is_superuser or user.role in (UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)):
            profile = getattr(user, "employee_profile", None)
            if not profile:
                return Response({"year": year, "month": month, "days_in_month": last_day, "rows": [], "legend": {}})
            emp_qs = emp_qs.filter(pk=profile.pk)

        employees = list(
            emp_qs.only(
                "id",
                "employee_code",
                "department",
                "designation",
                "profile_image",
                "user__first_name",
                "user__last_name",
                "user__email",
            )
        )
        employee_ids = [e.id for e in employees]

        att_qs = Attendance.objects.filter(
            employee_id__in=employee_ids,
            date__gte=start,
            date__lte=end,
        ).values("employee_id", "date", "check_in", "check_out")

        att_map = {}
        for row in att_qs:
            eid = row["employee_id"]
            d = row["date"].day
            status_value = "present" if (row["check_in"] and row["check_out"]) else "absent"
            att_map.setdefault(eid, {})[d] = status_value

        leave_qs = LeaveRequest.objects.filter(
            employee_id__in=employee_ids,
            status=LeaveStatus.APPROVED,
            start_date__lte=end,
            end_date__gte=start,
        ).values("employee_id", "start_date", "end_date")

        leave_map = {}
        for row in leave_qs:
            eid = row["employee_id"]
            cur = max(row["start_date"], start)
            lim = min(row["end_date"], end)
            while cur <= lim:
                leave_map.setdefault(eid, set()).add(cur.day)
                cur += timedelta(days=1)

        rows = []
        for e in employees:
            eid = e.id
            name = f"{e.user.first_name} {e.user.last_name}".strip() or e.user.email
            profile_image = e.profile_image
            profile_image_url = None
            if profile_image:
                try:
                    profile_image_url = profile_image.url
                except Exception:
                    profile_image_url = None
            day_status = {}
            for d in range(1, last_day + 1):
                day_date = date(year, month, d)
                if day_date.weekday() >= 5:
                    day_status[str(d)] = "weekend"
                    continue
                if d in leave_map.get(eid, set()):
                    day_status[str(d)] = "leave"
                    continue
                day_status[str(d)] = att_map.get(eid, {}).get(d, "no_record")
            rows.append(
                {
                    "employee_id": eid,
                    "employee_code": e.employee_code,
                    "name": name,
                    "department": e.department or "",
                    "designation": e.designation or "",
                    "profile_image": profile_image_url,
                    "days": day_status,
                }
            )

        rows.sort(key=lambda r: (r["department"], r["name"]))
        payload = {
            "year": year,
            "month": month,
            "days_in_month": last_day,
            "rows": rows,
            "legend": {
                "present": "#22c55e",
                "absent": "#ef4444",
                "leave": "#8b5cf6",
                "weekend": "#cbd5e1",
                "no_record": "#f8fafc",
            },
        }
        cache.set(cache_key, payload, timeout=60)
        return Response(payload)

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated, IsManagerOrAbove])
    def export(self, request):
        today = date.today()
        year = int(request.query_params.get("year", today.year))
        month = int(request.query_params.get("month", today.month))
        _, last_day = monthrange(year, month)
        start = date(year, month, 1)
        end = date(year, month, last_day)
        qs = (
            Attendance.objects.select_related("employee", "employee__user")
            .filter(date__gte=start, date__lte=end)
            .order_by("date", "employee__employee_code")
        )
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="attendance_{year}_{month:02d}.csv"'
        writer = csv.writer(response)
        writer.writerow(["Date", "Employee Code", "Employee Name", "Department", "Check In", "Check Out", "Status", "Notes"])
        for row in qs:
            name = f"{row.employee.user.first_name} {row.employee.user.last_name}".strip() or row.employee.user.email
            status_value = "present" if row.check_in and row.check_out else "absent"
            writer.writerow(
                [
                    row.date.isoformat(),
                    row.employee.employee_code,
                    name,
                    row.employee.department or "",
                    row.check_in.isoformat() if row.check_in else "",
                    row.check_out.isoformat() if row.check_out else "",
                    status_value,
                    row.notes or "",
                ]
            )
        return response

    @action(detail=True, methods=["post"])
    def request_correction(self, request, pk=None):
        attendance = self.get_object()
        profile = getattr(request.user, "employee_profile", None)
        if not profile or profile.id != attendance.employee_id:
            return Response({"error": "You can only request correction for your own attendance."}, status=status.HTTP_403_FORBIDDEN)
        ser = AttendanceCorrectionCreateSerializer(data=request.data, context={"attendance": attendance, "requested_by": request.user})
        ser.is_valid(raise_exception=True)
        correction = ser.save()

        emp_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.email
        notify_roles(
            title="Attendance correction request",
            message=f"{emp_name} requested {correction.request_type.replace('_', ' ')} for {attendance.date.isoformat()}.",
            type_value="attendance_correction",
        )
        return Response(AttendanceCorrectionRequestSerializer(correction).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated, IsManagerOrAbove])
    def correction_requests(self, request):
        qs = AttendanceCorrectionRequest.objects.select_related(
            "attendance",
            "attendance__employee",
            "attendance__employee__user",
            "reviewed_by",
        ).all()
        return Response(AttendanceCorrectionRequestSerializer(qs, many=True).data)

    @action(detail=False, methods=["post"], permission_classes=[permissions.IsAuthenticated, IsManagerOrAbove])
    def review_correction(self, request):
        correction_id = request.data.get("correction_id")
        correction = AttendanceCorrectionRequest.objects.select_related("attendance", "attendance__employee", "attendance__employee__user").filter(pk=correction_id).first()
        if not correction:
            return Response({"error": "Correction request not found."}, status=status.HTTP_404_NOT_FOUND)
        if correction.status != AttendanceCorrectionStatus.PENDING:
            return Response({"error": "Correction request already processed."}, status=status.HTTP_400_BAD_REQUEST)

        ser = AttendanceCorrectionReviewSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        decision = ser.validated_data["status"]
        note = ser.validated_data.get("review_note", "")
        correction.status = decision
        correction.review_note = note
        correction.reviewed_by = request.user
        correction.reviewed_at = timezone.now()
        correction.save(update_fields=["status", "review_note", "reviewed_by", "reviewed_at", "updated_at"])

        attendance = correction.attendance
        if decision == AttendanceCorrectionStatus.APPROVED:
            if correction.request_type == AttendanceCorrectionType.MARK_PRESENT and not attendance.check_out:
                attendance.check_out = correction.requested_check_out or timezone.now()
                attendance.save(update_fields=["check_out", "updated_at"])
            elif correction.request_type == AttendanceCorrectionType.MARK_EXACT_TIME:
                attendance.check_out = correction.requested_check_out or attendance.check_out
                attendance.save(update_fields=["check_out", "updated_at"])
            elif correction.request_type == AttendanceCorrectionType.MARK_LEAVE:
                LeaveRequest.objects.get_or_create(
                    employee=attendance.employee,
                    start_date=attendance.date,
                    end_date=attendance.date,
                    defaults={
                        "leave_type": LeaveType.CASUAL,
                        "reason": correction.reason or "Auto-created from attendance correction approval.",
                        "status": LeaveStatus.APPROVED,
                        "reviewed_by": request.user,
                        "reviewed_at": timezone.now(),
                        "review_note": "Approved via attendance correction flow.",
                    },
                )

        employee_user = attendance.employee.user
        notify_user(
            user=employee_user,
            title=f"Attendance correction {decision}",
            message=f"Your attendance correction for {attendance.date.isoformat()} was {decision}.",
            type_value="attendance_correction_review",
        )
        send_html_email_async(
            to_email=employee_user.email,
            subject=f"Attendance correction {decision.title()} - HR Core",
            html=f"""
            <div style="font-family: Arial, sans-serif; line-height:1.6;">
              <p>Dear {(employee_user.first_name or employee_user.email)},</p>
              <p>Your attendance correction request has been <b>{decision}</b>.</p>
              <p><b>Date:</b> {attendance.date.isoformat()}<br/>
              <b>Review note:</b> {note or "-"}</p>
              <p>Regards,<br/>HR Core Team</p>
            </div>
            """,
        )
        return Response(AttendanceCorrectionRequestSerializer(correction).data, status=status.HTTP_200_OK)
