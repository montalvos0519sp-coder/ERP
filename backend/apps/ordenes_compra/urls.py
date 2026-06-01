from rest_framework.routers import DefaultRouter
from .views import OrdenCompraViewSet, PartidaOCViewSet

router = DefaultRouter()
router.register(r"ordenes", OrdenCompraViewSet, basename="orden-compra")
router.register(r"partidas", PartidaOCViewSet, basename="partida-oc")
urlpatterns = router.urls
