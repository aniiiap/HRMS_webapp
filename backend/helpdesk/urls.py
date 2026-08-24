from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TicketViewSet, TicketMessageViewSet, PlatformTicketViewSet, PlatformTicketMessageViewSet

router = DefaultRouter()
router.register(r'tickets', TicketViewSet, basename='ticket')
router.register(r'messages', TicketMessageViewSet, basename='ticketmessage')
router.register(r'platform-tickets', PlatformTicketViewSet, basename='platformticket')
router.register(r'platform-messages', PlatformTicketMessageViewSet, basename='platformticketmessage')

urlpatterns = [
    path('', include(router.urls)),
]
