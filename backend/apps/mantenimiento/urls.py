from rest_framework.routers import DefaultRouter
from .views import (
    EjecucionProcesoViewSet, FlujoChecklistViewSet, OrdenMantenimientoViewSet,
    PreventivoViewSet, ProcesoViewSet, RefaccionUsadaViewSet, RespuestaChecklistViewSet,
)

router = DefaultRouter()
router.register(r"ordenes", OrdenMantenimientoViewSet, basename="orden-mantto")
router.register(r"refacciones", RefaccionUsadaViewSet, basename="refaccion-usada")
router.register(r"flujos", FlujoChecklistViewSet, basename="flujo-checklist")
router.register(r"respuestas", RespuestaChecklistViewSet, basename="respuesta-checklist")
router.register(r"procesos", ProcesoViewSet, basename="proceso")
router.register(r"ejecuciones", EjecucionProcesoViewSet, basename="ejecucion-proceso")
router.register(r"preventivo", PreventivoViewSet, basename="preventivo")
urlpatterns = router.urls
