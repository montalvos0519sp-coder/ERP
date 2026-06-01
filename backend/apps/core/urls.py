from rest_framework.routers import DefaultRouter

from .views import (
    CertificadoCSDViewSet,
    ConfiguracionEmpresaViewSet,
    EmpresaViewSet,
    SucursalViewSet,
    UsuarioEmpresaViewSet,
    UsuarioViewSet,
)

router = DefaultRouter()
router.register(r"empresas", EmpresaViewSet, basename="empresa")
router.register(r"sucursales", SucursalViewSet, basename="sucursal")
router.register(r"configuracion", ConfiguracionEmpresaViewSet, basename="configuracion")
router.register(r"certificados-csd", CertificadoCSDViewSet, basename="certificado-csd")
router.register(r"usuario-empresa", UsuarioEmpresaViewSet, basename="usuario-empresa")
router.register(r"usuarios", UsuarioViewSet, basename="usuario")

urlpatterns = router.urls
