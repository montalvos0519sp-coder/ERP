from rest_framework import serializers
from .models import Viaje


class ViajeSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source="cliente.razon_social", read_only=True)

    class Meta:
        model = Viaje
        fields = "__all__"
        read_only_fields = ["creado", "creado_por"]
