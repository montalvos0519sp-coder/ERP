from __future__ import annotations

from rest_framework import serializers

from .models import AccionModulo, AsignacionModulo, Modulo, ModuloEmpresa


class AccionModuloSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccionModulo
        fields = ["id", "codigo", "descripcion"]


class ModuloSerializer(serializers.ModelSerializer):
    acciones = AccionModuloSerializer(many=True, read_only=True)

    class Meta:
        model = Modulo
        fields = [
            "id", "codigo", "nombre", "descripcion", "categoria", "color",
            "icono", "ruta_frontend", "orden", "requiere_staff",
            "requiere_carta_porte", "es_core", "activo_globalmente", "acciones",
        ]


class ModuloEmpresaSerializer(serializers.ModelSerializer):
    modulo_data = ModuloSerializer(source="modulo", read_only=True)

    class Meta:
        model = ModuloEmpresa
        fields = ["id", "empresa", "modulo", "modulo_data", "activo", "config", "actualizado"]
        read_only_fields = ["actualizado"]


class AsignacionModuloSerializer(serializers.ModelSerializer):
    modulo_data = ModuloSerializer(source="modulo", read_only=True)
    user_username = serializers.CharField(source="user.username", read_only=True)
    user_nombre = serializers.SerializerMethodField()

    class Meta:
        model = AsignacionModulo
        fields = [
            "id", "user", "user_username", "user_nombre", "empresa",
            "modulo", "modulo_data", "acciones", "activo", "creado",
        ]
        read_only_fields = ["creado"]

    def get_user_nombre(self, obj) -> str:
        u = obj.user
        full = f"{u.first_name} {u.last_name}".strip()
        return full or u.username


class MiMenuSerializer(serializers.Serializer):
    """Estructura que consume el sidebar del frontend."""

    empresa_id = serializers.IntegerField()
    secciones = serializers.ListField()
