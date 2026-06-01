"""URLs de compatibilidad para componentes migrados.

Expone los endpoints que el frontend espera con paths del proyecto 3rrecycling:
  - /api/operadores/         (mapea a apps.carta_porte.Operador)
  - /api/cat/lugares/        (mapea a apps.carta_porte.Ubicacion)
  - /api/cat/unidades/       (mapea a apps.flota.Unidad)
  - /api/cat/empresas/       (mapea a apps.core.Empresa)
"""
from rest_framework.routers import DefaultRouter
from rest_framework import permissions

from apps.carta_porte.views import OperadorViewSet, UbicacionViewSet
from apps.flota.views import UnidadViewSet
from apps.core.views import EmpresaViewSet


router = DefaultRouter()
router.register(r"operadores", OperadorViewSet, basename="operador-compat")
router.register(r"cat/lugares", UbicacionViewSet, basename="cat-lugares")
router.register(r"cat/unidades", UnidadViewSet, basename="cat-unidades")
router.register(r"cat/empresas", EmpresaViewSet, basename="cat-empresas")

urlpatterns = router.urls
