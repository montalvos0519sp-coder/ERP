from rest_framework.routers import DefaultRouter

from .views import (
    ConceptoLiquidacionViewSet, LiquidacionOperadorViewSet, ViajesPendientesView,
)


router = DefaultRouter()
router.register(r"liquidaciones", LiquidacionOperadorViewSet, basename="liquidacion")
router.register(r"conceptos", ConceptoLiquidacionViewSet, basename="concepto-liquidacion")
router.register(r"viajes-pendientes", ViajesPendientesView, basename="viajes-pendientes-liquidar")

urlpatterns = router.urls
