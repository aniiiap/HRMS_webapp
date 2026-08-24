from django.db import models
from employees.models import Employee
from accounts.models import User

class TicketCategory(models.TextChoices):
    HR = 'hr', 'HR'
    IT = 'it', 'IT'
    PAYROLL = 'payroll', 'Payroll'
    OTHER = 'other', 'Other'

class TicketPriority(models.TextChoices):
    LOW = 'low', 'Low'
    MEDIUM = 'medium', 'Medium'
    HIGH = 'high', 'High'

class TicketStatus(models.TextChoices):
    OPEN = 'open', 'Open'
    IN_PROGRESS = 'in_progress', 'In Progress'
    RESOLVED = 'resolved', 'Resolved'
    CLOSED = 'closed', 'Closed'
    ESCALATED = 'escalated', 'Escalated'

class Ticket(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='tickets')
    title = models.CharField(max_length=255)
    description = models.TextField()
    category = models.CharField(max_length=20, choices=TicketCategory.choices, default=TicketCategory.OTHER)
    priority = models.CharField(max_length=20, choices=TicketPriority.choices, default=TicketPriority.LOW)
    status = models.CharField(max_length=20, choices=TicketStatus.choices, default=TicketStatus.OPEN)
    attachment = models.FileField(upload_to='helpdesk/tickets/', blank=True, null=True)
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tickets')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"[{self.get_status_display()}] {self.title} - {self.employee.employee_code}"

class TicketMessage(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ticket_messages')
    message = models.TextField()
    attachment = models.FileField(upload_to='helpdesk/messages/', blank=True, null=True)
    is_ai = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Message by {self.sender.email} on Ticket {self.ticket_id}"

class PlatformTicket(models.Model):
    organization = models.ForeignKey('employees.Organization', on_delete=models.CASCADE, related_name='platform_tickets', null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_platform_tickets')
    title = models.CharField(max_length=255)
    description = models.TextField()
    priority = models.CharField(max_length=20, choices=TicketPriority.choices, default=TicketPriority.MEDIUM)
    status = models.CharField(max_length=20, choices=TicketStatus.choices, default=TicketStatus.OPEN)
    attachment = models.FileField(upload_to='helpdesk/platform_tickets/', blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Platform Ticket #{self.id}: {self.title}"

class PlatformTicketMessage(models.Model):
    ticket = models.ForeignKey(PlatformTicket, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.TextField()
    attachment = models.FileField(upload_to='helpdesk/platform_messages/', blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
