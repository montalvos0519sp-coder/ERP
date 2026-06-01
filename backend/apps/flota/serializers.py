from rest_framework import serializers

from .models import CargaCombustible, Termo, Unidad


class TermoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Termo
        fields = "__all__"
        read_only_fields = ["creado"]


class UnidadSerializer(serializers.ModelSerializer):
    cp_ready = serializers.BooleanField(read_only=True)
    cp_campos_faltantes = serializers.ListField(read_only=True)
    empresa_nombre = serializers.CharField(source="empresa.nombre_comercial", read_only=True)
    termo_detalle = TermoSerializer(source="termo", read_only=True)

    class Meta:
        model = Unidad
        fields = "__all__"
        read_only_fields = ["creado", "actualizado", "cp_ready", "cp_campos_faltantes"]


class CargaCombustibleSerializer(serializers.ModelSerializer):
    unidad_numero = serializers.CharField(source="unidad.numero", read_only=True)
    unidad_placas = serializers.CharField(source="unidad.placas", read_only=True)

    class Meta:
        model = CargaCombustible
        fields = "__all__"
