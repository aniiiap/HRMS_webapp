from decimal import Decimal

from datetime import datetime

from django.db import transaction
from django.http import HttpResponse
from django.utils import timezone

from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import UserRole
from accounts.permissions import IsAdminOrHR, IsManagerOrAbove

from employees.models import Employee, Organization
from employees.org_scope import (
    filter_by_employee_org,
    filter_by_organization,
    organization_id_from_request,
    user_organization_id,
)

from django.db.models import Count

from .models import (
    CompensationRevision,
    EmployeeCompensation,
    EmployeePayrollProfile,
    EmployeeSalaryLine,
    PayoutStatus,
    PayrollComponent,
    PayrollCtcTemplate,
    PayrollEmployeeResult,
    PayrollRecord,
    PayrollRun,
    PayrollRunStatus,
    PayrollSalaryStructure,
    PayrollStatutoryConfig,
    PayrollStatutoryConfigRevision,
    PayrollTaxDeclaration,
    TaxDeclarationStatus,
)
from .serializers import (
    CompensationRevisionSerializer,
    EmployeeCompensationSerializer,
    EmployeePayrollProfileSerializer,
    EmployeeSalaryLineSerializer,
    PayrollComponentSerializer,
    PayrollEmployeeResultSerializer,
    PayrollRecordSerializer,
    PayrollRunSerializer,
    PayrollCtcTemplateSerializer,
    PayrollSalaryStructureSerializer,
    PayrollStatutoryConfigSerializer,
    PayrollStatutoryConfigRevisionSerializer,
    PayrollTaxDeclarationSerializer,
)
from .services.engine import compute_employee_payroll, recalculate_run
from .services.paid_days import apply_auto_paid_days_to_result
from .services.setup_readiness import build_payroll_setup_status
from .services.statutory_preview import statutory_snapshot_fields
from .services.payroll_dashboard import build_dashboard
from .services.monthly_hr_summary import export_monthly_hr_summary_xlsx
from .services.payroll_exports import export_pay_register_csv, export_statutory_csv
from .services.payslip_pdf import build_payslip_pdf
from .services.salary_validation import (
    run_employee_warnings,
    salary_structure_warnings,
    validate_run_ready_to_finalize,
)
from .services.structure_builder import (
    apply_compensation_revision,
    generate_from_ctc,
    generate_from_gross,
    preview_from_ctc,
    preview_from_gross,
    preview_from_gross_target,
    sync_payroll_profile_from_compensation,
)
from .services.structure_templates import (
    default_structure_lines,
    duplicate_structure,
    ensure_default_salary_structure,
    set_company_default,
)


def _is_privileged(user):
    return user.is_superuser or user.role in (UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)


