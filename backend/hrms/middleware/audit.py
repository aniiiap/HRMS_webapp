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
                    if not isinstance(payload, dict):
                        payload = {}

                    resource_id = path.rstrip('/').split('/')[-1]
                    
                    try:
                        from employees.models import Employee
                        emp_name = None
                        
                        # 1. If employee ID is explicitly in the payload (like a POST request)
                        if 'employee' in payload and str(payload['employee']).isdigit():
                            emp = Employee.objects.filter(id=payload['employee']).select_related('user').first()
                            if emp and emp.user:
                                emp_name = f"{emp.user.first_name} {emp.user.last_name}".strip() or emp.user.email
                        
                        # 2. If it's a specific resource update/delete without employee in payload, fetch it from DB
                        elif str(resource_id).isdigit():
                            if resource_type == 'Attendance':
                                from attendance.models import Attendance
                                att = Attendance.objects.filter(id=resource_id).select_related('employee__user').first()
                                if att and att.employee and att.employee.user:
                                    emp_name = f"{att.employee.user.first_name} {att.employee.user.last_name}".strip() or att.employee.user.email
                            elif resource_type == 'Leave':
                                from leave_management.models import LeaveRequest
                                lr = LeaveRequest.objects.filter(id=resource_id).select_related('employee__user').first()
                                if lr and lr.employee and lr.employee.user:
                                    emp_name = f"{lr.employee.user.first_name} {lr.employee.user.last_name}".strip() or lr.employee.user.email
                            elif resource_type == 'Employee/Salary' and '/salary-lines/' not in path and '/compensation/' not in path:
                                emp = Employee.objects.filter(id=resource_id).select_related('user').first()
                                if emp and emp.user:
                                    emp_name = f"{emp.user.first_name} {emp.user.last_name}".strip() or emp.user.email
                        
                        if emp_name:
                            payload['employee'] = emp_name
                    except Exception:
                        pass
                    
                    ip_address = request.META.get('REMOTE_ADDR')
                    
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
