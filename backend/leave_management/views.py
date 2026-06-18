from datetime import date, timedelta
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from accounts.models import UserRole
from accounts.notifications import notify_roles, notify_user
from accounts.permissions import IsManagerOrAbove
from accounts.async_tasks import send_html_email_async

from employees.models import Employee
from employees.org_scope import (
    filter_by_employee_org,
    filter_by_organization,
    filter_employees_by_org,
    organization_id_from_request,
)

from .leave_rules import (
    employee_has_rule,
    employee_on_probation,
    leave_days_in_year,
    quota_for_rule,
    resolve_leave_rule,
    seed_org_leave_rules,
)
from .models import (
    EmployeeLeaveProfile,
    LeavePolicy,
    LeavePolicyAssignment,
    LeaveRequest,
    LeaveStatus,
    LeaveType,
    LeaveTypeRule,
    LeaveTypeRuleAssignment,
    SYSTEM_LEAVE_RULE_CODES,
)
from .serializers import (
    EmployeeLeaveProfileSerializer,
    LeavePolicyAssignmentSerializer,
    LeavePolicyBulkAssignSerializer,
    LeavePolicySerializer,
    LeaveRequestSerializer,
    LeaveReviewSerializer,
    LeaveTypeRuleAssignmentSerializer,
    LeaveTypeRuleBulkAssignSerializer,
    LeaveTypeRuleCreateSerializer,
    LeaveTypeRuleSerializer,
    LeaveTypeRuleWriteSerializer,
)


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
            org_id = organization_id_from_request(self.request)
            return filter_by_employee_org(qs, org_id)
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

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    def balances(self, request):
        user = request.user
        if user.is_superuser or user.role in (UserRole.ADMIN, UserRole.HR, UserRole.MANAGER):
            emp_qs = Employee.objects.select_related("user", "leave_profile").prefetch_related("leave_rule_assignments", "leave_rule_assignments__rule").all()
            org_id = organization_id_from_request(request)
            emp_qs = filter_employees_by_org(emp_qs, org_id)
        else:
            profile = getattr(user, "employee_profile", None)
            if not profile:
                return Response([])
            emp_qs = Employee.objects.select_related("user", "leave_profile").prefetch_related("leave_rule_assignments", "leave_rule_assignments__rule").filter(pk=profile.pk)

        year = int(request.query_params.get("year") or timezone.localdate().year)
        
        # PRE-CALCULATE USAGES to avoid N+1 queries
        precalculated_usages = {}
        leave_qs = LeaveRequest.objects.filter(
            employee__in=emp_qs,
            status=LeaveStatus.APPROVED,
            start_date__year=year
        ).only("employee_id", "leave_type", "start_date", "end_date")
        for req in leave_qs:
            days = (req.end_date - req.start_date).days + 1
            if req.employee_id not in precalculated_usages:
                precalculated_usages[req.employee_id] = {}
            if req.leave_type not in precalculated_usages[req.employee_id]:
                precalculated_usages[req.employee_id][req.leave_type] = 0
            precalculated_usages[req.employee_id][req.leave_type] += days
            
        # Try to pre-calculate present ratio if needed
        # Just precalculate for all employees to be safe (1 query total)
        from attendance.models import Attendance
        from employees.week_schedule import is_scheduled_working_day
        as_of = timezone.localdate()
        start = date(as_of.year, 1, 1)
        
        present_dates_by_emp = {}
        att_qs = Attendance.objects.filter(
            employee__in=emp_qs,
            date__gte=start,
            date__lte=as_of,
            check_in__isnull=False,
        ).values("employee_id", "date")
        for att in att_qs:
            if att["employee_id"] not in present_dates_by_emp:
                present_dates_by_emp[att["employee_id"]] = set()
            present_dates_by_emp[att["employee_id"]].add(att["date"])
            
        present_ratios = {}
        for emp in emp_qs:
            working = 0
            present = 0
            d = start
            emp_present_dates = present_dates_by_emp.get(emp.id, set())
            while d <= as_of:
                if is_scheduled_working_day(emp, d):
                    working += 1
                    if d in emp_present_dates:
                        present += 1
                d += timedelta(days=1)
            present_ratios[emp.id] = 1.0 if working == 0 else present / working

        rows = []
        for emp in emp_qs:
            org_id = emp.organization_id
            if not org_id:
                continue
            if not LeaveTypeRule.objects.filter(organization_id=org_id).exists():
                seed_org_leave_rules(org_id)
            rules = LeaveTypeRule.objects.filter(organization_id=org_id, is_active=True).order_by("sort_order")
            on_probation = employee_on_probation(emp)
            balances = {}
            assigned_names = []
            for rule in rules:
                if not employee_has_rule(emp, rule):
                    continue
                quota = quota_for_rule(rule, on_probation, employee=emp, as_of=timezone.localdate(), present_ratio=present_ratios.get(emp.id))
                used = leave_days_in_year(emp, rule.code, year, precalculated_usages=precalculated_usages)
                balances[rule.code] = {
                    "quota": quota,
                    "used": used,
                    "remaining": None if quota is None else max(quota - used, 0),
                    "name": rule.name,
                    "short_name": rule.short_name,
                }
                assigned_names.append(rule.name)
            rows.append(
                {
                    "employee_id": emp.id,
                    "employee_code": emp.employee_code,
                    "employee_name": emp.user.get_full_name() or emp.user.email,
                    "policy_name": ", ".join(assigned_names[:3]) + ("…" if len(assigned_names) > 3 else "") if assigned_names else "Default org rules",
                    "is_policy_assigned": hasattr(emp, '_prefetched_objects_cache') and 'leave_rule_assignments' in emp._prefetched_objects_cache and bool(emp.leave_rule_assignments.all()),
                    "is_on_probation": on_probation,
                    "year": year,
                    "balances": balances,
                }
            )
        return Response(rows)

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


