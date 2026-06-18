"""Workflow tests: attendance + leave → paid_days."""

from datetime import date, datetime, time
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from attendance.models import Attendance
from employees.models import Employee, Organization
from leave_management.models import LeaveRequest, LeaveStatus, LeaveType

from payroll.services.paid_days import compute_paid_days_for_employee

User = get_user_model()


class PaidDaysWorkflowTests(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(name="Test Co", slug="test-co-wf")
        self.user = User.objects.create_user(email="wf@example.com", password="x")
        self.employee = Employee.objects.create(
            user=self.user,
            organization=self.org,
            employee_code="WF-01",
            date_of_joining=date(2026, 5, 1),
            shift_start_time=time(9, 0),
            shift_end_time=time(18, 0),
        )

    def _att(self, d: date, check_in=True, check_out=True, late=False):
        tz = timezone.get_current_timezone()
        ci = timezone.make_aware(datetime.combine(d, time(9, 30 if late else 9, 0)), tz)
        co = timezone.make_aware(datetime.combine(d, time(18, 0)), tz) if check_out else None
        return Attendance.objects.create(
            employee=self.employee,
            date=d,
            check_in=ci if check_in else None,
            check_out=co,
        )

    def test_full_present_month(self):
        # Use a completed month so future weekdays are not auto-credited.
        for day in range(1, 31):
            d = date(2026, 4, day)
            if d.weekday() < 5:
                self._att(d)
        b = compute_paid_days_for_employee(self.employee, 2026, 4, 22)
        self.assertGreaterEqual(b["paid_days"], Decimal("20"))
        self.assertLessEqual(b["lop_days"], Decimal("2"))

    def test_unpaid_leave_reduces_paid_days(self):
        LeaveRequest.objects.create(
            employee=self.employee,
            leave_type=LeaveType.LOP,
            start_date=date(2026, 5, 5),
            end_date=date(2026, 5, 5),
            status=LeaveStatus.APPROVED,
        )
        for day in range(1, 23):
            d = date(2026, 5, day)
            if d.weekday() < 5 and d != date(2026, 5, 5):
                self._att(d)
        b = compute_paid_days_for_employee(self.employee, 2026, 5, 22)
        self.assertGreaterEqual(b["unpaid_leave_days"], Decimal("1"))
        self.assertGreaterEqual(b["lop_days"], Decimal("1"))

    def test_paid_leave_counts_as_present(self):
        LeaveRequest.objects.create(
            employee=self.employee,
            leave_type=LeaveType.PAID,
            start_date=date(2026, 5, 6),
            end_date=date(2026, 5, 6),
            status=LeaveStatus.APPROVED,
        )
        b = compute_paid_days_for_employee(self.employee, 2026, 5, 22)
        self.assertGreaterEqual(b["paid_leave_days"], Decimal("1"))

    def test_absent_day_lop(self):
        b = compute_paid_days_for_employee(self.employee, 2026, 5, 22)
        self.assertGreaterEqual(b["absent_days"], Decimal("1"))

    def test_late_half_day(self):
        d = date(2026, 5, 7)
        if d.weekday() < 5:
            self._att(d, late=True)
        b = compute_paid_days_for_employee(self.employee, 2026, 5, 22)
        self.assertGreaterEqual(b["half_day_penalties"], Decimal("0.5"))

    def test_mid_month_join_excludes_pre_join(self):
        self.employee.date_of_joining = date(2026, 5, 15)
        self.employee.save(update_fields=["date_of_joining"])
        b = compute_paid_days_for_employee(self.employee, 2026, 5, 22)
        self.assertLessEqual(b["absent_days"], Decimal("10"))
