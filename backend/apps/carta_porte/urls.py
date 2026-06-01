from rest_framework.routers import DefaultRouter

from .views import (
    AutotransporteViewSet,
    CartaPorteViewSet,
    OperadorViewSet,
    UbicacionViewSet,
)

router = DefaultRouter()
router.register(r"ubicaciones", UbicacionViewSet, basename="cp-ubicacion")
router.register(r"autotransportes", AutotransporteViewSet, basename="cp-autotransporte")
router.register(r"operadores", OperadorViewSet, basename="cp-operador")
router.register(r"cartas-porte", CartaPorteViewSet, basename="carta-porte")

urlpatterns = router.urls