class PayrollRecordViewSet(viewsets.ModelViewSet):
    """Legacy aggregate payroll rows (pre–full payroll module)."""

    queryset = PayrollRecord.objects.select_related("employee", "employee__user").all()
    serializer_class = PayrollRecordSerializer
    filterset_fields = ["employee", "period_year", "period_month"]
    ordering_fields = ["period_year", "period_month", "net_salary"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return qs.none()
        if _is_privileged(user):
            return filter_by_employee_org(qs, organization_id_from_request(self.request))
        profile = getattr(user, "employee_profile", None)
        if profile:
            return qs.filter(employee=profile)
        return qs.none()

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [permissions.IsAuthenticated(), IsAdminOrHR()]
        return [permissions.IsAuthenticated(), IsManagerOrAbove()]


class PayrollComponentViewSet(viewsets.ModelViewSet):
    queryset = PayrollComponent.objects.select_related("organization").all()
    serializer_class = PayrollComponentSerializer
    filterset_fields = ["organization", "kind", "category", "code"]
    ordering_fields = ["code", "name", "id"]
    ordering = ["organization_id", "code"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return qs.none()
        if user.is_superuser or user.role in (UserRole.ADMIN, UserRole.HR):
            return filter_by_organization(qs, organization_id_from_request(self.request))
        if user.role == UserRole.MANAGER:
            oid = user_organization_id(user)
            if oid:
                return qs.filter(organization_id=oid)
            return qs.none()
        return qs.none()

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [permissions.IsAuthenticated(), IsAdminOrHR()]
        return [permissions.IsAuthenticated(), IsManagerOrAbove()]

    def perform_destroy(self, instance):
        if instance.is_system:
            raise ValidationError("System components cannot be deleted.")
        super().perform_destroy(instance)


class PayrollCtcTemplateViewSet(
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    queryset = PayrollCtcTemplate.objects.select_related("organization")
    serializer_class = PayrollCtcTemplateSerializer

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH"):
            return [permissions.IsAuthenticated(), IsAdminOrHR()]
        return [permissions.IsAuthenticated(), IsManagerOrAbove()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return qs.none()
        if user.is_superuser or user.role in (UserRole.ADMIN, UserRole.HR):
            return filter_by_organization(qs, organization_id_from_request(self.request))
        if user.role == UserRole.MANAGER:
            oid = user_organization_id(user)
            if oid:
                return qs.filter(organization_id=oid)
            return qs.none()
        return qs.none()

    @action(detail=False, methods=["get"], url_path="for-organization")
    def for_organization(self, request):
        oid = request.query_params.get("organization") or organization_id_from_request(request)
        if not oid:
            raise ValidationError({"organization": "Required."})
        obj, _ = PayrollCtcTemplate.objects.get_or_create(organization_id=int(oid))
        return Response(PayrollCtcTemplateSerializer(obj).data)

    @action(detail=False, methods=["post"], url_path="preview")
    def preview(self, request):
        annual = request.data.get("annual_ctc")
        monthly = request.data.get("monthly_ctc")
        oid = request.data.get("organization") or organization_id_from_request(request)
        if not oid:
            raise ValidationError({"organization": "Required."})
        if annual is None and monthly is None:
            raise ValidationError({"annual_ctc": "Provide annual_ctc or monthly_ctc."})
        if annual is None:
            annual = (Decimal(str(monthly)) * Decimal("12")).quantize(Decimal("0.01"))
        return Response(preview_from_ctc(annual, int(oid)))


class PayrollSalaryStructureViewSet(viewsets.ModelViewSet):
    serializer_class = PayrollSalaryStructureSerializer
    http_method_names = ["get", "post", "put", "patch", "delete", "head", "options"]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy", "set_default", "duplicate"):
            return [permissions.IsAuthenticated(), IsAdminOrHR()]
        return [permissions.IsAuthenticated(), IsManagerOrAbove()]

    def get_queryset(self):
        qs = PayrollSalaryStructure.objects.select_related("organization").prefetch_related("lines")
        qs = qs.annotate(employee_count=Count("assigned_compensations", distinct=True))
        user = self.request.user
        if not user.is_authenticated:
            return qs.none()
        if user.is_superuser or user.role in (UserRole.ADMIN, UserRole.HR):
            return filter_by_organization(qs, organization_id_from_request(self.request))
        if user.role == UserRole.MANAGER:
            oid = user_organization_id(user)
            if oid:
                return qs.filter(organization_id=oid)
            return qs.none()
        return qs.none()

    def perform_create(self, serializer):
        oid = self.request.data.get("organization") or organization_id_from_request(self.request)
        if not oid:
            raise ValidationError({"organization": "Required."})
        org = Organization.objects.filter(pk=int(oid)).first()
        if not org:
            raise ValidationError({"organization": "Invalid organization."})
        serializer.save(organization=org)

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        oid = self.request.data.get("organization") or organization_id_from_request(self.request)
        if oid:
            org = Organization.objects.filter(pk=int(oid)).first()
            if org:
                ctx["organization"] = org
        return ctx

    def destroy(self, request, *args, **kwargs):
        structure = self.get_object()
        if structure.is_company_default:
            raise ValidationError("Cannot delete the company default structure.")
        if structure.assigned_compensations.exists():
            raise ValidationError("Cannot delete a structure assigned to employees.")
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=["get"], url_path="for-organization")
    def for_organization(self, request):
        oid = request.query_params.get("organization") or organization_id_from_request(request)
        if not oid:
            raise ValidationError({"organization": "Required."})
        org = Organization.objects.filter(pk=int(oid)).first()
        if not org:
            raise ValidationError({"organization": "Invalid organization."})
        ensure_default_salary_structure(org)
        qs = self.get_queryset().filter(organization_id=int(oid))
        return Response(PayrollSalaryStructureSerializer(qs, many=True).data)

    @action(detail=True, methods=["post"], url_path="set-default")
    def set_default(self, request, pk=None):
        structure = self.get_object()
        set_company_default(structure)
        structure.refresh_from_db()
        return Response(PayrollSalaryStructureSerializer(structure).data)

    @action(detail=True, methods=["post"])
    def duplicate(self, request, pk=None):
        structure = self.get_object()
        name = (request.data.get("name") or "").strip()
        if not name:
            base = f"{structure.name} copy"
            name = base
            n = 2
            while PayrollSalaryStructure.objects.filter(organization=structure.organization, name=name).exists():
                name = f"{base} {n}"
                n += 1
        clone = duplicate_structure(structure, name)
        clone = self.get_queryset().get(pk=clone.pk)
        return Response(PayrollSalaryStructureSerializer(clone).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="create-blank")
    def create_blank(self, request):
        oid = request.data.get("organization") or organization_id_from_request(request)
        if not oid:
            raise ValidationError({"organization": "Required."})
        org = Organization.objects.filter(pk=int(oid)).first()
        if not org:
            raise ValidationError({"organization": "Invalid organization."})
        name = (request.data.get("name") or "New structure").strip()
        if PayrollSalaryStructure.objects.filter(organization=org, name=name).exists():
            raise ValidationError({"name": "A structure with this name already exists."})
        structure = PayrollSalaryStructure.objects.create(
            organization=org,
            name=name,
            description=request.data.get("description") or "",
        )
        for row in default_structure_lines():
            structure.lines.create(**row)
        structure = self.get_queryset().get(pk=structure.pk)
        return Response(PayrollSalaryStructureSerializer(structure).data, status=status.HTTP_201_CREATED)


class PayrollStatutoryConfigViewSet(
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    queryset = PayrollStatutoryConfig.objects.select_related("organization")
    serializer_class = PayrollStatutoryConfigSerializer

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH"):
            return [permissions.IsAuthenticated(), IsAdminOrHR()]
        return [permissions.IsAuthenticated(), IsManagerOrAbove()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return qs.none()
        if user.is_superuser or user.role in (UserRole.ADMIN, UserRole.HR):
            return filter_by_organization(qs, organization_id_from_request(self.request))
        if user.role == UserRole.MANAGER:
            oid = user_organization_id(user)
            if oid:
                return qs.filter(organization_id=oid)
            return qs.none()
        return qs.none()

    @action(detail=False, methods=["get"], url_path="for-organization")
    def for_organization(self, request):
        oid = request.query_params.get("organization")
        if not oid:
            raise ValidationError({"organization": "Query parameter required."})
        user = request.user
        if not user.is_superuser and user.role in (UserRole.MANAGER, UserRole.ADMIN, UserRole.HR):
            bound = user_organization_id(user)
            if bound and str(bound) != str(oid):
                return Response(status=status.HTTP_403_FORBIDDEN)
        obj, _ = PayrollStatutoryConfig.objects.get_or_create(organization_id=oid)
        return Response(self.get_serializer(obj).data)

    @action(detail=False, methods=["get"], url_path="setup-status")
    def setup_status(self, request):
        oid = request.query_params.get("organization")
        if not oid:
            raise ValidationError({"organization": "Query parameter required."})
        user = request.user
        if not user.is_superuser and user.role in (UserRole.MANAGER, UserRole.ADMIN, UserRole.HR):
            bound = user_organization_id(user)
            if bound and str(bound) != str(oid):
                return Response(status=status.HTTP_403_FORBIDDEN)
        return Response(build_payroll_setup_status(int(oid)))

    @action(detail=True, methods=["get"], url_path="revision-history")
    def revision_history(self, request, pk=None):
        obj = self.get_object()
        qs = obj.revisions.select_related("changed_by").order_by("-created_at", "-id")[:50]
        return Response(PayrollStatutoryConfigRevisionSerializer(qs, many=True).data)

    @transaction.atomic
    def perform_update(self, serializer):
        instance = serializer.instance
        before = statutory_snapshot_fields(instance)
        obj = serializer.save()
        after = statutory_snapshot_fields(obj)
        if before != after:
            PayrollStatutoryConfigRevision.objects.create(
                config=obj,
                snapshot=after,
                changed_by=self.request.user if self.request.user.is_authenticated else None,
            )


class PayrollRunViewSet(viewsets.ModelViewSet):
    queryset = PayrollRun.objects.select_related("organization").prefetch_related("employee_results")
    serializer_class = PayrollRunSerializer
    filterset_fields = ["organization", "period_year", "period_month", "status"]
    ordering_fields = ["period_year", "period_month", "id"]
    ordering = ["-period_year", "-period_month", "-id"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return qs.none()
        if user.role == UserRole.EMPLOYEE and not user.is_superuser:
            return qs.none()
        if user.is_superuser or user.role in (UserRole.ADMIN, UserRole.HR):
            return filter_by_organization(qs, organization_id_from_request(self.request))
        if user.role == UserRole.MANAGER:
            oid = user_organization_id(user)
            if oid:
                return qs.filter(organization_id=oid)
            return qs.none()
        return qs.none()

    def get_permissions(self):
        if self.action in (
            "create",
            "update",
            "partial_update",
            "destroy",
            "finalize",
            "reopen",
            "recalculate",
            "sync_employees",
            "refresh_paid_days",
        ):
            return [permissions.IsAuthenticated(), IsAdminOrHR()]
        return [permissions.IsAuthenticated(), IsManagerOrAbove()]

    @transaction.atomic
    def perform_create(self, serializer):
        from calendar import monthrange
        year = serializer.validated_data.get("period_year")
        month = serializer.validated_data.get("period_month")
        wd = serializer.validated_data.get("working_days")
        if not wd and year and month:
            # Overwrite default 22 with the actual calendar days
            serializer.validated_data["working_days"] = monthrange(year, month)[1]
            
        run = serializer.save(status=PayrollRunStatus.DRAFT)
        employees = Employee.objects.filter(
            organization_id=run.organization_id,
            user__is_active=True,
            user__onboarding_pending=False,
        )
        for emp in employees:
            res, _ = PayrollEmployeeResult.objects.get_or_create(
                run=run,
                employee=emp,
                defaults={"paid_days": Decimal("0"), "lop_days": Decimal("0")},
            )
            apply_auto_paid_days_to_result(res, force=True)
        recalculate_run(run, refresh_paid_days=False)

    @transaction.atomic
    def perform_update(self, serializer):
        run_before = serializer.instance
        old_wd = run_before.working_days
        run = serializer.save()
        if run.status == PayrollRunStatus.DRAFT and run.working_days != old_wd:
            for r in run.employee_results.select_related("employee", "run"):
                if not r.paid_days_overridden:
                    apply_auto_paid_days_to_result(r, force=True)
            recalculate_run(run, refresh_paid_days=False)

    def perform_destroy(self, instance):
        if instance.status in (PayrollRunStatus.FINALIZED, PayrollRunStatus.PAID):
            raise ValidationError("Finalized or paid runs cannot be deleted. Please revert them to draft first.")
        super().perform_destroy(instance)

    @action(detail=True, methods=["post"])
    def finalize(self, request, pk=None):
        import logging

        logger = logging.getLogger("payroll")
        run = self.get_object()
        if run.status not in (PayrollRunStatus.DRAFT, PayrollRunStatus.READY):
            raise ValidationError("Run is not in draft or ready status.")
        readiness = validate_run_ready_to_finalize(run)
        if not readiness["can_finalize"]:
            logger.warning(
                "payroll finalize blocked run_id=%s blockers=%s",
                run.id,
                readiness["blocker_count"],
            )
            return Response(
                {
                    "error": "Cannot finalize: incomplete salary structure for one or more employees.",
                    "readiness": readiness,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        recalculate_run(run)
        
        # Lock in approved expenses
        from expenses.models import ExpenseClaim, ExpenseClaimStatus
        for res in run.employee_results.all():
            ExpenseClaim.objects.filter(
                employee=res.employee,
                status=ExpenseClaimStatus.APPROVED,
                is_reimbursed=False,
                skip_payroll=False
            ).update(is_reimbursed=True, payroll_run=run)

        run.status = PayrollRunStatus.FINALIZED
        run.save(update_fields=["status", "updated_at"])
        logger.info("payroll finalized run_id=%s org=%s period=%s-%02d", run.id, run.organization_id, run.period_year, run.period_month)
        return Response(PayrollRunSerializer(run).data)

    @action(detail=True, methods=["post"])
    def reopen(self, request, pk=None):
        run = self.get_object()
        if run.status in (PayrollRunStatus.DRAFT, PayrollRunStatus.READY):
            raise ValidationError("Run is already open.")
            
        # Re-open locked expenses
        if hasattr(run, 'reimbursed_expenses'):
            run.reimbursed_expenses.update(is_reimbursed=False, payroll_run=None)
            
        run.status = PayrollRunStatus.DRAFT
        run.save(update_fields=["status", "updated_at"])
        return Response(PayrollRunSerializer(run).data)

    @action(detail=True, methods=["post"])
    def recalculate(self, request, pk=None):
        run = self.get_object()
        if run.status not in (PayrollRunStatus.DRAFT, PayrollRunStatus.READY, PayrollRunStatus.FINALIZED):
            raise ValidationError("Cannot recalculate this run.")
        skip_attendance = str(request.data.get("skip_attendance", "")).lower() in ("1", "true", "yes")
        refresh = run.status in (PayrollRunStatus.DRAFT, PayrollRunStatus.READY) and not skip_attendance
        n = recalculate_run(run, refresh_paid_days=refresh)
        return Response({"recalculated": n, "refresh_paid_days": refresh})

    @action(detail=True, methods=["post"])
    def sync_employees(self, request, pk=None):
        """Add payroll rows for new joiners since run was created."""
        run = self.get_object()
        if run.status != PayrollRunStatus.DRAFT:
            raise ValidationError("Only draft runs can sync employees.")
        existing = set(run.employee_results.values_list("employee_id", flat=True))
        for emp in Employee.objects.filter(
            organization_id=run.organization_id,
            user__is_active=True,
            user__onboarding_pending=False,
        ):
            if emp.id not in existing:
                res = PayrollEmployeeResult.objects.create(
                    run=run,
                    employee=emp,
                    paid_days=Decimal("0"),
                    lop_days=Decimal("0"),
                )
                apply_auto_paid_days_to_result(res, force=True)
        recalculate_run(run, refresh_paid_days=True)
        return Response({"ok": True})

    @action(detail=True, methods=["post"], url_path="refresh-paid-days")
    def refresh_paid_days(self, request, pk=None):
        """Recompute paid_days from attendance + leave (skips HR-overridden rows unless force=1)."""
        run = self.get_object()
        if run.status != PayrollRunStatus.DRAFT:
            raise ValidationError("Only draft runs can refresh paid days.")
        force = str(request.data.get("force", "")).lower() in ("1", "true", "yes")
        if force:
            run.employee_results.filter(paid_days_overridden=True).update(paid_days_overridden=False)
        recalculate_run(run, refresh_paid_days=True, force_paid_days=force)
        return Response({"ok": True, "force": force})

    @action(detail=True, methods=["get"], url_path="readiness")
    def readiness(self, request, pk=None):
        """Salary structure warnings per employee before finalize."""
        run = self.get_object()
        rows = []
        blocking = 0
        for res in run.employee_results.select_related("employee", "employee__user"):
            warnings = run_employee_warnings(res.employee, run)
            if warnings:
                blocking += 1
            u = res.employee.user
            rows.append(
                {
                    "employee_id": res.employee_id,
                    "employee_code": res.employee.employee_code,
                    "employee_name": f"{u.first_name} {u.last_name}".strip() or u.email,
                    "warnings": warnings,
                    "has_basic": not any("BASIC" in w for w in warnings),
                }
            )
        finalize_check = validate_run_ready_to_finalize(run)
        return Response(
            {
                "run_id": run.id,
                "period": f"{run.period_year}-{run.period_month:02d}",
                "employees_with_warnings": blocking,
                "can_finalize": finalize_check["can_finalize"],
                "blocker_count": finalize_check["blocker_count"],
                "blockers": finalize_check["blockers"],
                "rows": rows,
            }
        )

    @action(detail=True, methods=["get"], url_path="export-register")
    def export_register(self, request, pk=None):
        run = self.get_object()
        return export_pay_register_csv(run)

    @action(detail=True, methods=["get"], url_path="export-report")
    def export_report(self, request, pk=None):
        run = self.get_object()
        kind = (request.query_params.get("kind") or "register").lower()
        if kind == "register":
            return export_pay_register_csv(run)
        return export_statutory_csv(run, kind)

    @action(detail=True, methods=["post"], url_path="mark-ready")
    def mark_ready(self, request, pk=None):
        run = self.get_object()
        if run.status != PayrollRunStatus.DRAFT:
            raise ValidationError("Only draft runs can be marked ready.")
        readiness = validate_run_ready_to_finalize(run)
        if not readiness["can_finalize"]:
            return Response(
                {"error": "Run has blocking issues.", "readiness": readiness},
                status=status.HTTP_400_BAD_REQUEST,
            )
        run.status = PayrollRunStatus.READY
        run.save(update_fields=["status", "updated_at"])
        return Response(PayrollRunSerializer(run).data)

    @action(detail=True, methods=["post"], url_path="mark-paid")
    def mark_paid(self, request, pk=None):
        run = self.get_object()
        if run.status != PayrollRunStatus.FINALIZED:
            raise ValidationError("Only finalized runs can be marked as paid.")
        now = timezone.now()
        with transaction.atomic():
            run.employee_results.filter(is_on_hold=False).update(
                payout_status=PayoutStatus.PAID,
                paid_at=now,
            )
            run.status = PayrollRunStatus.PAID
            run.save(update_fields=["status", "updated_at"])
        return Response(PayrollRunSerializer(run).data)


class PayrollMonthlyHrSummaryExportView(APIView):
    """Excel summary: employee salaries + leave balances for a payroll month."""

    permission_classes = [permissions.IsAuthenticated, IsManagerOrAbove]

    def get(self, request):
        oid = request.query_params.get("organization") or organization_id_from_request(request)
        if not oid:
            raise ValidationError({"organization": "Organization is required."})
        today = timezone.localdate()
        try:
            year = int(request.query_params.get("year") or today.year)
            month = int(request.query_params.get("month") or today.month)
        except (TypeError, ValueError) as exc:
            raise ValidationError({"detail": "Invalid year or month."}) from exc
        if month < 1 or month > 12:
            raise ValidationError({"month": "Month must be between 1 and 12."})
        return export_monthly_hr_summary_xlsx(int(oid), year, month)


class PayrollDashboardAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsManagerOrAbove]

    def get(self, request):
        oid = request.query_params.get("organization") or organization_id_from_request(request)
        if not oid:
            raise ValidationError({"organization": "Organization is required."})
        year = request.query_params.get("year")
        return Response(
            build_dashboard(int(oid), year=int(year) if year else None)
        )


class PayrollEmployeeResultViewSet(viewsets.ModelViewSet):
    queryset = PayrollEmployeeResult.objects.select_related(
        "run", "employee", "employee__user", "employee__payroll_profile"
    ).prefetch_related("lines", "lines__component")
    serializer_class = PayrollEmployeeResultSerializer
    filterset_fields = ["run", "employee"]
    ordering_fields = ["employee__employee_code", "net_pay"]
    ordering = ["employee__employee_code"]
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return qs.none()
        if user.is_superuser or user.role in (UserRole.ADMIN, UserRole.HR):
            return filter_by_employee_org(qs, organization_id_from_request(self.request), employee_prefix="employee")
        if user.role == UserRole.MANAGER:
            oid = user_organization_id(user)
            if oid:
                return qs.filter(run__organization_id=oid)
            return qs.none()
        profile = getattr(user, "employee_profile", None)
        if profile:
            return qs.filter(employee=profile)
        return qs.none()

    def get_permissions(self):
        if self.action == "partial_update":
            return [permissions.IsAuthenticated(), IsAdminOrHR()]
        if self.action in ("list", "retrieve", "payslip_pdf"):
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsManagerOrAbove()]

    @transaction.atomic
    def perform_update(self, serializer):
        run = serializer.instance.run
        if run.status not in (PayrollRunStatus.DRAFT, PayrollRunStatus.READY):
            raise ValidationError("Pay register is locked; only draft or ready runs can be edited.")
        res = serializer.save()
        if "paid_days" in serializer.validated_data:
            res.paid_days_overridden = True
            res.lop_days = max(Decimal("0"), Decimal(str(run.working_days)) - res.paid_days)
            res.save(update_fields=["lop_days", "paid_days_overridden", "updated_at"])
        statutory = PayrollStatutoryConfig.objects.filter(organization_id=run.organization_id).first()
        if statutory:
            compute_employee_payroll(res, statutory)

    @action(detail=True, methods=["get"], url_path="payslip-pdf")
    def payslip_pdf(self, request, pk=None):
        result = self.get_object()
        if result.run.status not in (PayrollRunStatus.FINALIZED, PayrollRunStatus.PAID):
            raise ValidationError("Payslip PDF is available after payroll is finalized.")
        pdf = build_payslip_pdf(result)
        code = result.employee.employee_code
        period = f"{result.run.period_year}_{result.run.period_month:02d}"
        response = HttpResponse(pdf, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="payslip_{code}_{period}.pdf"'
        return response


class EmployeeSalaryLineViewSet(viewsets.ModelViewSet):
    queryset = EmployeeSalaryLine.objects.select_related("employee", "component").all()
    serializer_class = EmployeeSalaryLineSerializer
    filterset_fields = ["employee", "component"]
    ordering = ["employee_id", "sort_order", "id"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return qs.none()
            
        is_active = self.request.query_params.get("is_active")
        if is_active and is_active.lower() == "true":
            qs = qs.filter(effective_to__isnull=True)
            
        if user.is_superuser or user.role in (UserRole.ADMIN, UserRole.HR):
            return filter_by_employee_org(qs, organization_id_from_request(self.request))
        if user.role == UserRole.MANAGER:
            oid = user_organization_id(user)
            if oid:
                return qs.filter(employee__organization_id=oid)
            return qs.none()
        profile = getattr(user, "employee_profile", None)
        if profile:
            return qs.filter(employee=profile)
        return qs.none()

    def get_permissions(self):
        if self.action in ("preview_from_gross", "preview_from_ctc_action"):
            return [permissions.IsAuthenticated(), IsManagerOrAbove()]
        if self.action in ("create", "update", "partial_update", "destroy", "generate_from_gross"):
            return [permissions.IsAuthenticated(), IsAdminOrHR()]
        return [permissions.IsAuthenticated(), IsManagerOrAbove()]

    @action(detail=False, methods=["post"], url_path="preview-from-gross")
    def preview_from_gross(self, request):
        gross = request.data.get("monthly_gross")
        if gross is None:
            raise ValidationError({"monthly_gross": "Required."})
        # Note: preview_from_gross in structure_builder currently doesn't take overrides, but since it's just a wrapper
        # over compute_ctc_breakup, it's fine. It's mostly backward compatible.
        return Response(preview_from_gross(gross))

    @action(detail=False, methods=["post"], url_path="preview-from-ctc")
    def preview_from_ctc_action(self, request):
        annual = request.data.get("annual_ctc")
        monthly_ctc = request.data.get("monthly_ctc")
        target_gross = request.data.get("target_monthly_gross")
        input_mode = request.data.get("input_mode", "gross")
        oid = request.data.get("organization") or organization_id_from_request(request)
        emp_id = request.data.get("employee")
        if emp_id and not oid:
            emp = Employee.objects.filter(pk=emp_id).first()
            if emp:
                oid = emp.organization_id
        if not oid:
            raise ValidationError({"organization": "Required."})
        overrides = request.data.get("template_overrides") or None
        statutory_overrides = {
            "pf_applicable": request.data.get("pf_applicable"),
            "esi_applicable": request.data.get("esi_applicable"),
            "pt_applicable": request.data.get("pt_applicable"),
            "tds_applicable": request.data.get("tds_applicable"),
        }
        # filter out Nones
        statutory_overrides = {k: v for k, v in statutory_overrides.items() if v is not None}
        
        if input_mode == "gross" and target_gross is not None:
            return Response(preview_from_gross_target(target_gross, int(oid), template_overrides=overrides, statutory_overrides=statutory_overrides))
        if input_mode == "monthly_ctc" and monthly_ctc is not None:
            annual = (Decimal(str(monthly_ctc)) * Decimal("12")).quantize(Decimal("0.01"))
            return Response(
                preview_from_ctc(annual, int(oid), input_mode="monthly_ctc", template_overrides=overrides, statutory_overrides=statutory_overrides)
            )
        if annual is not None:
            return Response(preview_from_ctc(annual, int(oid), input_mode="annual", template_overrides=overrides, statutory_overrides=statutory_overrides))
        if monthly_ctc is not None:
            annual = (Decimal(str(monthly_ctc)) * Decimal("12")).quantize(Decimal("0.01"))
            return Response(
                preview_from_ctc(annual, int(oid), input_mode="monthly_ctc", template_overrides=overrides, statutory_overrides=statutory_overrides)
            )
        if target_gross is not None:
            return Response(preview_from_gross_target(target_gross, int(oid), template_overrides=overrides, statutory_overrides=statutory_overrides))
        raise ValidationError({"detail": "Provide target_monthly_gross, annual_ctc, or monthly_ctc."})

    @action(detail=False, methods=["post"], url_path="generate-from-gross")
    def generate_from_gross(self, request):
        emp_id = request.data.get("employee")
        gross = request.data.get("monthly_gross")
        annual = request.data.get("annual_ctc")
        ctc_type = request.data.get("ctc_type", "monthly")
        eff = request.data.get("effective_from")
        if ctc_type == "annual" and annual is not None:
            gross = (Decimal(str(annual)) / Decimal("12")).quantize(Decimal("0.01"))
        if not emp_id or gross is None or not eff:
            raise ValidationError("employee, monthly_gross (or annual_ctc), and effective_from are required.")
        try:
            eff_date = datetime.strptime(str(eff)[:10], "%Y-%m-%d").date()
        except ValueError as exc:
            raise ValidationError({"effective_from": "Use YYYY-MM-DD."}) from exc
        emp = Employee.objects.get(pk=emp_id)
        lines = generate_from_gross(emp, gross, eff_date)
        return Response(EmployeeSalaryLineSerializer(lines, many=True).data)


class EmployeeCompensationViewSet(viewsets.ModelViewSet):
    queryset = EmployeeCompensation.objects.select_related("employee", "employee__user").prefetch_related(
        "employee__compensation_revisions"
    )
    serializer_class = EmployeeCompensationSerializer
    filterset_fields = ["employee", "organization"]
    http_method_names = ["get", "post", "patch", "put", "delete", "head", "options"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return qs.none()
        if user.is_superuser or user.role in (UserRole.ADMIN, UserRole.HR):
            return filter_by_organization(qs, organization_id_from_request(self.request))
        if user.role == UserRole.MANAGER:
            oid = user_organization_id(user)
            if oid:
                return qs.filter(organization_id=oid)
            return qs.none()
        profile = getattr(user, "employee_profile", None)
        if profile:
            return qs.filter(employee=profile)
        return qs.none()

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "bulk_assign_structure"):
            return [permissions.IsAuthenticated(), IsAdminOrHR()]
        return [permissions.IsAuthenticated(), IsManagerOrAbove()]

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        emp = serializer.validated_data["employee"]
        if not emp.organization_id:
            raise ValidationError({"employee": "Employee must belong to an organization."})
        data = serializer.validated_data
        comp = apply_compensation_revision(
            emp,
            monthly_gross=data.get("monthly_gross"),
            annual_ctc=data.get("annual_ctc"),
            ctc_type=data.get("ctc_type", "gross"),
            effective_from=data["effective_from"],
            user=request.user,
            note="Initial compensation",
            generate_structure=True,
            template_overrides=data.get("template_overrides"),
            statutory_overrides=data,
        )
        for field in (
            "payroll_group",
            "pf_applicable",
            "esi_applicable",
            "pt_applicable",
            "tds_applicable",
            "salary_structure",
            "template_overrides",
        ):
            if field in data:
                setattr(comp, field, data[field])
        comp.save()
        sync_payroll_profile_from_compensation(comp)
        return Response(self.get_serializer(comp).data, status=status.HTTP_201_CREATED)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        comp = self.get_object()
        serializer = self.get_serializer(comp, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        eff = data.get("effective_from", comp.effective_from)
        apply_compensation_revision(
            comp.employee,
            monthly_gross=data.get("monthly_gross", comp.monthly_gross),
            annual_ctc=data.get("annual_ctc", comp.annual_ctc),
            ctc_type=data.get("ctc_type", comp.ctc_type),
            effective_from=eff,
            user=request.user,
            note="Compensation revision",
            generate_structure=bool(data.get("monthly_gross") or data.get("annual_ctc")),
            template_overrides=data.get("template_overrides"),
            statutory_overrides=data,
        )
        comp.refresh_from_db()
        for field in (
            "payroll_group",
            "pf_applicable",
            "esi_applicable",
            "pt_applicable",
            "tds_applicable",
            "salary_structure",
            "template_overrides",
        ):
            if field in data:
                setattr(comp, field, data[field])
        comp.save()
        sync_payroll_profile_from_compensation(comp)
        return Response(self.get_serializer(comp).data)

    @action(detail=False, methods=["post"], url_path="bulk-assign-structure")
    @transaction.atomic
    def bulk_assign_structure(self, request):
        employee_ids = request.data.get("employee_ids") or []
        structure_id = request.data.get("salary_structure")
        if not employee_ids:
            raise ValidationError({"employee_ids": "Select at least one employee."})
        oid = organization_id_from_request(request)
        structure = None
        if structure_id:
            structure = PayrollSalaryStructure.objects.filter(pk=int(structure_id)).first()
            if not structure:
                raise ValidationError({"salary_structure": "Invalid salary structure."})
            if oid and structure.organization_id != int(oid):
                raise ValidationError({"salary_structure": "Structure does not belong to this organization."})
        updated = 0
        skipped = []
        for eid in employee_ids:
            comp_qs = EmployeeCompensation.objects.filter(employee_id=int(eid))
            if oid:
                comp_qs = comp_qs.filter(organization_id=int(oid))
            comp = comp_qs.first()
            if not comp:
                skipped.append(int(eid))
                continue
            comp.salary_structure = structure
            comp.save(update_fields=["salary_structure", "updated_at"])
            updated += 1
        return Response({"updated": updated, "skipped": skipped})

    @action(detail=False, methods=["get"], url_path="revision-history")
    def revision_history(self, request):
        emp_id = request.query_params.get("employee")
        if not emp_id:
            raise ValidationError({"employee": "Required."})
        qs = CompensationRevision.objects.filter(employee_id=emp_id).order_by("-effective_from")
        return Response(CompensationRevisionSerializer(qs, many=True).data)

    @action(detail=False, methods=["delete"], url_path=r"delete-revision/(?P<rev_id>\d+)")
    @transaction.atomic
    def delete_revision(self, request, rev_id=None):
        from django.shortcuts import get_object_or_404
        from rest_framework import status
        from rest_framework.exceptions import PermissionDenied
        
        rev = get_object_or_404(CompensationRevision, pk=rev_id)
        
        # Verify permissions
        comp = self.get_queryset().filter(employee=rev.employee).first()
        if not comp:
            raise PermissionDenied("You do not have permission to modify this employee's compensation.")
            
        # Delete associated salary lines with this effective date
        EmployeeSalaryLine.objects.filter(
            employee=rev.employee, 
            effective_from=rev.effective_from
        ).delete()
        
        rev.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class EmployeePayrollProfileViewSet(viewsets.ModelViewSet):
    queryset = EmployeePayrollProfile.objects.select_related("employee", "employee__user").all()
    serializer_class = EmployeePayrollProfileSerializer
    filterset_fields = ["employee", "organization"]
    http_method_names = ["get", "post", "patch", "put", "delete", "head", "options"]

    def perform_create(self, serializer):
        emp = serializer.validated_data["employee"]
        if not emp.organization_id:
            raise ValidationError({"employee": "Employee must belong to an organization."})
        serializer.save(organization_id=emp.organization_id)

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return qs.none()
        if user.is_superuser or user.role in (UserRole.ADMIN, UserRole.HR):
            return filter_by_organization(qs, organization_id_from_request(self.request))
        if user.role == UserRole.MANAGER:
            oid = user_organization_id(user)
            if oid:
                return qs.filter(organization_id=oid)
            return qs.none()
        profile = getattr(user, "employee_profile", None)
        if profile:
            return qs.filter(employee=profile)
        return qs.none()

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [permissions.IsAuthenticated(), IsAdminOrHR()]
        return [permissions.IsAuthenticated(), IsManagerOrAbove()]


class PayrollTaxDeclarationViewSet(viewsets.ModelViewSet):
    queryset = PayrollTaxDeclaration.objects.select_related("employee", "employee__user").all()
    serializer_class = PayrollTaxDeclarationSerializer
    filterset_fields = ["employee", "financial_year", "status", "employee__organization"]
    ordering = ["-financial_year", "employee_id"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return qs.none()
        if user.is_superuser or user.role in (UserRole.ADMIN, UserRole.HR):
            return filter_by_employee_org(qs, organization_id_from_request(self.request))
        if user.role == UserRole.MANAGER:
            oid = user_organization_id(user)
            if oid:
                return qs.filter(employee__organization_id=oid)
            return qs.none()
        profile = getattr(user, "employee_profile", None)
        if profile:
            return qs.filter(employee=profile)
        return qs.none()

    def get_permissions(self):
        if self.action in ("approve", "reject"):
            return [permissions.IsAuthenticated(), IsAdminOrHR()]
        if self.action in ("create", "update", "partial_update", "destroy", "list", "retrieve"):
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsManagerOrAbove()]

    def perform_create(self, serializer):
        user = self.request.user
        emp = serializer.validated_data.get("employee")
        if user.role == UserRole.EMPLOYEE or (not user.is_superuser and user.role not in (UserRole.ADMIN, UserRole.HR)):
            profile = getattr(user, "employee_profile", None)
            if not profile or emp.id != profile.id:
                raise ValidationError("You can only create declarations for yourself.")
        serializer.save()

    def perform_update(self, serializer):
        user = self.request.user
        instance = serializer.instance
        if user.role == UserRole.EMPLOYEE and not user.is_superuser:
            if instance.employee_id != getattr(user.employee_profile, "id", None):
                raise ValidationError("Not allowed.")
            if instance.status == TaxDeclarationStatus.APPROVED:
                raise ValidationError("Approved declarations cannot be edited by employees.")
        serializer.save()

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated, IsAdminOrHR])
    def approve(self, request, pk=None):
        d = self.get_object()
        d.status = TaxDeclarationStatus.APPROVED
        d.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(d).data)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated, IsAdminOrHR])
    def reject(self, request, pk=None):
        d = self.get_object()
        d.status = TaxDeclarationStatus.REJECTED
        d.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(d).data)
