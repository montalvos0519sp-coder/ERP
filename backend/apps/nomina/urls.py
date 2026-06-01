from rest_framework.routers import DefaultRouter

from .views import (
    BitacoraFiscalNominaViewSet, CFDINominaViewSet, ConceptoNominaViewSet,
    ConfigNominaEmpresaViewSet, IncidenciaNominaViewSet,
    NominaEmpleadoViewSet, PeriodoNominaViewSet,
)


router = DefaultRouter()
router.register(r"config", ConfigNominaEmpresaViewSet, basename="config-nomina")
router.register(r"periodos", PeriodoNominaViewSet, basename="periodo-nomina")
router.register(r"recibos", NominaEmpleadoViewSet, basename="recibo-nomina")
router.register(r"conceptos", ConceptoNominaViewSet, basename="concepto-nomina")
router.register(r"incidencias", IncidenciaNominaViewSet, basename="incidencia-nomina")
router.register(r"cfdi", CFDINominaViewSet, basename="cfdi-nomina")
router.register(r"bitacora", BitacoraFiscalNominaViewSet, basename="bitacora-nomina")

urlpatterns = router.urls
