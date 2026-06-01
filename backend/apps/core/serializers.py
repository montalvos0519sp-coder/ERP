"""Serializers de core."""
from __future__ import annotations

from django.contrib.auth.models import User
from rest_framework import serializers

from .models import (
    CertificadoCSD,
    ConfiguracionEmpresa,
    Empresa,
    PerfilUsuario,
    Sucursal,
    UsuarioEmpresa,
)


class SucursalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sucursal
        fields = ["id", "empresa", "codigo", "nombre", "direccion", "cp", "activa"]


class EmpresaSerializer(serializers.ModelSerializer):
    sucursales = SucursalSerializer(many=True, read_only=True)
    # Alias 'nombre' = nombre_comercial para que componentes que esperan
    # ese campo (migrados o externos) lo encuentren.
    nombre = serializers.CharField(source="nombre_comercial", read_only=True)

    class Meta:
        model = Empresa
        fields = [
            "id", "nombre", "nombre_comercial", "razon_social", "rfc", "regimen_fiscal",
            "cp_fiscal", "direccion", "telefono", "email", "logo",
            "color_primario", "color_secundario", "activa",
            "sucursales", "creada", "actualizada",
        ]
        read_only_fields = ["creada", "actualizada"]


class ConfiguracionEmpresaSerializer(serializers.ModelSerializer):
    # Indica si ya hay un Secret Key guardado, sin exponer su valor.
    pac_secret_key_set = serializers.SerializerMethodField()

    class Meta:
        model = ConfiguracionEmpresa
        fields = "__all__"
        extra_kwargs = {
            "pac_secret_key": {"write_only": True, "required": False, "allow_blank": True},
            "pac_api_key": {"write_only": False},
        }

    def get_pac_secret_key_set(self, obj) -> bool:
        return bool(obj.pac_secret_key)

    def update(self, instance, validated_data):
        # No borrar el Secret Key si llega vacio: conservar el existente.
        # (El front lo deja vacio cuando el usuario no quiere cambiarlo.)
        if not validated_data.get("pac_secret_key"):
            validated_data.pop("pac_secret_key", None)
        return super().update(instance, validated_data)


class PerfilUsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = PerfilUsuario
        fields = [
            "telefono", "puesto", "avatar",
            "empresa_activa", "sucursal_activa",
            "tema", "fuente", "color_acento",
        ]


class UserSerializer(serializers.ModelSerializer):
    perfil = PerfilUsuarioSerializer(read_only=True)
    is_superuser = serializers.BooleanField(read_only=True)
    empresas = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "is_active", "is_staff", "is_superuser",
            "date_joined", "perfil", "empresas",
        ]
        read_only_fields = ["date_joined", "is_superuser"]

    def get_empresas(self, obj):
        qs = obj.empresas.select_related("empresa").filter(activo=True)
        request = self.context.get("request")
        out = []
        for ue in qs:
            logo_url = None
            if ue.empresa.logo:
                try:
                    logo_url = (
                        request.build_absolute_uri(ue.empresa.logo.url)
                        if request else ue.empresa.logo.url
                    )
                except Exception:
                    logo_url = None
            out.append({
                "id": ue.empresa_id,
                "nombre": ue.empresa.nombre_comercial,
                "rfc": ue.empresa.rfc,
                "rol": ue.rol,
                "es_staff": ue.es_staff,
                "color_primario": ue.empresa.color_primario,
                "color_secundario": ue.empresa.color_secundario,
                "logo_url": logo_url,
            })
        return out


class UsuarioEmpresaSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source="user.username", read_only=True)
    empresa_nombre = serializers.CharField(source="empresa.nombre_comercial", read_only=True)

    class Meta:
        model = UsuarioEmpresa
        fields = [
            "id", "user", "user_username", "empresa", "empresa_nombre",
            "rol", "sucursales", "activo", "creado",
        ]
        read_only_fields = ["creado"]


class CertificadoCSDSerializer(serializers.ModelSerializer):
    class Meta:
        model = CertificadoCSD
        fields = "__all__"
        extra_kwargs = {"password_csd": {"write_only": True}}


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


class CrearUsuarioSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ["username", "email", "first_name", "last_name", "password", "is_staff"]

    def create(self, validated_data: dict):
        pwd = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(pwd)
        user.save()
        return user
