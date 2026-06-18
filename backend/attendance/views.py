from calendar import monthrange
from datetime import date, timedelta
import csv
import io

from django.core.cache import cache
from django.db.models import Prefetch
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
from employees.org_scope import (
    filter_by_employee_org,
    filter_employees_by_org,
    organization_id_from_request,
)
from leave_management.models import LeaveRequest, LeaveStatus, LeaveType

from .log_status import day_status_for_employee
from .utils import apply_auto_clock_out, attendance_anomaly
from .models import Attendance, AttendanceCorrectionRequest, AttendanceCorrectionStatus, AttendanceCorrectionType
from .serializers import (
    AttendanceCorrectionCreateSerializer,
    AttendanceCorrectionRequestSerializer,
    AttendanceCorrectionReviewSerializer,
    AttendanceSerializer,
    CheckInSerializer,
    CheckOutSerializer,
)


def _format_csv_date(value):
    if not value:
        return ""
    return value.strftime("%d-%b-%Y")


def _format_csv_datetime(dt):
    if not dt:
        return ""
    return timezone.localtime(dt).strftime("%d-%b-%Y %I:%M %p")


class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.select_related("employee", "employee__user").prefetch_related(
        Prefetch(
            "correction_requests",
            queryset=AttendanceCorrectionRequest.objects.filter(
                status=AttendanceCorrectionStatus.PENDING
            ).order_by("-created_at"),
            to_attr="_pending_corrections",
        ),
    ).all()
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
            org_id = organization_id_from_request(self.request)
            return filter_by_employee_org(qs, org_id)
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
        apply_auto_clock_out(
            Attendance.objects.filter(
                employee=profile,
                check_in__isnull=False,
                check_out__isnull=True,
            ).select_related("employee", "employee__shift_template")
        )
        ser = CheckInSerializer(data=request.data, context={"employee": profile, "request": request})
        ser.is_valid(raise_exception=True)
        att = ser.save()
        return Response(AttendanceSerializer(att).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"])
    def check_out(self, request):
        profile = getattr(request.user, "employee_profile", None)
        if not profile:
            return Response({"error": "No employee profile linked."}, status=status.HTTP_400_BAD_REQUEST)
        ser = CheckOutSerializer(data=request.data, context={"employee": profile, "request": request})
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
        org_id = organization_id_from_request(request)
        emp_qs = Employee.objects.select_related("user", "shift_template", "manager", "manager__user")
        if user.is_superuser or user.role in (UserRole.ADMIN, UserRole.HR, UserRole.MANAGER):
            emp_qs = filter_employees_by_org(emp_qs, org_id)
        else:
            profile = getattr(user, "employee_profile", None)
            if not profile:
                return Response({"year": year, "month": month, "days_in_month": last_day, "rows": [], "legend": {}})
            emp_qs = emp_qs.filter(pk=profile.pk)

        employees = list(emp_qs)
        employee_ids = [e.id for e in employees]

        att_qs = (
            Attendance.objects.filter(
                employee_id__in=employee_ids,
                date__gte=start,
                date__lte=end,
            )
            .select_related("employee", "employee__shift_template")
            .prefetch_related("correction_requests")
        )
        apply_auto_clock_out(att_qs, as_of_date=end)
        att_map: dict[int, dict[int, Attendance]] = {}
        for att in att_qs:
            att_map.setdefault(att.employee_id, {})[att.date.day] = att

        leave_qs = LeaveRequest.objects.filter(
            employee_id__in=employee_ids,
            status=LeaveStatus.APPROVED,
            start_date__lte=end,
            end_date__gte=start,
        ).values("employee_id", "start_date", "end_date", "leave_type")

        leave_map: dict[int, dict[int, str]] = {}
        for row in leave_qs:
            eid = row["employee_id"]
            cur = max(row["start_date"], start)
            lim = min(row["end_date"], end)
            while cur <= lim:
                leave_map.setdefault(eid, {})[cur.day] = row["leave_type"]
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
                leave_type = leave_map.get(eid, {}).get(d)
                att = att_map.get(eid, {}).get(d)
                status_key, status_code = day_status_for_employee(e, day_date, att, leave_type)
                day_status[str(d)] = status_key
                day_status[f"{d}_code"] = status_code
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
                "leave": "#3b82f6",
                "wfh": "#86efac",
                "anomaly": "#f59e0b",
                "weekend": "#64748b",
                "no_record": "#e2e8f0",
            },
        }
        cache.set(cache_key, payload, timeout=60)
        return Response(payload)

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated, IsManagerOrAbove])
    def daily_logs(self, request):
        today = date.today()
        date_str = request.query_params.get("date")
        if date_str:
            try:
                log_date = date.fromisoformat(date_str)
            except ValueError:
                return Response({"error": "Invalid date."}, status=status.HTTP_400_BAD_REQUEST)
        else:
            log_date = today

        search = (request.query_params.get("search") or "").strip().lower()
        department = (request.query_params.get("department") or "").strip()
        status_filter = (request.query_params.get("status") or "").strip().lower()
        manager_id = request.query_params.get("manager_id")
        sort_by = (request.query_params.get("sort_by") or "name").strip().lower()
        page = max(int(request.query_params.get("page") or 1), 1)
        page_size = min(max(int(request.query_params.get("page_size") or 10), 1), 100)

        org_id = organization_id_from_request(request)
        emp_qs = Employee.objects.select_related("user", "shift_template", "manager", "manager__user")
        emp_qs = filter_employees_by_org(emp_qs, org_id)
        if department:
            emp_qs = emp_qs.filter(department__iexact=department)
        if manager_id:
            emp_qs = emp_qs.filter(manager_id=manager_id)

        employees = list(emp_qs.order_by("employee_code"))
        employee_ids = [e.id for e in employees]

        att_by_emp = {
            a.employee_id: a
            for a in Attendance.objects.filter(
                employee_id__in=employee_ids,
                date=log_date,
            )
            .select_related("employee", "employee__shift_template")
            .prefetch_related("correction_requests")
        }
        apply_auto_clock_out(att_by_emp.values(), as_of_date=log_date)

        leave_by_emp = {}
        for row in LeaveRequest.objects.filter(
            employee_id__in=employee_ids,
            status=LeaveStatus.APPROVED,
            start_date__lte=log_date,
            end_date__gte=log_date,
        ).values("employee_id", "leave_type"):
            leave_by_emp[row["employee_id"]] = row["leave_type"]

        departments = sorted({e.department for e in employees if e.department})

        result_rows = []
        summary = {"present": 0, "absent": 0, "leave": 0, "anomaly": 0, "wfh": 0, "weekend": 0}

        for e in employees:
            name = f"{e.user.first_name} {e.user.last_name}".strip() or e.user.email
            if search:
                hay = f"{e.employee_code} {name} {e.department} {e.designation}".lower()
                if search not in hay:
                    continue

            att = att_by_emp.get(e.id)
            leave_type = leave_by_emp.get(e.id)
            status_key, status_code = day_status_for_employee(e, log_date, att, leave_type)

            if status_filter and status_filter != "all":
                if status_filter != status_key:
                    continue

            if status_key in summary:
                summary[status_key] += 1
            elif status_key == "no_record":
                summary["absent"] += 1

            manager = e.manager
            manager_name = ""
            if manager:
                manager_name = manager.user.get_full_name() or manager.user.email

            profile_image_url = None
            if e.profile_image:
                try:
                    profile_image_url = e.profile_image.url
                except Exception:
                    profile_image_url = None

            anomaly = attendance_anomaly(att) if att else "none"

            result_rows.append(
                {
                    "employee_id": e.id,
                    "employee_code": e.employee_code,
                    "employee_name": name,
                    "department": e.department or "",
                    "designation": e.designation or "",
                    "manager_name": manager_name,
                    "profile_image": profile_image_url,
                    "attendance_id": att.id if att else None,
                    "status": status_key,
                    "status_code": status_code,
                    "check_in": att.check_in if att else None,
                    "check_out": att.check_out if att else None,
                    "anomaly": anomaly,
                    "notes": att.notes if att else "",
                }
            )

        if sort_by == "id":
            result_rows.sort(key=lambda r: r["employee_code"] or "")
        elif sort_by == "status":
            result_rows.sort(key=lambda r: (r["status_code"], r["employee_name"]))
        else:
            result_rows.sort(key=lambda r: r["employee_name"].lower())

        total = len(result_rows)
        start_idx = (page - 1) * page_size
        page_rows = result_rows[start_idx : start_idx + page_size]

        for row in page_rows:
            if row["check_in"]:
                row["check_in"] = timezone.localtime(row["check_in"]).isoformat()
            if row["check_out"]:
                row["check_out"] = timezone.localtime(row["check_out"]).isoformat()

        return Response(
            {
                "date": log_date.isoformat(),
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": max((total + page_size - 1) // page_size, 1),
                "summary": summary,
                "departments": departments,
                "rows": page_rows,
            }
        )

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated, IsManagerOrAbove])
    def export(self, request):
        today = date.today()
        year = int(request.query_params.get("year", today.year))
        month = int(request.query_params.get("month", today.month))
        _, last_day = monthrange(year, month)
        start = date(year, month, 1)
        end = date(year, month, last_day)
        org_id = organization_id_from_request(request)
        qs = (
            Attendance.objects.select_related("employee", "employee__user")
            .filter(date__gte=start, date__lte=end)
            .order_by("date", "employee__employee_code")
        )
        qs = filter_by_employee_org(qs, org_id)
        buffer = io.StringIO()
        buffer.write("\ufeff")
        writer = csv.writer(buffer)
        writer.writerow(["Date", "Employee Code", "Employee Name", "Department", "Check In", "Check Out", "Status", "Notes"])
        for row in qs:
            name = f"{row.employee.user.first_name} {row.employee.user.last_name}".strip() or row.employee.user.email
            status_value = "present" if row.check_in and row.check_out else "absent"
            writer.writerow(
                [
                    _format_csv_date(row.date),
                    row.employee.employee_code,
                    name,
                    row.employee.department or "",
                    _format_csv_datetime(row.check_in),
                    _format_csv_datetime(row.check_out),
                    status_value,
                    row.notes or "",
                ]
            )
        response = HttpResponse(buffer.getvalue(), content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = f'attachment; filename="attendance_{year}_{month:02d}.csv"'
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
            organization_id=attendance.employee.organization_id,
        )
        return Response(AttendanceCorrectionRequestSerializer(correction).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated, IsManagerOrAbove])
    def correction_requests(self, request):
        qs = AttendanceCorrectionRequest.objects.select_related(
            "attendance",
            "attendance__employee",
            "attendance__employee__user",
            "attendance__employee__manager",
            "attendance__employee__manager__user",
            "reviewed_by",
        ).all()
        qs = filter_by_employee_org(
            qs,
            organization_id_from_request(request),
            employee_prefix="attendance__employee",
        )
        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return Response(
            AttendanceCorrectionRequestSerializer(qs, many=True, context={"request": request}).data
        )

    @action(detail=False, methods=["post"], permission_classes=[permissions.IsAuthenticated, IsManagerOrAbove])
    def review_correction(self, request):
        correction_id = request.data.get("correction_id")
        correction_qs = AttendanceCorrectionRequest.objects.select_related(
            "attendance", "attendance__employee", "attendance__employee__user"
        )
        correction_qs = filter_by_employee_org(
            correction_qs,
            organization_id_from_request(request),
            employee_prefix="attendance__employee",
        )
        correction = correction_qs.filter(pk=correction_id).first()
        if not correction:
            return Response({"error": "Correction request not found."}, status=status.HTTP_404_NOT_FOUND)
        if correction.status != AttendanceCorrectionStatus.PENDING:
            return Response({"error": "Correction request already processed."}, status=status.HTTP_400_BAD_REQUEST)

        ser = AttendanceCorrectionReviewSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        decision = ser.validated_data["status"]
        note = ser.validated_data.get("review_note", "")
        if decision == AttendanceCorrectionStatus.APPROVED:
            if ser.validated_data.get("requested_check_in") is not None:
                correction.requested_check_in = ser.validated_data["requested_check_in"]
            if ser.validated_data.get("requested_check_out") is not None:
                correction.requested_check_out = ser.validated_data["requested_check_out"]
        correction.status = decision
        correction.review_note = note
        correction.reviewed_by = request.user
        correction.reviewed_at = timezone.now()
        correction.save(update_fields=["status", "review_note", "reviewed_by", "reviewed_at", "updated_at", "requested_check_in", "requested_check_out"])

        attendance = correction.attendance
        if decision == AttendanceCorrectionStatus.APPROVED:
            if correction.request_type == AttendanceCorrectionType.MARK_PRESENT and not attendance.check_out:
                attendance.check_out = correction.requested_check_out or timezone.now()
                attendance.save(update_fields=["check_out", "updated_at"])
            elif correction.request_type == AttendanceCorrectionType.MARK_EXACT_TIME:
                if correction.requested_check_in:
                    attendance.check_in = correction.requested_check_in
                if correction.requested_check_out:
                    attendance.check_out = correction.requested_check_out
                attendance.save(update_fields=["check_in", "check_out", "updated_at"])
            elif correction.request_type == AttendanceCorrectionType.MARK_LEAVE:
                leave_start = correction.leave_start_date or attendance.date
                leave_end = correction.leave_end_date or attendance.date
                leave_type = correction.leave_type or LeaveType.CASUAL
                LeaveRequest.objects.update_or_create(
                    employee=attendance.employee,
                    start_date=leave_start,
                    end_date=leave_end,
                    leave_type=leave_type,
                    defaults={
                        "reason": correction.reason or "Approved via attendance correction.",
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
