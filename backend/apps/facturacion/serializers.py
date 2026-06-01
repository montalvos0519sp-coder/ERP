from rest_framework import serializers

from .models import Cliente, ConceptoFactura, Factura, Pago, ProductoServicio, Serie, DoctoRelacionado


class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = "__all__"


class ProductoServicioSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductoServicio
        fields = "__all__"


class SerieSerializer(serializers.ModelSerializer):
    class Meta:
        model = Serie
        fields = "__all__"


class ConceptoFacturaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConceptoFactura
        fields = "__all__"
        read_only_fields = ["factura"]


class FacturaSerializer(serializers.ModelSerializer):
    conceptos = ConceptoFacturaSerializer(many=True, required=False)
    cliente_data = ClienteSerializer(source="cliente", read_only=True)
    serie_letra = serializers.CharField(source="serie.letra", read_only=True)
    relacionada_folio = serializers.SerializerMethodField()

    class Meta:
        model = Factura
        fields = "__all__"
        read_only_fields = ["folio", "estado", "folio_fiscal", "fecha_timbrado",
                            "xml", "pdf", "log_pac"]

    def get_relacionada_folio(self, obj):
        r = obj.factura_relacionada
        return f"{r.serie.letra}{r.folio}" if r else None

    def create(self, validated_data: dict) -> Factura:
        conceptos = validated_data.pop("conceptos", [])
        factura = Factura.objects.create(**validated_data)
        for c in conceptos:
            ConceptoFactura.objects.create(factura=factura, **c)
        factura.recalcular_totales()
        return factura

    def update(self, instance: Factura, validated_data: dict) -> Factura:
        conceptos = validated_data.pop("conceptos", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        if conceptos is not None:
            instance.conceptos.all().delete()
            for c in conceptos:
                ConceptoFactura.objects.create(factura=instance, **c)
            instance.recalcular_totales()
        return instance


class DoctoRelacionadoSerializer(serializers.ModelSerializer):
    factura_folio = serializers.SerializerMethodField()
    factura_uuid = serializers.CharField(source="factura.folio_fiscal", read_only=True, default="")

    class Meta:
        model = DoctoRelacionado
        fields = "__all__"
        read_only_fields = ["pago"]

    def get_factura_folio(self, obj):
        return f"{obj.factura.serie.letra}{obj.factura.folio}" if obj.factura else None


class PagoSerializer(serializers.ModelSerializer):
    documentos = DoctoRelacionadoSerializer(many=True, required=False)
    serie_letra = serializers.CharField(source="serie.letra", read_only=True)

    class Meta:
        model = Pago
        fields = "__all__"
        read_only_fields = ["folio", "estado", "folio_fiscal", "xml", "pdf", "log_pac"]

    def create(self, validated_data: dict) -> Pago:
        documentos = validated_data.pop("documentos", [])
        pago = Pago.objects.create(**validated_data)
        for d in documentos:
            DoctoRelacionado.objects.create(pago=pago, **d)
        return pago
