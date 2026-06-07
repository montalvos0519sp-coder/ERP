from rest_framework import serializers

from apps.carta_porte.models import Operador, Ubicacion
from apps.flota.models import Unidad
from .models import (
    CategoriaGastoViaje, Determinante, EvidenciaGastoViaje, GastoViaje,
    MercanciaViaje, ParadaViaje, TimbreViaje, Viaje,
)


def _direccion(u: Ubicacion) -> str:
    if not u:
        return ""
    partes = [u.calle, u.numero_exterior]
    linea = " ".join(p for p in partes if p).strip()
    extra = ", ".join(p for p in [u.colonia, u.municipio, u.estado] if p)
    cp = f"CP {u.codigo_postal}" if u.codigo_postal else ""
    return ", ".join(p for p in [linea, extra, cp] if p)


class DeterminanteSerializer(serializers.ModelSerializer):
    ubicacion_nombre = serializers.CharField(source="ubicacion.nombre", read_only=True)

    class Meta:
        model = Determinante
        fields = ["id", "empresa", "codigo", "nombre", "cliente", "ubicacion", "ubicacion_nombre", "activo", "creado"]
        read_only_fields = ["creado"]


class ParadaViajeSerializer(serializers.ModelSerializer):
    lugar_id = serializers.PrimaryKeyRelatedField(source="ubicacion", queryset=Ubicacion.objects.all())
    id_ubicacion = serializers.SerializerMethodField()
    destino = serializers.CharField(source="ubicacion.nombre", read_only=True)
    direccion = serializers.SerializerMethodField()
    codigo_postal = serializers.CharField(source="ubicacion.codigo_postal", read_only=True)
    rfc = serializers.CharField(source="ubicacion.rfc", read_only=True)
    calle = serializers.CharField(source="ubicacion.calle", read_only=True)
    numero_exterior = serializers.CharField(source="ubicacion.numero_exterior", read_only=True)
    colonia = serializers.CharField(source="ubicacion.colonia", read_only=True)
    municipio = serializers.CharField(source="ubicacion.municipio", read_only=True)
    estado = serializers.CharField(source="ubicacion.estado", read_only=True)
    determinante_codigo = serializers.CharField(source="determinante.codigo", read_only=True, default=None)

    class Meta:
        model = ParadaViaje
        fields = ["id", "orden", "lugar_id", "id_ubicacion", "destino", "direccion", "codigo_postal",
                  "rfc", "calle", "numero_exterior", "colonia", "municipio", "estado",
                  "fecha_hora", "kms", "observaciones", "determinante", "determinante_codigo"]

    def get_id_ubicacion(self, obj):
        total = getattr(obj, "_total_paradas", None)
        if total is None:
            total = obj.viaje.paradas.count()
        return obj.codigo_tramo(total)

    def get_direccion(self, obj):
        return _direccion(obj.ubicacion)


class MercanciaViajeSerializer(serializers.ModelSerializer):
    parada_origen_id = serializers.PrimaryKeyRelatedField(
        source="parada_origen", queryset=ParadaViaje.objects.all(), allow_null=True, required=False)
    parada_destino_id = serializers.PrimaryKeyRelatedField(
        source="parada_destino", queryset=ParadaViaje.objects.all(), allow_null=True, required=False)
    origen_codigo = serializers.SerializerMethodField()
    destino_codigo = serializers.SerializerMethodField()

    class Meta:
        model = MercanciaViaje
        fields = ["id", "parada_origen_id", "parada_destino_id", "origen_codigo", "destino_codigo",
                  "clave_producto", "descripcion", "cantidad", "peso_kg", "unidad_medida",
                  "material_peligroso", "clave_material_peligroso", "embalaje", "descripcion_embalaje", "notas"]

    def _codigo(self, parada):
        if not parada:
            return ""
        return parada.codigo_tramo(parada.viaje.paradas.count())

    def get_origen_codigo(self, obj):
        return self._codigo(obj.parada_origen)

    def get_destino_codigo(self, obj):
        return self._codigo(obj.parada_destino)


class TimbreViajeSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimbreViaje
        fields = ["id", "uuid", "estado", "fecha", "motivo_cancelacion"]


class CategoriaGastoViajeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoriaGastoViaje
        fields = ["id", "empresa", "nombre", "descripcion", "activo", "creado"]
        read_only_fields = ["creado"]
        extra_kwargs = {"empresa": {"required": False, "allow_null": True}}
        # La empresa la asigna la vista (sistema por empresa); sin validador unique_together
        # que vuelva a exigir el campo.
        validators = []


class EvidenciaGastoViajeSerializer(serializers.ModelSerializer):
    archivo_url = serializers.SerializerMethodField()
    es_imagen = serializers.SerializerMethodField()

    class Meta:
        model = EvidenciaGastoViaje
        fields = ["id", "nombre", "mime", "archivo_url", "es_imagen", "subido"]

    def get_archivo_url(self, o):
        return o.archivo.url if o.archivo else ""

    def get_es_imagen(self, o):
        return (o.mime or "").startswith("image/")


class GastoViajeSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(source="categoria.nombre", read_only=True, default=None)
    evidencias = EvidenciaGastoViajeSerializer(many=True, read_only=True)

    class Meta:
        model = GastoViaje
        fields = ["id", "viaje", "categoria", "categoria_nombre", "descripcion", "monto",
                  "fecha", "evidencias", "creado"]
        read_only_fields = ["creado"]


class ViajeSerializer(serializers.ModelSerializer):
    """Detalle completo, alineado con frontend/components/ViajeDetalle.tsx."""

    numero_viaje = serializers.SerializerMethodField()
    id_viaje = serializers.SerializerMethodField()
    fecha_viaje = serializers.DateTimeField(
        format="%Y-%m-%d", required=False, allow_null=True,
        input_formats=["%Y-%m-%d", "%Y-%m-%dT%H:%M", "%Y-%m-%dT%H:%M:%S", "iso-8601"])
    operador = serializers.CharField(source="operador.nombre", read_only=True, default="")
    operador_id = serializers.PrimaryKeyRelatedField(
        source="operador", queryset=Operador.objects.all(), allow_null=True, required=False)
    unidad = serializers.SerializerMethodField()
    unidad_id = serializers.PrimaryKeyRelatedField(
        source="unidad", queryset=Unidad.objects.all(), allow_null=True, required=False)
    origen = serializers.CharField(source="origen.nombre", read_only=True, default="")
    origen_id = serializers.PrimaryKeyRelatedField(
        source="origen", queryset=Ubicacion.objects.all(), allow_null=True, required=False)
    origen_codigo = serializers.SerializerMethodField()
    destino = serializers.CharField(source="destino.nombre", read_only=True, default="")
    destino_id = serializers.PrimaryKeyRelatedField(
        source="destino", queryset=Ubicacion.objects.all(), allow_null=True, required=False)
    destino_codigo = serializers.SerializerMethodField()
    kms_totales = serializers.SerializerMethodField()
    mismo_origen_destino = serializers.BooleanField(read_only=True)
    paradas = serializers.SerializerMethodField()
    mercancias = MercanciaViajeSerializer(many=True, read_only=True)
    operador_data = serializers.SerializerMethodField()
    unidad_data = serializers.SerializerMethodField()
    # Carta Porte
    carta_porte_estado = serializers.CharField(source="carta_porte.estado", read_only=True, default="BORRADOR")
    carta_porte_uuid = serializers.CharField(source="carta_porte.folio_fiscal", read_only=True, default="")
    timbres = TimbreViajeSerializer(many=True, read_only=True)
    # Gastos
    gastos = GastoViajeSerializer(many=True, read_only=True)
    total_gastos = serializers.SerializerMethodField()

    class Meta:
        model = Viaje
        fields = ["id", "numero_viaje", "id_viaje", "folio_carta", "folio_carga",
                  "fecha_viaje", "estado", "kms_totales", "sueldo_operador", "eco_remolque", "placa_remolque",
                  "mismo_origen_destino", "observaciones",
                  "operador", "operador_id", "unidad", "unidad_id",
                  "origen", "origen_id", "origen_codigo", "destino", "destino_id", "destino_codigo",
                  "paradas", "mercancias", "operador_data", "unidad_data",
                  "carta_porte_estado", "carta_porte_uuid", "timbres",
                  "gastos", "total_gastos"]

    def get_numero_viaje(self, obj):
        try:
            return int(obj.numero)
        except (ValueError, TypeError):
            return obj.numero

    def get_id_viaje(self, obj):
        return obj.folio_carta or obj.numero or str(obj.id)

    def get_unidad(self, obj):
        u = obj.unidad
        if not u:
            return ""
        return u.numero or f"{u.marca} {u.modelo}".strip()

    def _paradas_ordenadas(self, obj):
        return list(obj.paradas.select_related("ubicacion").all())

    def get_paradas(self, obj):
        paradas = self._paradas_ordenadas(obj)
        total = len(paradas)
        for p in paradas:
            p._total_paradas = total
        return ParadaViajeSerializer(paradas, many=True).data

    def get_origen_codigo(self, obj):
        paradas = self._paradas_ordenadas(obj)
        if paradas:
            return paradas[0].codigo_tramo(len(paradas))
        return ""

    def get_destino_codigo(self, obj):
        paradas = self._paradas_ordenadas(obj)
        if paradas:
            return paradas[-1].codigo_tramo(len(paradas))
        return ""

    def get_kms_totales(self, obj):
        return str(obj.kms_totales)

    def get_total_gastos(self, obj):
        return str(sum((g.monto or 0) for g in obj.gastos.all()))

    def get_operador_data(self, obj):
        o = obj.operador
        if not o:
            return None
        return {
            "rfc": o.rfc,
            "numero_licencia": o.licencia,
            "licencia_vencimiento": o.licencia_vencimiento.isoformat() if getattr(o, "licencia_vencimiento", None) else None,
            "licencia_fuente": "CartaPorte/Operador",
        }

    def get_unidad_data(self, obj):
        u = obj.unidad
        if not u:
            return None
        return {
            "internal_id": u.numero,
            "license_plate": u.placas,
            "make_model": f"{u.marca} {u.modelo}".strip(),
            "year": u.anio,
            "eco_remolque_1": u.remolque1_subtipo,
            "placa_remolque_1": u.remolque1_placa,
            "permiso_sct": u.permiso_sct,
            "no_permiso_sct": u.numero_permiso_sct,
            "nombre_aseguradora": u.aseguradora_resp_civil,
            "no_poliza_seguro": u.poliza_resp_civil,
        }


