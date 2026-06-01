"""Serializers profesionales del modulo Almacen."""
from __future__ import annotations

from rest_framework import serializers

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


# ---------------------------------------------------------------------------
# Catalogos
# ---------------------------------------------------------------------------


class CategoriaProductoSerializer(serializers.ModelSerializer):
    padre_nombre = serializers.CharField(source="padre.nombre", read_only=True)

    class Meta:
        model = CategoriaProducto
        fields = "__all__"


class MarcaProductoSerializer(serializers.ModelSerializer):
    class Meta:
        model = MarcaProducto
        fields = "__all__"


class UnidadMedidaSerializer(serializers.ModelSerializer):
    unidad_base_nombre = serializers.CharField(
        source="unidad_base.nombre", read_only=True,
    )

    class Meta:
        model = UnidadMedida
        fields = "__all__"


# ---------------------------------------------------------------------------
# Producto maestro
# ---------------------------------------------------------------------------


class ProductoSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(
        source="categoria.nombre", read_only=True, default=None,
    )
    marca_nombre = serializers.CharField(
        source="marca.nombre", read_only=True, default=None,
    )
    unidad_medida_nombre = serializers.CharField(
        source="unidad_medida.nombre", read_only=True,
    )
    unidad_medida_codigo = serializers.CharField(
        source="unidad_medida.codigo", read_only=True,
    )

    class Meta:
        model = Producto
        fields = "__all__"
        read_only_fields = (
            "creado_en", "actualizado_en", "creado_por", "actualizado_por",
        )


# ---------------------------------------------------------------------------
# Jerarquia de almacen
# ---------------------------------------------------------------------------


class AlmacenSerializer(serializers.ModelSerializer):
    sucursal_nombre = serializers.CharField(
        source="sucursal.nombre", read_only=True, default=None,
    )
    responsable_username = serializers.CharField(
        source="responsable.username", read_only=True, default=None,
    )

    class Meta:
        model = Almacen
        fields = "__all__"


class ZonaSerializer(serializers.ModelSerializer):
    almacen_nombre = serializers.CharField(source="almacen.nombre", read_only=True)

    class Meta:
        model = Zona
        fields = "__all__"


class RackSerializer(serializers.ModelSerializer):
    zona_codigo = serializers.CharField(source="zona.codigo", read_only=True)
    almacen_id = serializers.IntegerField(source="zona.almacen_id", read_only=True)

    class Meta:
        model = Rack
        fields = "__all__"


class NivelSerializer(serializers.ModelSerializer):
    rack_codigo = serializers.CharField(source="rack.codigo", read_only=True)

    class Meta:
        model = Nivel
        fields = "__all__"


class UbicacionSerializer(serializers.ModelSerializer):
    almacen_nombre = serializers.CharField(source="almacen.nombre", read_only=True)
    zona_codigo = serializers.CharField(
        source="zona.codigo", read_only=True, default=None,
    )
    rack_codigo = serializers.CharField(
        source="rack.codigo", read_only=True, default=None,
    )
    nivel_codigo = serializers.CharField(
        source="nivel.codigo", read_only=True, default=None,
    )

    class Meta:
        model = Ubicacion
        fields = "__all__"


# ---------------------------------------------------------------------------
# Trazabilidad
# ---------------------------------------------------------------------------


class LoteSerializer(serializers.ModelSerializer):
    producto_sku = serializers.CharField(source="producto.sku", read_only=True)
    producto_nombre = serializers.CharField(source="producto.nombre", read_only=True)
    proveedor_nombre = serializers.CharField(
        source="proveedor.nombre_comercial", read_only=True, default=None,
    )

    class Meta:
        model = Lote
        fields = "__all__"


class SerieSerializer(serializers.ModelSerializer):
    producto_sku = serializers.CharField(source="producto.sku", read_only=True)
    producto_nombre = serializers.CharField(source="producto.nombre", read_only=True)
    almacen_nombre = serializers.CharField(
        source="almacen_actual.nombre", read_only=True, default=None,
    )
    ubicacion_codigo = serializers.CharField(
        source="ubicacion_actual.codigo", read_only=True, default=None,
    )
    lote_numero = serializers.CharField(
        source="lote.numero_lote", read_only=True, default=None,
    )

    class Meta:
        model = Serie
        fields = "__all__"


# ---------------------------------------------------------------------------
# Existencias
# ---------------------------------------------------------------------------


class ExistenciaSerializer(serializers.ModelSerializer):
    producto_sku = serializers.CharField(source="producto.sku", read_only=True)
    producto_nombre = serializers.CharField(source="producto.nombre", read_only=True)
    almacen_codigo = serializers.CharField(source="almacen.codigo", read_only=True)
    almacen_nombre = serializers.CharField(source="almacen.nombre", read_only=True)
    ubicacion_codigo = serializers.CharField(
        source="ubicacion.codigo", read_only=True, default=None,
    )
    lote_numero = serializers.CharField(
        source="lote.numero_lote", read_only=True, default=None,
    )
    unidad_medida = serializers.CharField(
        source="producto.unidad_medida.codigo", read_only=True,
    )

    class Meta:
        model = Existencia
        fields = "__all__"


