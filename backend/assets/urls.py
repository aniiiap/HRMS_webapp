from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AssetViewSet, AssetAssignmentViewSet, AssetCategoryViewSet

router = DefaultRouter()
router.register(r'asset-categories', AssetCategoryViewSet, basename='asset-category')
router.register(r'assets', AssetViewSet, basename='asset')
router.register(r'asset-assignments', AssetAssignmentViewSet, basename='asset-assignment')

urlpatterns = [
    path('', include(router.urls)),
]
