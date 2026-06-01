from rest_framework import serializers
from .models import (
    ConfigNotificacionRH, Departamento, Empleado, Notificacion, Prestamo,
    Puesto, SolicitudRH, TipoSolicitudRH, Vacacion,
)


class DepartamentoSerializer(serializers.ModelSerializer):
    class Meta: model = Departamento; fields = "__all__"


class PuestoSerializer(serializers.ModelSerializer):
    class Meta: model = Puesto; fields = "__all__"


class EmpleadoSerializer(serializers.ModelSerializer):
    """Soporta los nombres de campo usados por el form del frontend
    (heredado de 3rrecycling): `puesto_id`, `departamento_id`, `apellido`.
    """
    puesto_nombre = serializers.CharField(source="puesto.nombre", read_only=True)
    departamento_nombre = serializers.CharField(source="puesto.departamento.nombre", read_only=True)
    # Aliases legibles para el frontend que envia/lee con sufijo _id.
    puesto_id = serializers.PrimaryKeyRelatedField(
        source="puesto", queryset=Puesto.objects.all(), required=False, allow_null=True,
    )
    departamento_id = serializers.SerializerMethodField()

    class Meta:
        model = Empleado
        fields = "__all__"

    def get_departamento_id(self, obj):
        if obj.puesto_id and obj.puesto.departamento_id:
            return obj.puesto.departamento_id
        return None

    def to_internal_value(self, data):
        # FormData manda `puesto_id` como string vacio cuando no hay seleccion;
        # convertimos "" a null para evitar errores de FK.
        if hasattr(data, "_mutable"):
            data._mutable = True  # type: ignore[attr-defined]
        if isinstance(data, dict) or hasattr(data, "get"):
            for k in ("puesto_id", "puesto", "supervisor_id", "sucursal"):
                if data.get(k) in ("", "null", "undefined"):
                    try:
                        del data[k]  # type: ignore[union-attr]
                    except (KeyError, TypeError):
                        pass
        return super().to_internal_value(data)


class VacacionSerializer(serializers.ModelSerializer):
    class Meta: model = Vacacion; fields = "__all__"


class PrestamoSerializer(serializers.ModelSerializer):
    class Meta: model = Prestamo; fields = "__all__"


class TipoSolicitudRHSerializer(serializers.ModelSerializer):
    class Meta: model = TipoSolicitudRH; fields = "__all__"; read_only_fields = ["creado"]


class NotificacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notificacion
        fields = "__all__"
        read_only_fields = ["user", "creado", "leida_en"]


class ConfigNotificacionRHSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source="user.username", read_only=True)
    user_first_name = serializers.CharField(source="user.first_name", read_only=True)
    user_last_name = serializers.CharField(source="user.last_name", read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)
    user_is_staff = serializers.BooleanField(source="user.is_staff", read_only=True)

    class Meta:
        model = ConfigNotificacionRH
        fields = "__all__"
        read_only_fields = ["creado"]


class SolicitudRHSerializer(serializers.ModelSerializer):
    tipo_nombre = serializers.CharField(source="tipo.nombre", read_only=True)
    tipo_categoria = serializers.CharField(source="tipo.categoria", read_only=True)
    tipo_color = serializers.CharField(source="tipo.color", read_only=True)
    empleado_nombre = serializers.CharField(source="empleado.nombre", read_only=True)
    empleado_numero = serializers.CharField(source="empleado.numero_empleado", read_only=True)
    solicitado_por_username = serializers.CharField(source="solicitado_por.username", read_only=True)
    aprobado_por_username = serializers.CharField(source="aprobado_por.username", read_only=True)

    class Meta:
        model = SolicitudRH
        fields = "__all__"
        read_only_fields = [
            "fecha_solicitud", "solicitado_por", "aprobado_por", "fecha_aprobacion",
        ]