class LeavePolicyViewSet(viewsets.ModelViewSet):
    queryset = LeavePolicy.objects.all()
    serializer_class = LeavePolicySerializer

    def perform_create(self, serializer):
        org_id = organization_id_from_request(self.request)
        if not org_id:
            raise ValidationError({"organization": "Organization context required."})
        serializer.save(organization_id=org_id)

    def perform_destroy(self, instance):
        LeavePolicyAssignment.objects.filter(policy=instance).delete()
        instance.delete()

    def get_permissions(self):
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsManagerOrAbove()]

    def get_queryset(self):
        qs = super().get_queryset()
        org_id = organization_id_from_request(self.request)
        if self.request.user.is_superuser or self.request.user.role in (UserRole.ADMIN, UserRole.HR, UserRole.MANAGER):
            return filter_by_organization(qs, org_id)
        return qs.filter(is_active=True, organization_id=org_id) if org_id else qs.none()

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated, IsManagerOrAbove])
    def assignments(self, request):
        qs = LeavePolicyAssignment.objects.select_related("employee", "employee__user", "policy").all()
        org_id = organization_id_from_request(request)
        qs = filter_by_employee_org(qs, org_id)
        return Response(LeavePolicyAssignmentSerializer(qs, many=True).data)

    @action(detail=False, methods=["post"], permission_classes=[permissions.IsAuthenticated, IsManagerOrAbove])
    def assign(self, request):
        ser = LeavePolicyBulkAssignSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        org_id = organization_id_from_request(request)
        policy = LeavePolicy.objects.filter(pk=ser.validated_data["policy_id"], is_active=True).first()
        if not policy:
            return Response({"error": "Active leave policy not found."}, status=status.HTTP_404_NOT_FOUND)
        if org_id and policy.organization_id and policy.organization_id != org_id:
            return Response({"error": "Policy does not belong to your organization."}, status=status.HTTP_403_FORBIDDEN)
        employees = filter_employees_by_org(
            Employee.objects.filter(pk__in=ser.validated_data["employee_ids"]),
            org_id,
        )
        effective_from = ser.validated_data.get("effective_from")
        is_on_probation = ser.validated_data.get("is_on_probation", False)
        count = 0
        for emp in employees:
            LeavePolicyAssignment.objects.update_or_create(
                employee=emp,
                defaults={
                    "policy": policy,
                    "effective_from": effective_from,
                    "is_on_probation": is_on_probation,
                },
            )
            count += 1
        if count == 0:
            return Response(
                {"error": "No matching employees found in your organization."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({"message": f"Policy assigned to {count} employees."}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], permission_classes=[permissions.IsAuthenticated, IsManagerOrAbove])
    def set_probation(self, request):
        employee_id = request.data.get("employee_id")
        if not employee_id:
            return Response({"error": "employee_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        is_on_probation = bool(request.data.get("is_on_probation", False))
        org_id = organization_id_from_request(request)
        qs = LeavePolicyAssignment.objects.select_related("employee", "policy").filter(employee_id=employee_id)
        qs = filter_by_employee_org(qs, org_id)
        assignment = qs.first()
        if not assignment:
            return Response(
                {"error": "Employee has no leave rule assigned. Assign a rule first under Assign leave rules."},
                status=status.HTTP_404_NOT_FOUND,
            )
        assignment.is_on_probation = is_on_probation
        assignment.save(update_fields=["is_on_probation", "updated_at"])
        return Response(LeavePolicyAssignmentSerializer(assignment).data)

    @action(detail=False, methods=["post"], permission_classes=[permissions.IsAuthenticated, IsManagerOrAbove])
    def unassign(self, request):
        employee_id = request.data.get("employee_id")
        if not employee_id:
            return Response({"error": "employee_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        deleted, _ = LeavePolicyAssignment.objects.filter(employee_id=employee_id).delete()
        if deleted == 0:
            return Response({"error": "No assignment found for this employee."}, status=status.HTTP_404_NOT_FOUND)
        return Response({"message": "Assignment removed."}, status=status.HTTP_200_OK)


class LeaveTypeRuleViewSet(viewsets.ModelViewSet):
    queryset = LeaveTypeRule.objects.all()
    serializer_class = LeaveTypeRuleSerializer

    def get_serializer_class(self):
        if self.action == "create":
            return LeaveTypeRuleCreateSerializer
        if self.action in ("update", "partial_update"):
            return LeaveTypeRuleWriteSerializer
        return LeaveTypeRuleSerializer

    def get_permissions(self):
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsManagerOrAbove()]

    def get_queryset(self):
        qs = super().get_queryset()
        org_id = organization_id_from_request(self.request)
        if not org_id:
            return qs.none()
        if not qs.filter(organization_id=org_id).exists():
            seed_org_leave_rules(org_id)
        qs = qs.filter(organization_id=org_id)
        if self.request.query_params.get("active") == "1":
            qs = qs.filter(is_active=True)
        return qs

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["organization_id"] = organization_id_from_request(self.request)
        return ctx

    def perform_create(self, serializer):
        org_id = organization_id_from_request(self.request)
        if not org_id:
            raise ValidationError({"organization": "Organization context required."})
        serializer.save()

    def perform_destroy(self, instance):
        if instance.is_system or instance.code in SYSTEM_LEAVE_RULE_CODES:
            raise ValidationError({"detail": "System leave rules cannot be deleted."})
        LeaveTypeRuleAssignment.objects.filter(rule=instance).delete()
        instance.delete()

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_system:
            for field in ("code", "is_system", "organization"):
                if field in request.data:
                    raise ValidationError({field: "Cannot change on system leave rules."})
        return super().update(request, *args, **kwargs)

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated, IsManagerOrAbove])
    def assignments(self, request):
        qs = LeaveTypeRuleAssignment.objects.select_related("employee", "employee__user", "rule").all()
        org_id = organization_id_from_request(request)
        qs = filter_by_employee_org(qs, org_id)
        return Response(LeaveTypeRuleAssignmentSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    def applicable(self, request):
        user = request.user
        profile = getattr(user, "employee_profile", None)
        org_id = organization_id_from_request(request)
        if not org_id and profile:
            org_id = profile.organization_id
        if not org_id:
            return Response([])
        if not LeaveTypeRule.objects.filter(organization_id=org_id).exists():
            seed_org_leave_rules(org_id)
        rules = LeaveTypeRule.objects.filter(organization_id=org_id, is_active=True).order_by("sort_order")
        if profile and not user.is_superuser and user.role not in (UserRole.ADMIN, UserRole.HR, UserRole.MANAGER):
            rules = [r for r in rules if employee_has_rule(profile, r)]
        return Response(LeaveTypeRuleSerializer(rules, many=True).data)

    @action(detail=False, methods=["post"], permission_classes=[permissions.IsAuthenticated, IsManagerOrAbove])
    def assign(self, request):
        ser = LeaveTypeRuleBulkAssignSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        org_id = organization_id_from_request(request)
        rules = LeaveTypeRule.objects.filter(
            pk__in=ser.validated_data["rule_ids"],
            organization_id=org_id,
            is_active=True,
        )
        if rules.count() != len(set(ser.validated_data["rule_ids"])):
            return Response({"error": "One or more leave rules were not found."}, status=status.HTTP_404_NOT_FOUND)
        employees = filter_employees_by_org(
            Employee.objects.filter(pk__in=ser.validated_data["employee_ids"]),
            org_id,
        )
        effective_from = ser.validated_data.get("effective_from")
        is_on_probation = ser.validated_data.get("is_on_probation", False)
        count = 0
        for emp in employees:
            if is_on_probation or effective_from:
                EmployeeLeaveProfile.objects.update_or_create(
                    employee=emp,
                    defaults={
                        "is_on_probation": is_on_probation,
                        "effective_from": effective_from,
                    },
                )
            for rule in rules:
                LeaveTypeRuleAssignment.objects.get_or_create(employee=emp, rule=rule)
                count += 1
        if count == 0:
            return Response({"error": "No matching employees found."}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"message": f"Assigned {rules.count()} rule(s) to {employees.count()} employee(s)."})

    @action(detail=False, methods=["post"], permission_classes=[permissions.IsAuthenticated, IsManagerOrAbove])
    def set_probation(self, request):
        employee_id = request.data.get("employee_id")
        if not employee_id:
            return Response({"error": "employee_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        is_on_probation = bool(request.data.get("is_on_probation", False))
        org_id = organization_id_from_request(request)
        emp = filter_employees_by_org(Employee.objects.filter(pk=employee_id), org_id).first()
        if not emp:
            return Response({"error": "Employee not found."}, status=status.HTTP_404_NOT_FOUND)
        profile, _ = EmployeeLeaveProfile.objects.get_or_create(employee=emp)
        profile.is_on_probation = is_on_probation
        profile.save(update_fields=["is_on_probation", "updated_at"])
        return Response(EmployeeLeaveProfileSerializer(profile).data)

    @action(detail=False, methods=["post"], permission_classes=[permissions.IsAuthenticated, IsManagerOrAbove])
    def unassign(self, request):
        employee_id = request.data.get("employee_id")
        rule_id = request.data.get("rule_id")
        if not employee_id:
            return Response({"error": "employee_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        org_id = organization_id_from_request(request)
        qs = LeaveTypeRuleAssignment.objects.filter(employee_id=employee_id)
        qs = filter_by_employee_org(qs, org_id)
        if rule_id:
            qs = qs.filter(rule_id=rule_id)
        deleted, _ = qs.delete()
        if deleted == 0:
            return Response({"error": "No assignment found."}, status=status.HTTP_404_NOT_FOUND)
        return Response({"message": "Assignment removed."})
