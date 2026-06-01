from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    EstadisticasCatalogosSAT,
    SatClaveProdServCPViewSet,
    SatClaveProdServViewSet,
    SatClaveUnidadViewSet,
    SatCodigoPostalViewSet,
    SatColoniaViewSet,
    SatConfigVehicularViewSet,
    SatEstadoViewSet,
    SatFormaPagoViewSet,
    SatMetodoPagoViewSet,
    SatMonedaViewSet,
    SatMunicipioViewSet,
    SatRegimenFiscalViewSet,
    SatSubTipoRemViewSet,
    SatTipoFiguraViewSet,
    SatTipoPermisoViewSet,
    SatUsoCFDIViewSet,
    UploadCatalogoSAT,
)

router = DefaultRouter()
router.register(r"clave-prod-serv", SatClaveProdServViewSet)
router.register(r"clave-prod-serv-cp", SatClaveProdServCPViewSet)
router.register(r"clave-unidad", SatClaveUnidadViewSet)
router.register(r"estados", SatEstadoViewSet)
router.register(r"municipios", SatMunicipioViewSet)
router.register(r"codigos-postales", SatCodigoPostalViewSet)
router.register(r"colonias", SatColoniaViewSet)
router.register(r"regimen-fiscal", SatRegimenFiscalViewSet)
router.register(r"uso-cfdi", SatUsoCFDIViewSet)
router.register(r"forma-pago", SatFormaPagoViewSet)
router.register(r"metodo-pago", SatMetodoPagoViewSet)
router.register(r"moneda", SatMonedaViewSet)
router.register(r"tipo-figura", SatTipoFiguraViewSet)
router.register(r"tipo-permiso", SatTipoPermisoViewSet)
router.register(r"config-vehicular", SatConfigVehicularViewSet)
router.register(r"subtipo-rem", SatSubTipoRemViewSet)

urlpatterns = router.urls + [
    path("upload/", UploadCatalogoSAT.as_view(), name="catalogos-sat-upload"),
    path("estadisticas/", EstadisticasCatalogosSAT.as_view(), name="catalogos-sat-stats"),
]
