from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    ConfigNotificacionRHViewSet, DepartamentoViewSet, EmpleadoViewSet,
    NotificacionViewSet, PrestamoViewSet, PuestoViewSet, RHDashboardView,
    SolicitudRHViewSet, TipoSolicitudRHViewSet, VacacionViewSet,
)

router = DefaultRouter()
router.register(r"departamentos", DepartamentoViewSet, basename="departamento")
router.register(r"puestos", PuestoViewSet, basename="puesto")
router.register(r"empleados", EmpleadoViewSet, basename="empleado")
router.register(r"vacaciones", VacacionViewSet, basename="vacacion")
router.register(r"prestamos", PrestamoViewSet, basename="prestamo")
router.register(r"tipos-solicitud", TipoSolicitudRHViewSet, basename="tipo-solicitud-rh")
router.register(r"solicitudes", SolicitudRHViewSet, basename="solicitud-rh")
router.register(r"notificaciones", NotificacionViewSet, basename="notificacion")
router.register(r"config-notif", ConfigNotificacionRHViewSet, basename="config-notif-rh")

urlpatterns = router.urls + [
    path("dashboard/", RHDashboardView.as_view(), name="rh-dashboard"),
]
