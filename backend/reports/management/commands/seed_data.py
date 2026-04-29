import random
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from accounts.models import User, UserRole
from attendance.models import Attendance
from employees.models import Employee
from leave_management.models import LeaveRequest, LeaveStatus, LeaveType
from payroll.models import PayrollRecord


class Command(BaseCommand):
    help = "Seed demo HRMS data (departments, employees, attendance, leaves, payroll)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--password",
            default="Demo@12345",
            help="Password for created demo users (default: Demo@12345).",
        )
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete existing demo data and re-seed from scratch.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        random.seed(42)
        password = options["password"]
        reset = options["reset"]

        departments = [
            "Engineering",
            "Human Resources",
            "Finance",
            "Sales",
            "Operations",
        ]

        if reset:
            self._reset_demo_data()
            self.stdout.write(self.style.WARNING("Existing demo data removed."))

        admin_user = self._upsert_user(
            email="admin.demo@hrms.local",
            first_name="System",
            last_name="Admin",
            role=UserRole.ADMIN,
            password=password,
            is_staff=True,
            is_superuser=True,
        )
        hr_user = self._upsert_user(
            email="hr.demo@hrms.local",
            first_name="Helen",
            last_name="Reed",
            role=UserRole.HR,
            password=password,
            is_staff=True,
        )
        manager_user = self._upsert_user(
            email="manager.demo@hrms.local",
            first_name="Mason",
            last_name="Clark",
            role=UserRole.MANAGER,
            password=password,
            is_staff=False,
        )

        manager_emp = self._upsert_employee(
            user=manager_user,
            employee_code="EMP-MGR-001",
            department="Engineering",
            designation="Engineering Manager",
            phone="9000000001",
            date_of_joining=date.today() - timedelta(days=900),
            date_of_birth=date(1988, 4, 12),
            address="Bangalore, India",
            manager=None,
        )

        hr_emp = self._upsert_employee(
            user=hr_user,
            employee_code="EMP-HR-001",
            department="Human Resources",
            designation="HR Business Partner",
            phone="9000000002",
            date_of_joining=date.today() - timedelta(days=700),
            date_of_birth=date(1992, 8, 25),
            address="Mumbai, India",
            manager=manager_emp,
        )

        first_names = [
            "Aarav",
            "Isha",
            "Rohan",
            "Meera",
            "Karan",
            "Nisha",
            "Vikram",
            "Pooja",
            "Arjun",
            "Sneha",
        ]
        last_names = [
            "Sharma",
            "Patel",
            "Iyer",
            "Kapoor",
            "Reddy",
            "Nair",
            "Malhotra",
            "Joshi",
            "Gupta",
            "Singh",
        ]
        designations = [
            "Software Engineer",
            "HR Executive",
            "Financial Analyst",
            "Sales Associate",
            "Operations Specialist",
            "QA Engineer",
            "Product Analyst",
            "Recruiter",
            "Account Executive",
            "Support Engineer",
        ]

        demo_employees = []
        for i in range(10):
            fname = first_names[i]
            lname = last_names[i]
            role = UserRole.EMPLOYEE
            email = f"{fname.lower()}.{lname.lower()}@hrms.local"
            user = self._upsert_user(
                email=email,
                first_name=fname,
                last_name=lname,
                role=role,
                password=password,
            )
            department = departments[i % len(departments)]
            # Spread birthdays across the year for the birthday widget demo
            bday = date(1995 + (i % 8), (i % 11) + 1, min(28, (i * 3) % 28 + 1))
            employee = self._upsert_employee(
                user=user,
                employee_code=f"EMP-{i+1:03d}",
                department=department,
                designation=designations[i % len(designations)],
                phone=f"9{str(i+10).zfill(9)}",
                date_of_joining=date.today() - timedelta(days=500 - i * 15),
                date_of_birth=bday,
                address=f"{department} Block, India",
                manager=manager_emp if i % 4 != 0 else hr_emp,
            )
            demo_employees.append(employee)

        all_employees = [manager_emp, hr_emp] + demo_employees
        self._seed_attendance(all_employees, days=30)
        self._seed_leaves(all_employees, reviewer=hr_user)
        self._seed_payroll(all_employees)

        self.stdout.write(self.style.SUCCESS("Seed data created successfully."))
        self.stdout.write("Demo credentials:")
        self.stdout.write("  admin.demo@hrms.local / " + password)
        self.stdout.write("  hr.demo@hrms.local / " + password)
        self.stdout.write("  manager.demo@hrms.local / " + password)
        self.stdout.write("  Sample employee: aarav.sharma@hrms.local / " + password)

    def _reset_demo_data(self):
        demo_email_suffix = "@hrms.local"
        demo_users = User.objects.filter(email__endswith=demo_email_suffix)
        demo_employees = Employee.objects.filter(user__in=demo_users)
        Attendance.objects.filter(employee__in=demo_employees).delete()
        LeaveRequest.objects.filter(employee__in=demo_employees).delete()
        PayrollRecord.objects.filter(employee__in=demo_employees).delete()
        demo_employees.delete()
        demo_users.delete()

    def _upsert_user(
        self,
        *,
        email,
        first_name,
        last_name,
        role,
        password,
        is_staff=False,
        is_superuser=False,
    ):
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "first_name": first_name,
                "last_name": last_name,
                "role": role,
                "is_staff": is_staff,
                "is_superuser": is_superuser,
                "is_active": True,
            },
        )
        changed = created
        for field, value in {
            "first_name": first_name,
            "last_name": last_name,
            "role": role,
            "is_staff": is_staff,
            "is_superuser": is_superuser,
            "is_active": True,
        }.items():
            if getattr(user, field) != value:
                setattr(user, field, value)
                changed = True
        user.set_password(password)
        changed = True
        if changed:
            user.save()
        return user

    def _upsert_employee(
        self,
        *,
        user,
        employee_code,
        department,
        designation,
        phone,
        date_of_joining,
        date_of_birth=None,
        address,
        manager,
    ):
        employee, _ = Employee.objects.update_or_create(
            user=user,
            defaults={
                "employee_code": employee_code,
                "department": department,
                "designation": designation,
                "phone": phone,
                "date_of_joining": date_of_joining,
                "date_of_birth": date_of_birth,
                "address": address,
                "manager": manager,
            },
        )
        return employee

    def _seed_attendance(self, employees, days=30):
        today = timezone.localdate()
        for employee in employees:
            for offset in range(days):
                att_date = today - timedelta(days=offset)
                if att_date.weekday() >= 5:
                    continue
                is_present = random.random() < 0.9
                check_in = None
                check_out = None
                notes = ""
                if is_present:
                    in_hour = 9 + random.choice([0, 0, 0, 1])
                    in_minute = random.randint(0, 35)
                    out_hour = 17 + random.choice([0, 1, 1, 2])
                    out_minute = random.randint(5, 55)
                    check_in = timezone.make_aware(
                        datetime.combine(att_date, time(hour=in_hour, minute=in_minute))
                    )
                    check_out = timezone.make_aware(
                        datetime.combine(att_date, time(hour=out_hour, minute=out_minute))
                    )
                    notes = "On-time" if in_hour <= 9 else "Slightly late"
                else:
                    notes = "Absent"
                Attendance.objects.update_or_create(
                    employee=employee,
                    date=att_date,
                    defaults={
                        "check_in": check_in,
                        "check_out": check_out,
                        "notes": notes,
                    },
                )

    def _seed_leaves(self, employees, reviewer):
        leave_types = [choice[0] for choice in LeaveType.choices]
        statuses = [LeaveStatus.PENDING, LeaveStatus.APPROVED, LeaveStatus.REJECTED]
        today = timezone.localdate()
        for index, employee in enumerate(employees):
            # Two leave records per employee
            for leave_index in range(2):
                start = today - timedelta(days=(index * 3 + leave_index * 11 + 20))
                duration = random.choice([1, 2, 3])
                end = start + timedelta(days=duration - 1)
                status = random.choice(statuses)
                reviewed_at = timezone.now() if status != LeaveStatus.PENDING else None
                reviewed_by = reviewer if status != LeaveStatus.PENDING else None
                review_note = (
                    "Approved for personal commitments."
                    if status == LeaveStatus.APPROVED
                    else "Rejected due to project deadlines."
                    if status == LeaveStatus.REJECTED
                    else ""
                )
                LeaveRequest.objects.update_or_create(
                    employee=employee,
                    start_date=start,
                    end_date=end,
                    defaults={
                        "leave_type": random.choice(leave_types),
                        "reason": "Family/personal reason",
                        "status": status,
                        "reviewed_by": reviewed_by,
                        "reviewed_at": reviewed_at,
                        "review_note": review_note,
                    },
                )

    def _seed_payroll(self, employees):
        today = timezone.localdate()
        periods = []
        y, m = today.year, today.month
        periods.append((y, m))
        if m == 1:
            periods.append((y - 1, 12))
        else:
            periods.append((y, m - 1))

        for idx, employee in enumerate(employees):
            base = Decimal("35000.00") + Decimal(idx * 2500)
            allowance = (base * Decimal("0.15")).quantize(Decimal("0.01"))
            deduction = (base * Decimal("0.05")).quantize(Decimal("0.01"))
            tax = (base * Decimal("0.10")).quantize(Decimal("0.01"))
            net = (base + allowance - deduction - tax).quantize(Decimal("0.01"))

            for year, month in periods:
                PayrollRecord.objects.update_or_create(
                    employee=employee,
                    period_year=year,
                    period_month=month,
                    defaults={
                        "basic_salary": base,
                        "allowances": allowance,
                        "deductions": deduction,
                        "tax": tax,
                        "net_salary": net,
                        "notes": "Auto-generated demo payslip data.",
                    },
                )