class ViajeListSerializer(serializers.ModelSerializer):
    """Listado (frontend/components/GestionViajes.tsx)."""

    id_viaje = serializers.SerializerMethodField()
    numero_viaje = serializers.SerializerMethodField()
    fecha_viaje = serializers.DateTimeField(format="%Y-%m-%d", read_only=True)
    operador = serializers.CharField(source="operador.nombre", read_only=True, default="")
    unidad = serializers.SerializerMethodField()
    origen = serializers.CharField(source="origen.nombre", read_only=True, default="")
    destino = serializers.CharField(source="destino.nombre", read_only=True, default="")
    kms_totales = serializers.SerializerMethodField()
    carta_porte_estado = serializers.CharField(source="carta_porte.estado", read_only=True, default="")

    class Meta:
        model = Viaje
        fields = ["id", "id_viaje", "numero_viaje", "folio_carta", "folio_carga", "fecha_viaje",
                  "operador", "unidad", "origen", "destino", "estado", "kms_totales", "carta_porte_estado"]

    def get_id_viaje(self, obj):
        return obj.folio_carta or obj.numero or str(obj.id)

    def get_numero_viaje(self, obj):
        try:
            return int(obj.numero)
        except (ValueError, TypeError):
            return obj.numero

    def get_unidad(self, obj):
        u = obj.unidad
        return (u.numero if u else "") or ""

    def get_kms_totales(self, obj):
        return str(obj.kms_totales)
