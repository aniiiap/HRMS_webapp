from django.utils.deprecation import MiddlewareMixin
from django.utils import timezone
from django.core.cache import cache

class AutoDeactivateResignedUsersMiddleware(MiddlewareMixin):
    def process_request(self, request):
        if cache.get('resignation_deactivate_checked'):
            return
            
        try:
            from employees.models import Resignation, ResignationStatus
            today = timezone.localdate()
            past_resignations = Resignation.objects.filter(
                status=ResignationStatus.ACCEPTED,
                intended_last_day__lt=today,
                employee__user__is_active=True
            ).select_related('employee__user')
            
            if past_resignations.exists():
                for r in past_resignations:
                    if r.employee and r.employee.user:
                        user = r.employee.user
                        user.is_active = False
                        user.save(update_fields=['is_active'])
        except Exception:
            pass
        finally:
            cache.set('resignation_deactivate_checked', True, 3600)
