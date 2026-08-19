from django.db import models
from employees.models import Organization, Employee

class AssetCategory(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='asset_categories')
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        unique_together = ['organization', 'name']
        verbose_name_plural = "Asset Categories"

    def __str__(self):
        return self.name

class AssetStatus(models.TextChoices):
    AVAILABLE = 'Available', 'Available'
    ASSIGNED = 'Assigned', 'Assigned'
    UNDER_REPAIR = 'Under Repair', 'Under Repair'
    LOST_BROKEN = 'Lost/Broken', 'Lost/Broken'
    RETIRED = 'Retired', 'Retired'

class Asset(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='assets')
    name = models.CharField(max_length=255)
    category = models.ForeignKey(AssetCategory, on_delete=models.PROTECT, related_name='assets')
    serial_number = models.CharField(max_length=255, blank=True, null=True)
    purchase_date = models.DateField(blank=True, null=True)
    warranty_expiry_date = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=50, choices=AssetStatus.choices, default=AssetStatus.AVAILABLE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ['organization', 'serial_number']

    def __str__(self):
        return f"{self.name} - {self.serial_number or 'N/A'}"

class AssetAssignment(models.Model):
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='assignments')
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='asset_assignments')
    assigned_date = models.DateField()
    returned_date = models.DateField(blank=True, null=True)
    condition_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-assigned_date']

    def __str__(self):
        try:
            return f"{self.asset.name} assigned to {self.employee.user.get_full_name()}"
        except Exception:
            return f"{self.asset.name} assignment"
