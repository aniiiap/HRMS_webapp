import json
from django.utils.deprecation import MiddlewareMixin
from accounts.models import ActionLog, UserRole

class AuditMiddleware(MiddlewareMixin):
    def process_request(self, request):
        if request.method in ['POST', 'PUT', 'PATCH']:
            try:
                request._audit_payload = json.loads(request.body)
            except Exception:
                request._audit_payload = {}

    def process_response(self, request, response):
        if request.method in ['POST', 'PUT', 'PATCH', 'DELETE'] and response.status_code >= 200 and response.status_code < 400:
            path = request.path
            is_tracked = False
            resource_type = 'Unknown'
            if path.startswith('/api/leaves/'):
                is_tracked = True
                resource_type = 'Leave'
            elif path.startswith('/api/payroll/'):
                is_tracked = True
                resource_type = 'Payroll'
            elif path.startswith('/api/attendance/'):
                is_tracked = True
                resource_type = 'Attendance'
            elif path.startswith('/api/employees/'):
                is_tracked = True
                resource_type = 'Employee/Salary'
                
            if is_tracked and hasattr(request, 'user') and request.user.is_authenticated:
                user = request.user
                if user.role in [UserRole.ADMIN, UserRole.HR, UserRole.MANAGER]:
                    payload = getattr(request, '_audit_payload', {})
                    
                    ip_address = request.META.get('REMOTE_ADDR')
                    resource_id = path.rstrip('/').split('/')[-1]
                    
                    ActionLog.objects.create(
                        user=user,
                        user_name=f'{user.first_name} {user.last_name}'.strip() or user.email,
                        action_type=request.method,
                        resource_type=resource_type,
                        resource_id=resource_id,
                        description=f'{user.email} did {request.method} on {path}',
                        payload=payload,
                        ip_address=ip_address
                    )
        return response
