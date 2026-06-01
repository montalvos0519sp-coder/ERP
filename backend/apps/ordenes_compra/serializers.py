from rest_framework import serializers
from .models import OrdenCompra, PartidaOC


class PartidaOCSerializer(serializers.ModelSerializer):
    class Meta: model = PartidaOC; fields = "__all__"; read_only_fields = ["orden"]


class OrdenCompraSerializer(serializers.ModelSerializer):
    partidas = PartidaOCSerializer(many=True, required=False)
    proveedor_nombre = serializers.CharField(source="proveedor.razon_social", read_only=True)
    unidad_numero = serializers.CharField(source="unidad.numero", read_only=True, default=None)
    termo_numero = serializers.CharField(source="termo.numero", read_only=True, default=None)
    tipo_mantenimiento_display = serializers.CharField(source="get_tipo_mantenimiento_display", read_only=True, default=None)
    class Meta:
        model = OrdenCompra; fields = "__all__"
        read_only_fields = ["creado_por"]

    def create(self, validated_data):
        partidas = validated_data.pop("partidas", [])
        orden = OrdenCompra.objects.create(**validated_data)
        for p in partidas: PartidaOC.objects.create(orden=orden, **p)
        return orden