# ---------------------------------------------------------------------------
# Movimientos
# ---------------------------------------------------------------------------


class MovimientoDetalleSerializer(serializers.ModelSerializer):
    producto_sku = serializers.CharField(source="producto.sku", read_only=True)
    producto_nombre = serializers.CharField(source="producto.nombre", read_only=True)
    lote_numero = serializers.CharField(
        source="lote.numero_lote", read_only=True, default=None,
    )
    serie_numero = serializers.CharField(
        source="serie.numero_serie", read_only=True, default=None,
    )

    class Meta:
        model = MovimientoDetalle
        fields = "__all__"
        extra_kwargs = {
            "movimiento": {"required": False},
        }


class MovimientoSerializer(serializers.ModelSerializer):
    almacen_origen_nombre = serializers.CharField(
        source="almacen_origen.nombre", read_only=True, default=None,
    )
    almacen_destino_nombre = serializers.CharField(
        source="almacen_destino.nombre", read_only=True, default=None,
    )
    usuario_username = serializers.CharField(
        source="usuario.username", read_only=True, default=None,
    )
    detalles = MovimientoDetalleSerializer(many=True, required=False)
    total_lineas = serializers.SerializerMethodField()

    class Meta:
        model = Movimiento
        fields = "__all__"
        read_only_fields = (
            "creado_en", "actualizado_en",
            "aprobado_por", "aprobado_en",
            "cancelado_por", "cancelado_en",
        )

    def get_total_lineas(self, obj) -> int:
        return obj.detalles.count() if obj.pk else 0

    def create(self, validated_data):
        detalles_data = validated_data.pop("detalles", [])
        mov = Movimiento.objects.create(**validated_data)
        for orden, det in enumerate(detalles_data, start=1):
            det.pop("movimiento", None)
            MovimientoDetalle.objects.create(
                movimiento=mov,
                orden=det.pop("orden", orden),
                **det,
            )
        return mov

    def update(self, instance, validated_data):
        detalles_data = validated_data.pop("detalles", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        if detalles_data is not None and instance.estado == "BORRADOR":
            instance.detalles.all().delete()
            for orden, det in enumerate(detalles_data, start=1):
                det.pop("movimiento", None)
                MovimientoDetalle.objects.create(
                    movimiento=instance,
                    orden=det.pop("orden", orden),
                    **det,
                )
        return instance


# ---------------------------------------------------------------------------
# Kardex
# ---------------------------------------------------------------------------


class KardexSerializer(serializers.ModelSerializer):
    producto_sku = serializers.CharField(source="producto.sku", read_only=True)
    producto_nombre = serializers.CharField(source="producto.nombre", read_only=True)
    almacen_nombre = serializers.CharField(source="almacen.nombre", read_only=True)

    class Meta:
        model = Kardex
        fields = "__all__"


# ---------------------------------------------------------------------------
# Transferencias
# ---------------------------------------------------------------------------


class TransferenciaDetalleSerializer(serializers.ModelSerializer):
    producto_sku = serializers.CharField(source="producto.sku", read_only=True)
    producto_nombre = serializers.CharField(source="producto.nombre", read_only=True)
    lote_numero = serializers.CharField(
        source="lote.numero_lote", read_only=True, default=None,
    )

    class Meta:
        model = TransferenciaDetalle
        fields = "__all__"
        extra_kwargs = {
            "transferencia": {"required": False},
        }


class TransferenciaSerializer(serializers.ModelSerializer):
    almacen_origen_nombre = serializers.CharField(
        source="almacen_origen.nombre", read_only=True,
    )
    almacen_destino_nombre = serializers.CharField(
        source="almacen_destino.nombre", read_only=True,
    )
    detalles = TransferenciaDetalleSerializer(many=True, required=False)

    class Meta:
        model = Transferencia
        fields = "__all__"
        read_only_fields = (
            "creada_en", "actualizada_en",
            "movimiento_salida", "movimiento_entrada",
            "recibida_por", "fecha_recepcion",
        )

    def create(self, validated_data):
        detalles_data = validated_data.pop("detalles", [])
        tr = Transferencia.objects.create(**validated_data)
        for det in detalles_data:
            det.pop("transferencia", None)
            TransferenciaDetalle.objects.create(transferencia=tr, **det)
        return tr

    def update(self, instance, validated_data):
        detalles_data = validated_data.pop("detalles", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        if detalles_data is not None and instance.estado == "BORRADOR":
            instance.detalles.all().delete()
            for det in detalles_data:
                det.pop("transferencia", None)
                TransferenciaDetalle.objects.create(
                    transferencia=instance, **det,
                )
        return instance


# ---------------------------------------------------------------------------
# Alertas
# ---------------------------------------------------------------------------


class AlertaSerializer(serializers.ModelSerializer):
    producto_sku = serializers.CharField(source="producto.sku", read_only=True)
    producto_nombre = serializers.CharField(source="producto.nombre", read_only=True)
    almacen_nombre = serializers.CharField(
        source="almacen.nombre", read_only=True, default=None,
    )
    lote_numero = serializers.CharField(
        source="lote.numero_lote", read_only=True, default=None,
    )

    class Meta:
        model = Alerta
        fields = "__all__"
