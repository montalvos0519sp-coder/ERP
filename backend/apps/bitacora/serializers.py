from rest_framework import serializers

from .models import EventoBitacora


class EventoBitacoraSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source="user.username", read_only=True)
    empresa_nombre = serializers.CharField(source="empresa.nombre_comercial", read_only=True, default="")

    class Meta:
        model = EventoBitacora
        fields = [
            "id", "fecha", "user", "user_username", "empresa", "empresa_nombre",
            "nivel", "accion", "descripcion", "ip", "metodo", "ruta", "meta",
        ]
