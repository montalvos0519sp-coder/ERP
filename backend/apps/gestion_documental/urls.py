from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("tipos", views.TipoDocumentoViewSet, basename="doc-tipo")
router.register("flujos", views.FlujoAprobacionViewSet, basename="doc-flujo")
router.register("documentos", views.DocumentoViewSet, basename="doc-documento")
router.register("propuestas", views.PropuestaMejoraViewSet, basename="doc-propuesta")
router.register("accesos", views.AccesoDocumentoViewSet, basename="doc-acceso")
router.register("solicitudes", views.SolicitudAprobacionViewSet, basename="doc-solicitud")
urlpatterns = router.urls
