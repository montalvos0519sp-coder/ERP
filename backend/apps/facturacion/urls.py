from rest_framework.routers import DefaultRouter

from .views import (
    ClienteViewSet,
    FacturaViewSet,
    PagoViewSet,
    ProductoServicioViewSet,
    ReportesViewSet,
    SerieViewSet,
)

router = DefaultRouter()
router.register(r"clientes", ClienteViewSet, basename="cliente")
router.register(r"productos", ProductoServicioViewSet, basename="producto")
router.register(r"series", SerieViewSet, basename="serie")
router.register(r"facturas", FacturaViewSet, basename="factura")
router.register(r"pagos", PagoViewSet, basename="pago")
router.register(r"reportes", ReportesViewSet, basename="reportes-fac")

urlpatterns = router.urls
