from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    AsignacionModuloViewSet,
    MiMenuView,
    ModuloEmpresaViewSet,
    ModuloViewSet,
)

router = DefaultRouter()
router.register(r"modulos", ModuloViewSet, basename="modulo")
router.register(r"modulo-empresa", ModuloEmpresaViewSet, basename="modulo-empresa")
router.register(r"asignaciones", AsignacionModuloViewSet, basename="asignacion-modulo")

urlpatterns = router.urls + [
    path("mi-menu/", MiMenuView.as_view(), name="mi-menu"),
]
