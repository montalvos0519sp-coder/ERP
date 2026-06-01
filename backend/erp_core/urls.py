"""URLs raiz del ERP. Cada modulo registra sus propias rutas bajo /api/<modulo>/.

Adicionalmente expone aliases compatibles con el patron de URLs del proyecto
3rrecycling, para que los componentes migrados funcionen sin modificacion:
    /rh/api/...    -> alias de /api/rh/...
    /api/operadores/, /api/cat/... -> wrappers para ViajeForm
"""
from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.core.urls_auth")),
    path("api/core/", include("apps.core.urls")),
    path("api/modulos/", include("apps.modulos.urls")),
    path("api/catalogos-sat/", include("apps.catalogos_sat.urls")),
    path("api/facturacion/", include("apps.facturacion.urls")),
    path("api/carta-porte/", include("apps.carta_porte.urls")),
    path("api/viajes/", include("apps.viajes.urls")),
    path("api/flota/", include("apps.flota.urls")),
    path("api/rh/", include("apps.rh.urls")),
    path("api/almacen/", include("apps.almacen.urls")),
    path("api/cxp/", include("apps.cxp.urls")),
    path("api/ordenes-compra/", include("apps.ordenes_compra.urls")),
    path("api/mantenimiento/", include("apps.mantenimiento.urls")),
    path("api/liquidaciones/", include("apps.liquidaciones.urls")),
    path("api/bitacora/", include("apps.bitacora.urls")),
    path("api/nomina/", include("apps.nomina.urls")),
    path("api/chat/", include("apps.chat.urls")),
    path("api/diagramas/", include("apps.diagramas.urls")),
    path("api/documentos/", include("apps.gestion_documental.urls")),
    path("api/sgc/", include("apps.sgc.urls")),

    # Aliases para compatibilidad con componentes migrados del proyecto 3rrecycling.
    path("rh/api/", include("apps.rh.urls")),
    path("api/", include("apps.core.urls_compat")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
