"""Rutas REST del modulo Almacen."""
from __future__ import annotations

from rest_framework.routers import DefaultRouter

from .views import (
    AlertaViewSet,
    AlmacenViewSet,
    CategoriaProductoViewSet,
    DashboardAlmacenViewSet,
    ExistenciaViewSet,
    KardexViewSet,
    LoteViewSet,
    MarcaProductoViewSet,
    MovimientoDetalleViewSet,
    MovimientoViewSet,
    NivelViewSet,
    ProductoViewSet,
    RackViewSet,
    ReporteAlmacenViewSet,
    SerieViewSet,
    TransferenciaViewSet,
    UbicacionViewSet,
    UnidadMedidaViewSet,
    ZonaViewSet,
)


router = DefaultRouter()
router.register(r"categorias", CategoriaProductoViewSet, basename="almacen-categoria")
router.register(r"marcas", MarcaProductoViewSet, basename="almacen-marca")
router.register(r"unidades-medida", UnidadMedidaViewSet, basename="almacen-unidad-medida")
router.register(r"productos", ProductoViewSet, basename="almacen-producto")
router.register(r"almacenes", AlmacenViewSet, basename="almacen-almacen")
router.register(r"zonas", ZonaViewSet, basename="almacen-zona")
router.register(r"racks", RackViewSet, basename="almacen-rack")
router.register(r"niveles", NivelViewSet, basename="almacen-nivel")
router.register(r"ubicaciones", UbicacionViewSet, basename="almacen-ubicacion")
router.register(r"lotes", LoteViewSet, basename="almacen-lote")
router.register(r"series", SerieViewSet, basename="almacen-serie")
router.register(r"existencias", ExistenciaViewSet, basename="almacen-existencia")
router.register(r"movimientos", MovimientoViewSet, basename="almacen-movimiento")
router.register(r"movimiento-detalles", MovimientoDetalleViewSet, basename="almacen-mov-detalle")
router.register(r"transferencias", TransferenciaViewSet, basename="almacen-transferencia")
router.register(r"kardex", KardexViewSet, basename="almacen-kardex")
router.register(r"alertas", AlertaViewSet, basename="almacen-alerta")
router.register(r"reportes", ReporteAlmacenViewSet, basename="almacen-reportes")
router.register(r"dashboard", DashboardAlmacenViewSet, basename="almacen-dashboard")

urlpatterns = router.urls
