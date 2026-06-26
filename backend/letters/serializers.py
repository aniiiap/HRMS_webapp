from rest_framework import serializers
from .models import LetterTemplate, SentLetter
from employees.serializers import EmployeeSerializer

class LetterTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = LetterTemplate
        fields = ["id", "name", "subject_template", "body_html", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

class SentLetterSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.user.get_full_name", read_only=True)
    employee_email = serializers.CharField(source="employee.user.email", read_only=True)
    template_name = serializers.CharField(source="template.name", read_only=True)

    class Meta:
        model = SentLetter
        fields = [
            "id", "employee", "employee_name", "employee_email", "template", 
            "template_name", "subject", "note", "pdf_file", "status", "signed_at", "sent_at"
        ]
        read_only_fields = ["id", "pdf_file", "status", "signed_at", "sent_at"]

class SendLetterRequestSerializer(serializers.Serializer):
    employee_ids = serializers.ListField(child=serializers.IntegerField())
    template_id = serializers.IntegerField(required=False, allow_null=True)
    subject = serializers.CharField(max_length=255)
    body_html = serializers.CharField()
    note = serializers.CharField(required=False, allow_blank=True)
    append_signature = serializers.BooleanField(default=False)
    signature_image = serializers.ImageField(required=False, allow_null=True)
