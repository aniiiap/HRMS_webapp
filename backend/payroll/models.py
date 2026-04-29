from django.db import models

from employees.models import Employee


class PayrollRecord(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="payroll_records")
    period_year = models.PositiveIntegerField()
    period_month = models.PositiveIntegerField()
    basic_salary = models.DecimalField(max_digits=12, decimal_places=2)
    allowances = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    net_salary = models.DecimalField(max_digits=12, decimal_places=2)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-period_year", "-period_month", "employee__employee_code"]
        constraints = [
            models.UniqueConstraint(
                fields=["employee", "period_year", "period_month"],
                name="unique_payroll_period_per_employee",
            ),
        ]

    def __str__(self):
        return f"{self.employee.employee_code} {self.period_year}-{self.period_month:02d}"
