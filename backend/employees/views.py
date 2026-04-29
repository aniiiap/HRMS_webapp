from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from datetime import time
import json
import re
import urllib.parse
import urllib.request
from rest_framework.exceptions import ValidationError

from django.conf import settings
from accounts.invite_service import issue_and_send_invite
from accounts.models import UserRole
from accounts.permissions import IsAdminOrHR, IsManagerOrAbove

from .models import Employee, EmployeeDocument, OfficeLocationSettings
from .serializers import (
    ApplyShiftTemplateSerializer,
    EmployeeDocumentSerializer,
    EmployeeOnboardSerializer,
    EmployeeSerializer,
    EmployeeWriteSerializer,
    ShiftTemplateSerializer,
    OfficeLocationSettingsSerializer,
)
from .models import ShiftTemplate


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.select_related("user", "manager").all()
    filterset_fields = ["department", "designation", "manager"]
    search_fields = ["employee_code", "user__email", "user__first_name", "user__last_name", "department"]
    ordering_fields = ["employee_code", "date_of_joining", "id"]

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
            return qs.filter(pk=profile.pk)
        return qs.none()

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return EmployeeWriteSerializer
        return EmployeeSerializer

    def get_permissions(self):
        base = [permissions.IsAuthenticated()]
        if self.action in (
            "create",
            "update",
            "partial_update",
            "destroy",
            "onboard",
            "set_active",
            "shift_templates",
            "apply_shift_template",
            "update_shift_template",
            "delete_shift_template",
            "location_settings",
        ):
            return base + [IsAdminOrHR()]
        return base

    def perform_destroy(self, instance):
        # Permanent delete: remove both profile and linked auth user.
        user = instance.user
        instance.delete()
        if user:
            user.delete()

    @action(detail=False, methods=["post"], permission_classes=[permissions.IsAuthenticated, IsAdminOrHR])
    def onboard(self, request):
        ser = EmployeeOnboardSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        emp = ser.save()
        data = EmployeeSerializer(emp, context={"request": request}).data
        _invite, invite_url, ok, detail = issue_and_send_invite(emp.user, created_by=request.user)
        data["invite_sent"] = ok
        data["message"] = "Employee created and invite email sent." if ok else "Employee created but invite email failed."
        data["email_status"] = detail
        if settings.DEBUG:
            data["invite_url"] = invite_url
        return Response(data, status=status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[permissions.IsAuthenticated, IsAdminOrHR],
        url_path="set-active",
    )
    def set_active(self, request, pk=None):
        employee = self.get_object()
        raw = request.data.get("is_active", None)
        if not isinstance(raw, bool):
            return Response({"error": "is_active must be true or false."}, status=status.HTTP_400_BAD_REQUEST)

        if request.user.id == employee.user_id and raw is False:
            return Response({"error": "You cannot deactivate your own account."}, status=status.HTTP_400_BAD_REQUEST)
        if raw is True and not employee.user.has_usable_password():
            return Response(
                {"error": "This user has not completed invite setup yet. Resend invite instead of activating manually."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        employee.user.is_active = raw
        if not raw:
            employee.user.onboarding_pending = False
        elif employee.user.has_usable_password():
            employee.user.onboarding_pending = False
        employee.user.save(update_fields=["is_active", "onboarding_pending"])
        return Response(EmployeeSerializer(employee, context={"request": request}).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get", "patch"], permission_classes=[permissions.IsAuthenticated], url_path="me")
    def me(self, request):
        profile = getattr(request.user, "employee_profile", None)
        if not profile:
            return Response({"error": "No employee profile."}, status=status.HTTP_400_BAD_REQUEST)

        if request.method.lower() == "get":
            return Response(EmployeeSerializer(profile, context={"request": request}).data, status=status.HTTP_200_OK)

        # Employee self-service editable fields.
        editable_emp_fields = {"phone", "address", "date_of_birth", "profile_image"}
        for field in editable_emp_fields:
            if field in request.data:
                setattr(profile, field, request.data.get(field))
        try:
            profile.save()
        except Exception as exc:
            raise ValidationError(
                {"profile_image": f"Profile image upload failed. Please verify Cloudinary configuration. ({exc})"}
            ) from exc

        editable_user_fields = {"first_name", "last_name"}
        u = request.user
        changed_user = []
        for field in editable_user_fields:
            if field in request.data:
                setattr(u, field, request.data.get(field))
                changed_user.append(field)
        if changed_user:
            u.save(update_fields=changed_user)

        return Response(EmployeeSerializer(profile, context={"request": request}).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get", "post"], permission_classes=[permissions.IsAuthenticated, IsAdminOrHR], url_path="shift-templates")
    def shift_templates(self, request):
        if request.method.lower() == "get":
            rows = ShiftTemplate.objects.filter(is_active=True)
            if not rows.exists():
                ShiftTemplate.objects.bulk_create(
                    [
                        ShiftTemplate(name="Day Shift", start_time=time(10, 0), end_time=time(19, 0), grace_minutes=15),
                        ShiftTemplate(name="Night Shift", start_time=time(21, 0), end_time=time(6, 0), grace_minutes=10, early_checkout_grace_minutes=10, is_night_shift=True),
                    ]
                )
                rows = ShiftTemplate.objects.filter(is_active=True)
            return Response(ShiftTemplateSerializer(rows, many=True).data, status=status.HTTP_200_OK)
        ser = ShiftTemplateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        tpl = ser.save()
        return Response(ShiftTemplateSerializer(tpl).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], permission_classes=[permissions.IsAuthenticated, IsAdminOrHR], url_path="apply-shift-template")
    def apply_shift_template(self, request):
        ser = ApplyShiftTemplateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        template = ShiftTemplate.objects.filter(pk=ser.validated_data["template_id"], is_active=True).first()
        if not template:
            return Response({"error": "Shift template not found."}, status=status.HTTP_404_NOT_FOUND)
        employee_ids = ser.validated_data["employee_ids"]
        updated = Employee.objects.filter(pk__in=employee_ids).update(
            shift_template=template,
            shift_start_time=template.start_time,
            shift_end_time=template.end_time,
            grace_minutes=template.grace_minutes,
            early_checkout_grace_minutes=template.early_checkout_grace_minutes,
        )
        return Response(
            {
                "message": f"Shift template '{template.name}' applied.",
                "employees_updated": updated,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["patch"], permission_classes=[permissions.IsAuthenticated, IsAdminOrHR], url_path=r"shift-templates/(?P<template_id>[^/.]+)")
    def update_shift_template(self, request, template_id=None):
        template = ShiftTemplate.objects.filter(pk=template_id).first()
        if not template:
            return Response({"error": "Shift template not found."}, status=status.HTTP_404_NOT_FOUND)
        ser = ShiftTemplateSerializer(template, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ShiftTemplateSerializer(template).data, status=status.HTTP_200_OK)

    @update_shift_template.mapping.delete
    def delete_shift_template(self, request, template_id=None):
        template = ShiftTemplate.objects.filter(pk=template_id).first()
        if not template:
            return Response({"error": "Shift template not found."}, status=status.HTTP_404_NOT_FOUND)
        template.is_active = False
        template.save(update_fields=["is_active", "updated_at"])
        return Response({"message": "Shift template deleted."}, status=status.HTTP_200_OK)

    def _fetch_json(self, url: str):
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "HRCore/1.0 (+https://hrms.staffdox.co.in)",
                "Accept": "application/json",
            },
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode("utf-8"))

    @action(detail=False, methods=["get", "patch"], permission_classes=[permissions.IsAuthenticated, IsAdminOrHR], url_path="location-settings")
    def location_settings(self, request):
        settings_obj, _ = OfficeLocationSettings.objects.get_or_create(pk=1)
        if request.method.lower() == "get":
            return Response(OfficeLocationSettingsSerializer(settings_obj).data, status=status.HTTP_200_OK)
        ser = OfficeLocationSettingsSerializer(settings_obj, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(OfficeLocationSettingsSerializer(settings_obj).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated, IsAdminOrHR], url_path="location-search")
    def location_search(self, request):
        q = (request.query_params.get("q") or "").strip()
        if len(q) < 2:
            return Response({"results": []}, status=status.HTTP_200_OK)

        # Hard fallback: accept direct coordinates or Google Maps URL with coordinates.
        coord_patterns = [
            re.search(r"(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)", q),
            re.search(r"@(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)", q),
            re.search(r"!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)", q),
        ]
        coord_match = next((m for m in coord_patterns if m), None)
        if coord_match:
            lat = coord_match.group(1)
            lon = coord_match.group(2)
            label = f"Selected coordinates ({lat}, {lon})"
            try:
                rev_params = urllib.parse.urlencode(
                    {"format": "jsonv2", "lat": lat, "lon": lon, "zoom": 18, "addressdetails": 1}
                )
                reverse_payload = self._fetch_json(f"https://nominatim.openstreetmap.org/reverse?{rev_params}")
                if isinstance(reverse_payload, dict):
                    label = reverse_payload.get("display_name") or label
            except Exception:
                pass
            return Response(
                {
                    "results": [
                        {
                            "display_name": label,
                            "lat": str(lat),
                            "lon": str(lon),
                            "place_id": f"coord-{lat}-{lon}",
                        }
                    ]
                },
                status=status.HTTP_200_OK,
            )

        normalized = " ".join(q.split())
        cleaned = re.sub(r"[^\w\s,.-]", " ", normalized)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        pin_match = re.search(r"\b\d{6}\b", cleaned)

        queries = []

        def add_query(val):
            v = " ".join((val or "").split()).strip(" ,")
            if len(v) < 2:
                return
            if v not in queries:
                queries.append(v)

        add_query(cleaned)
        if "india" not in cleaned.lower():
            add_query(f"{cleaned}, India")

        parts = [p.strip() for p in cleaned.split(",") if p.strip()]
        if len(parts) >= 2:
            add_query(", ".join(parts[-2:]))
            add_query(", ".join(parts[-3:]))
            if "india" not in parts[-1].lower():
                add_query(", ".join(parts[-2:] + ["India"]))

        # Try removing business words/noise often present in copied Google addresses
        stripped = re.sub(
            r"\b(office|no|near|opp|opposite|floor|shop|building|bldg|pin|code)\b",
            " ",
            cleaned,
            flags=re.IGNORECASE,
        )
        stripped = re.sub(r"\s+", " ", stripped).strip(" ,")
        add_query(stripped)
        if stripped and "india" not in stripped.lower():
            add_query(f"{stripped}, India")

        if pin_match:
            pin = pin_match.group(0)
            add_query(pin)
            add_query(f"{pin}, India")

        merged = []
        seen = set()

        # Preferred provider: Google Geocoding (if API key configured)
        google_key = (getattr(settings, "GOOGLE_MAPS_API_KEY", "") or "").strip()
        if google_key:
            try:
                params = urllib.parse.urlencode({"address": normalized, "key": google_key})
                payload = self._fetch_json(f"https://maps.googleapis.com/maps/api/geocode/json?{params}")
                g_results = payload.get("results", []) if isinstance(payload, dict) else []
            except Exception:
                g_results = []
            for item in g_results:
                loc = ((item.get("geometry") or {}).get("location") or {})
                lat = loc.get("lat")
                lon = loc.get("lng")
                if lat is None or lon is None:
                    continue
                key = f"g-{item.get('place_id')}"
                if key in seen:
                    continue
                seen.add(key)
                merged.append(
                    {
                        "display_name": item.get("formatted_address", ""),
                        "lat": str(lat),
                        "lon": str(lon),
                        "place_id": key,
                    }
                )

        # Primary: Nominatim query variants
        for query in queries:
            try:
                params = urllib.parse.urlencode(
                    {
                        "q": query,
                        "format": "json",
                        "limit": 8,
                        "addressdetails": 1,
                        "countrycodes": "in",
                    }
                )
                payload = self._fetch_json(f"https://nominatim.openstreetmap.org/search?{params}")
            except Exception:
                payload = []
            for item in payload:
                key = f"n-{item.get('place_id')}"
                if key in seen:
                    continue
                seen.add(key)
                merged.append(
                    {
                        "display_name": item.get("display_name", ""),
                        "lat": item.get("lat"),
                        "lon": item.get("lon"),
                        "place_id": key,
                    }
                )

        # Secondary fallback: maps.co geocoder
        if len(merged) < 3:
            try:
                params = urllib.parse.urlencode({"q": normalized, "api_key": ""})
                payload = self._fetch_json(f"https://geocode.maps.co/search?{params}")
            except Exception:
                payload = []
            for item in payload if isinstance(payload, list) else []:
                lat = item.get("lat")
                lon = item.get("lon")
                if lat is None or lon is None:
                    continue
                key = f"m-{item.get('place_id')}-{lat}-{lon}"
                if key in seen:
                    continue
                seen.add(key)
                merged.append(
                    {
                        "display_name": item.get("display_name", ""),
                        "lat": str(lat),
                        "lon": str(lon),
                        "place_id": key,
                    }
                )

        # Fallback: Photon for better fuzzy matches
        if len(merged) < 3:
            try:
                params = urllib.parse.urlencode({"q": normalized, "limit": 8})
                payload = self._fetch_json(f"https://photon.komoot.io/api/?{params}")
                features = payload.get("features", []) if isinstance(payload, dict) else []
            except Exception:
                features = []
            for item in features:
                props = item.get("properties", {}) or {}
                coords = (item.get("geometry", {}) or {}).get("coordinates", [None, None])
                lon, lat = coords[0], coords[1]
                if lat is None or lon is None:
                    continue
                label_parts = [
                    props.get("name"),
                    props.get("district"),
                    props.get("city"),
                    props.get("state"),
                    props.get("country"),
                ]
                label = ", ".join([p for p in label_parts if p])
                key = f"p-{props.get('osm_id')}-{lat}-{lon}"
                if key in seen:
                    continue
                seen.add(key)
                merged.append(
                    {
                        "display_name": label or normalized,
                        "lat": str(lat),
                        "lon": str(lon),
                        "place_id": key,
                    }
                )

        results = merged[:8]
        return Response({"results": results}, status=status.HTTP_200_OK)


class EmployeeDocumentViewSet(viewsets.ModelViewSet):
    queryset = EmployeeDocument.objects.select_related("employee", "employee__user").all()
    serializer_class = EmployeeDocumentSerializer
    filterset_fields = ["employee"]

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
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [permissions.IsAuthenticated(), IsAdminOrHR()]
        return [permissions.IsAuthenticated()]
