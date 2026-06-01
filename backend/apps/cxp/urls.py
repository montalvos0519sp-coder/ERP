from rest_framework.routers import DefaultRouter
from .views import FacturaProveedorViewSet, PagoProveedorViewSet, ProveedorViewSet

router = DefaultRouter()
router.register(r"proveedores", ProveedorViewSet, basename="proveedor")
router.register(r"facturas", FacturaProveedorViewSet, basename="factura-proveedor")
router.register(r"pagos", PagoProveedorViewSet, basename="pago-proveedor")
urlpatterns = router.urls
