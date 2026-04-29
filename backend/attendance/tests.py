from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User, UserRole
from attendance.models import Attendance
from employees.models import Employee, OfficeLocationSettings


class AttendancePunchFlowTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="emp1@example.com",
            password="StrongPass123!",
            role=UserRole.EMPLOYEE,
            first_name="Emp",
            last_name="One",
        )
        self.employee = Employee.objects.create(
            user=self.user,
            employee_code="EMP001",
            location_restriction_enabled=False,
        )
        self.client.force_authenticate(user=self.user)

    def test_checkin_then_checkout_success(self):
        check_in_res = self.client.post("/api/attendance/check_in/", {"notes": "start"}, format="json")
        self.assertEqual(check_in_res.status_code, status.HTTP_200_OK)

        check_out_res = self.client.post("/api/attendance/check_out/", {"notes": "end"}, format="json")
        self.assertEqual(check_out_res.status_code, status.HTTP_200_OK)

        row = Attendance.objects.get(employee=self.employee)
        self.assertIsNotNone(row.check_in)
        self.assertIsNotNone(row.check_out)


class AttendanceGeofenceTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="emp2@example.com",
            password="StrongPass123!",
            role=UserRole.EMPLOYEE,
        )
        self.employee = Employee.objects.create(
            user=self.user,
            employee_code="EMP002",
            location_restriction_enabled=True,
        )
        OfficeLocationSettings.objects.update_or_create(
            pk=1,
            defaults={
                "name": "HQ",
                "latitude": 12.971600,
                "longitude": 77.594600,
                "radius_meters": 120,
                "geofencing_enabled": True,
            },
        )
        self.client.force_authenticate(user=self.user)

    def test_checkin_outside_radius_is_blocked(self):
        res = self.client.post(
            "/api/attendance/check_in/",
            {"latitude": 12.980000, "longitude": 77.620000},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("outside allowed office range", str(res.data).lower())
