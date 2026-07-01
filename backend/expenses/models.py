from django.db import models
from employees.models import Employee, Organization
from payroll.models import PayrollRun

class ExpenseCategory(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="expense_categories")
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["organization", "name"], name="uniq_expense_category_name_per_org"),
        ]

    def __str__(self):
        return f"{self.name} ({self.organization.slug})"

class ExpenseClaimStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"

class ExpenseClaim(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="expense_claims")
    category = models.ForeignKey(ExpenseCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name="claims")
    title = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    date_incurred = models.DateField()
    receipt = models.FileField(upload_to="expense_receipts/", null=True, blank=True)
    notes = models.TextField(blank=True)
    
    status = models.CharField(max_length=16, choices=ExpenseClaimStatus.choices, default=ExpenseClaimStatus.PENDING)
    approved_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    admin_note = models.TextField(blank=True)
    
    is_reimbursed = models.BooleanField(default=False)
    skip_payroll = models.BooleanField(default=False)
    payroll_run = models.ForeignKey(PayrollRun, on_delete=models.SET_NULL, null=True, blank=True, related_name="reimbursed_expenses")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} - {self.employee.employee_code} ({self.status})"
