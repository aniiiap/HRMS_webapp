from rest_framework import serializers
from .models import Ticket, TicketMessage
from employees.serializers import EmployeeSerializer
from accounts.serializers import UserSerializer

class TicketMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_avatar = serializers.SerializerMethodField()

    class Meta:
        model = TicketMessage
        fields = ['id', 'ticket', 'sender', 'sender_name', 'sender_avatar', 'message', 'attachment', 'is_ai', 'created_at']
        read_only_fields = ['sender', 'created_at', 'is_ai']

    def get_sender_name(self, obj):
        return f"{obj.sender.first_name} {obj.sender.last_name}".strip() or obj.sender.email

    def get_sender_avatar(self, obj):
        try:
            return obj.sender.employee_profile.profile_image.url if obj.sender.employee_profile.profile_image else None
        except Exception:
            return None


class TicketSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    employee_code = serializers.CharField(source='employee.employee_code', read_only=True)
    employee_avatar = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()
    messages = TicketMessageSerializer(many=True, read_only=True)
    
    class Meta:
        model = Ticket
        fields = [
            'id', 'employee', 'employee_name', 'employee_code', 'employee_avatar',
            'title', 'description', 'category', 'priority', 'status',
            'attachment', 'assigned_to', 'assigned_to_name',
            'created_at', 'updated_at', 'messages'
        ]
        read_only_fields = ['employee', 'created_at', 'updated_at']

    def get_employee_name(self, obj):
        u = obj.employee.user
        return f"{u.first_name} {u.last_name}".strip() or u.email

    def get_employee_avatar(self, obj):
        if obj.employee.profile_image:
            return obj.employee.profile_image.url
        return None

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return f"{obj.assigned_to.first_name} {obj.assigned_to.last_name}".strip() or obj.assigned_to.email
        return None

from .models import PlatformTicket, PlatformTicketMessage

class PlatformTicketMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = PlatformTicketMessage
        fields = ['id', 'ticket', 'sender', 'sender_name', 'message', 'attachment', 'created_at']
        read_only_fields = ['sender', 'created_at']

    def get_sender_name(self, obj):
        return f"{obj.sender.first_name} {obj.sender.last_name}".strip() or obj.sender.email

class PlatformTicketSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    messages = PlatformTicketMessageSerializer(many=True, read_only=True)
    
    class Meta:
        model = PlatformTicket
        fields = [
            'id', 'organization', 'organization_name', 'created_by', 'created_by_name',
            'title', 'description', 'priority', 'status', 'attachment',
            'created_at', 'updated_at', 'messages'
        ]
        read_only_fields = ['created_by', 'organization', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.email

