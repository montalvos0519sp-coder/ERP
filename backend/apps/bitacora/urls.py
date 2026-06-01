from rest_framework.routers import DefaultRouter

from .views import EventoBitacoraViewSet

router = DefaultRouter()
router.register(r"eventos", EventoBitacoraViewSet, basename="evento-bitacora")

urlpatterns = router.urls
