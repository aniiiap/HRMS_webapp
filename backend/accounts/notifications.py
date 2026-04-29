from accounts.models import AppNotification, User, UserRole


def notify_roles(*, title: str, message: str, type_value: str, roles: tuple[str, ...] = (UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)) -> None:
    users = User.objects.filter(is_active=True, role__in=roles)
    AppNotification.objects.bulk_create(
        [
            AppNotification(user=u, title=title, message=message, type=type_value)
            for u in users
        ]
    )


def notify_user(*, user: User, title: str, message: str, type_value: str) -> None:
    AppNotification.objects.create(user=user, title=title, message=message, type=type_value)
