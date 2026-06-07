from rest_framework.routers import DefaultRouter
from .views import (
    ViajeViewSet, DeterminanteViewSet, CategoriaGastoViajeViewSet, GastoViajeViewSet,
)

router = DefaultRouter()
router.register(r"viajes", ViajeViewSet, basename="viaje")
router.register(r"determinantes", DeterminanteViewSet, basename="determinante")
router.register(r"categorias-gasto", CategoriaGastoViajeViewSet, basename="categoria-gasto")
router.register(r"gastos", GastoViajeViewSet, basename="gasto-viaje")
urlpatterns = router.urls
