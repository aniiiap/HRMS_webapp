from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LetterTemplateViewSet, SentLetterViewSet

router = DefaultRouter()
router.register(r'templates', LetterTemplateViewSet, basename='letter-templates')
router.register(r'history', SentLetterViewSet, basename='sent-letters')

urlpatterns = [
    path('', include(router.urls)),
]
