from rest_framework import serializers

from .models import ConceptoLiquidacion, LiquidacionOperador


class ConceptoLiquidacionSerializer(serializers.ModelSerializer):
    viaje_folio = serializers.SerializerMethodField()
    viaje_id = serializers.SerializerMethodField()

    class Meta:
        model = ConceptoLiquidacion
        fields = ["id", "tipo", "descripcion", "monto", "viaje", "viaje_id", "viaje_folio"]
        read_only_fields = ["viaje_folio", "viaje_id"]

    def get_viaje_id(self, obj):
        return obj.viaje_id

    def get_viaje_folio(self, obj):
        if not obj.viaje_id:
            return ""
        return (
            getattr(obj.viaje, "folio_carga", None)
            or getattr(obj.viaje, "id_viaje", None)
            or f"#{obj.viaje_id}"
        )


class LiquidacionOperadorSerializer(serializers.ModelSerializer):
    operador_id = serializers.IntegerField(source="operador.id", read_only=True)
    operador = serializers.CharField(source="operador.nombre", read_only=True)
    estado_display = serializers.CharField(source="get_estado_display", read_only=True)
    conceptos_count = serializers.SerializerMethodField()
    conceptos = ConceptoLiquidacionSerializer(many=True, read_only=True)
    operador_data = serializers.SerializerMethodField()

    class Meta:
        model = LiquidacionOperador
        fields = [
            "id", "folio", "empresa", "operador_id", "operador",
            "fecha_inicio", "fecha_fin", "estado", "estado_display",
            "fecha_pago", "observaciones", "creado_en",
            "total_viajes", "total_extras", "total_descuentos", "total_pagar",
            "conceptos_count", "conceptos", "operador_data",
        ]
        read_only_fields = [
            "folio", "total_viajes", "total_extras", "total_descuentos",
            "total_pagar", "creado_en",
        ]

    def get_conceptos_count(self, obj):
        return obj.conceptos.count()

    def get_operador_data(self, obj):
        op = obj.operador
        return {
            "rfc": getattr(op, "rfc", "") or "",
            "numero_licencia": getattr(op, "numero_licencia", "") or "",
        }
