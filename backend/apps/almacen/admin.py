"""Admin para el modulo Almacen."""
from __future__ import annotations

from django.contrib import admin

from .models import (
    Alerta,
    Almacen,
    CategoriaProducto,
    Existencia,
    Kardex,
    Lote,
    MarcaProducto,
    Movimiento,
    MovimientoDetalle,
    Nivel,
    Producto,
    Rack,
    Serie,
    Transferencia,
    TransferenciaDetalle,
    Ubicacion,
    UnidadMedida,
    Zona,
)


@admin.register(CategoriaProducto)
class CategoriaProductoAdmin(admin.ModelAdmin):
    list_display = ("codigo", "nombre", "padre", "empresa", "activo")
    list_filter = ("empresa", "activo")
    search_fields = ("codigo", "nombre")


@admin.register(MarcaProducto)
class MarcaProductoAdmin(admin.ModelAdmin):
    list_display = ("codigo", "nombre", "empresa", "activo")
    list_filter = ("empresa", "activo")
    search_fields = ("codigo", "nombre")


@admin.register(UnidadMedida)
class UnidadMedidaAdmin(admin.ModelAdmin):
    list_display = ("codigo", "nombre", "abreviatura", "tipo", "empresa", "activo")
    list_filter = ("empresa", "tipo", "activo")
    search_fields = ("codigo", "nombre")


@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = (
        "sku", "codigo_interno", "nombre", "categoria", "marca",
        "unidad_medida", "tipo", "costo_promedio", "precio_venta", "activo",
    )
    list_filter = ("empresa", "tipo", "categoria", "marca", "activo")
    search_fields = ("sku", "codigo_interno", "codigo_barras", "nombre")
    autocomplete_fields = ("categoria", "marca", "unidad_medida")


@admin.register(Almacen)
class AlmacenAdmin(admin.ModelAdmin):
    list_display = ("codigo", "nombre", "tipo", "sucursal", "empresa", "activo")
    list_filter = ("empresa", "tipo", "activo")
    search_fields = ("codigo", "nombre")


class ZonaInline(admin.TabularInline):
    model = Zona
    extra = 0


@admin.register(Zona)
class ZonaAdmin(admin.ModelAdmin):
    list_display = ("codigo", "nombre", "almacen", "tipo", "activo")
    list_filter = ("almacen", "tipo", "activo")
    search_fields = ("codigo", "nombre")


@admin.register(Rack)
class RackAdmin(admin.ModelAdmin):
    list_display = ("codigo", "nombre", "zona", "activo")
    list_filter = ("zona", "activo")
    search_fields = ("codigo", "nombre")


@admin.register(Nivel)
class NivelAdmin(admin.ModelAdmin):
    list_display = ("codigo", "rack", "altura", "capacidad_kg", "activo")
    list_filter = ("rack", "activo")
    search_fields = ("codigo",)


@admin.register(Ubicacion)
class UbicacionAdmin(admin.ModelAdmin):
    list_display = (
        "codigo", "almacen", "zona", "rack", "nivel", "tipo",
        "activa", "bloqueada",
    )
    list_filter = ("almacen", "tipo", "activa", "bloqueada")
    search_fields = ("codigo", "nombre")


@admin.register(Lote)
class LoteAdmin(admin.ModelAdmin):
    list_display = (
        "numero_lote", "producto", "fecha_fabricacion", "fecha_caducidad",
        "cantidad_inicial", "activo",
    )
    list_filter = ("empresa", "activo")
    search_fields = ("numero_lote", "producto__sku")


@admin.register(Serie)
class SerieAdmin(admin.ModelAdmin):
    list_display = (
        "numero_serie", "producto", "estado", "almacen_actual",
        "ubicacion_actual",
    )
    list_filter = ("estado", "almacen_actual")
    search_fields = ("numero_serie", "producto__sku")


@admin.register(Existencia)
class ExistenciaAdmin(admin.ModelAdmin):
    list_display = (
        "producto", "almacen", "ubicacion", "lote",
        "cantidad", "disponible", "comprometido", "actualizado",
    )
    list_filter = ("almacen", "producto")
    search_fields = ("producto__sku", "producto__nombre")


class MovimientoDetalleInline(admin.TabularInline):
    model = MovimientoDetalle
    extra = 0
    autocomplete_fields = ("producto", "lote", "serie")


@admin.register(Movimiento)
class MovimientoAdmin(admin.ModelAdmin):
    list_display = (
        "folio", "tipo", "subtipo", "estado", "fecha",
        "almacen_origen", "almacen_destino", "empresa",
    )
    list_filter = ("empresa", "tipo", "subtipo", "estado")
    search_fields = ("folio", "referencia")
    inlines = [MovimientoDetalleInline]


@admin.register(MovimientoDetalle)
class MovimientoDetalleAdmin(admin.ModelAdmin):
    list_display = ("movimiento", "producto", "cantidad", "costo_unitario", "orden")
    search_fields = ("movimiento__folio", "producto__sku")


@admin.register(Kardex)
class KardexAdmin(admin.ModelAdmin):
    list_display = (
        "fecha", "folio", "tipo", "producto", "almacen",
        "cantidad_entrada", "cantidad_salida", "saldo_cantidad",
        "saldo_costo_promedio",
    )
    list_filter = ("empresa", "tipo", "almacen")
    search_fields = ("folio", "producto__sku")


class TransferenciaDetalleInline(admin.TabularInline):
    model = TransferenciaDetalle
    extra = 0


@admin.register(Transferencia)
class TransferenciaAdmin(admin.ModelAdmin):
    list_display = (
        "folio", "almacen_origen", "almacen_destino",
        "estado", "fecha_envio", "fecha_recepcion", "empresa",
    )
    list_filter = ("empresa", "estado")
    search_fields = ("folio", "guia", "transportista")
    inlines = [TransferenciaDetalleInline]


@admin.register(TransferenciaDetalle)
class TransferenciaDetalleAdmin(admin.ModelAdmin):
    list_display = (
        "transferencia", "producto", "cantidad_enviada", "cantidad_recibida",
    )
    search_fields = ("transferencia__folio", "producto__sku")


@admin.register(Alerta)
class AlertaAdmin(admin.ModelAdmin):
    list_display = (
        "tipo", "producto", "almacen", "nivel", "creada",
        "atendida", "atendida_en",
    )
    list_filter = ("empresa", "tipo", "nivel", "atendida")
    search_fields = ("mensaje", "producto__sku")
