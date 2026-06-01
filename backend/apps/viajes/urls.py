from rest_framework.routers import DefaultRouter
from .views import ViajeViewSet

router = DefaultRouter()
router.register(r"viajes", ViajeViewSet, basename="viaje")
urlpatterns = router.urls
