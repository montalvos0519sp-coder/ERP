from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    CampoChecklist, EjecucionProceso, EtapaEjecucion, EtapaProceso,
    FlujoChecklist, OrdenMantenimiento, Proceso, RefaccionUsada,
    RespuestaChecklist, ValorCampo,
)

User = get_user_model()


def _tecnicos_detalle(qs):
    return [
        {"id": u.id, "username": u.username,
         "nombre": f"{u.first_name} {u.last_name}".strip() or u.username}
        for u in qs.all()
    ]


class RefaccionUsadaSerializer(serializers.ModelSerializer):
    class Meta: model = RefaccionUsada; fields = "__all__"; read_only_fields = ["orden"]


class OrdenMantenimientoSerializer(serializers.ModelSerializer):
    refacciones = RefaccionUsadaSerializer(many=True, required=False)
    class Meta: model = OrdenMantenimiento; fields = "__all__"

    def create(self, validated_data):
        refacciones = validated_data.pop("refacciones", [])
        orden = OrdenMantenimiento.objects.create(**validated_data)
        for r in refacciones: RefaccionUsada.objects.create(orden=orden, **r)
        return orden


# ── Constructor de checklists / flujos ──────────────────────────────────────────
class CampoChecklistSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampoChecklist
        fields = ["id", "clave", "seccion", "etiqueta", "tipo", "obligatorio", "orden",
                  "ayuda", "opciones", "min_valor", "max_valor",
                  "depende_de", "mostrar_si", "foto_aplica", "foto_obligatoria"]


class FlujoChecklistSerializer(serializers.ModelSerializer):
    campos = CampoChecklistSerializer(many=True, required=False)
    # Escritura: lista de IDs de tecnicos. Lectura: detalle de tecnicos.
    tecnicos_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=User.objects.all(), source="tecnicos",
        write_only=True, required=False,
    )
    tecnicos_detalle = serializers.SerializerMethodField()
    creado_por_username = serializers.CharField(source="creado_por.username", read_only=True, default="")
    num_campos = serializers.SerializerMethodField()
    num_respuestas = serializers.SerializerMethodField()

    class Meta:
        model = FlujoChecklist
        fields = ["id", "nombre", "descripcion", "activo", "creado", "actualizado",
                  "creado_por", "creado_por_username", "campos",
                  "tecnicos_ids", "tecnicos_detalle", "num_campos", "num_respuestas"]
        read_only_fields = ["creado", "actualizado", "creado_por", "creado_por_username"]

    def get_tecnicos_detalle(self, obj):
        return [
            {"id": u.id, "username": u.username,
             "nombre": f"{u.first_name} {u.last_name}".strip() or u.username}
            for u in obj.tecnicos.all()
        ]

    def get_num_campos(self, obj) -> int:
        return obj.campos.count()

    def get_num_respuestas(self, obj) -> int:
        return obj.respuestas.count()

    def _guardar_campos(self, flujo, campos_data):
        import uuid
        flujo.campos.all().delete()
        for i, c in enumerate(campos_data):
            c.pop("id", None)
            if not c.get("clave"):
                c["clave"] = uuid.uuid4().hex[:10]
            CampoChecklist.objects.create(flujo=flujo, orden=c.pop("orden", i), **c)

    def create(self, validated_data):
        campos_data = validated_data.pop("campos", [])
        tecnicos = validated_data.pop("tecnicos", [])
        flujo = FlujoChecklist.objects.create(**validated_data)
        if tecnicos:
            flujo.tecnicos.set(tecnicos)
        self._guardar_campos(flujo, campos_data)
        return flujo

    def update(self, instance, validated_data):
        campos_data = validated_data.pop("campos", None)
        tecnicos = validated_data.pop("tecnicos", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        if tecnicos is not None:
            instance.tecnicos.set(tecnicos)
        if campos_data is not None:
            self._guardar_campos(instance, campos_data)
        return instance


class ValorCampoSerializer(serializers.ModelSerializer):
    foto_url = serializers.SerializerMethodField()
    etiqueta = serializers.CharField(source="campo.etiqueta", read_only=True)
    tipo = serializers.CharField(source="campo.tipo", read_only=True)
    seccion = serializers.CharField(source="campo.seccion", read_only=True)

    class Meta:
        model = ValorCampo
        fields = ["id", "campo", "etiqueta", "tipo", "seccion",
                  "texto", "numero", "booleano", "foto_url"]

    def get_foto_url(self, obj):
        if not obj.foto:
            return None
        request = self.context.get("request")
        url = obj.foto.url
        return request.build_absolute_uri(url) if request else url


class RespuestaChecklistSerializer(serializers.ModelSerializer):
    valores = ValorCampoSerializer(many=True, read_only=True)
    tecnico_username = serializers.CharField(source="tecnico.username", read_only=True, default="")
    flujo_nombre = serializers.CharField(source="flujo.nombre", read_only=True, default="")
    unidad_numero = serializers.CharField(source="unidad.numero", read_only=True, default="")
    termo_numero = serializers.CharField(source="termo.numero", read_only=True, default="")

    class Meta:
        model = RespuestaChecklist
        fields = ["id", "flujo", "flujo_nombre", "tecnico", "tecnico_username",
                  "orden", "unidad", "unidad_numero", "termo", "termo_numero",
                  "nota", "creado", "valores"]
        read_only_fields = ["tecnico", "creado", "unidad", "termo"]


# ── Procesos (flujos multi-etapa) ───────────────────────────────────────────────
class EtapaProcesoSerializer(serializers.ModelSerializer):
    tecnicos_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=User.objects.all(), source="tecnicos", write_only=True, required=False,
    )
    tecnicos_detalle = serializers.SerializerMethodField()
    checklist_nombre = serializers.CharField(source="checklist.nombre", read_only=True, default="")

    class Meta:
        model = EtapaProceso
        fields = ["id", "orden", "nombre", "checklist", "checklist_nombre",
                  "tecnicos_ids", "tecnicos_detalle"]

    def get_tecnicos_detalle(self, obj):
        return _tecnicos_detalle(obj.tecnicos)


class ProcesoSerializer(serializers.ModelSerializer):
    etapas = EtapaProcesoSerializer(many=True, required=False)
    creado_por_username = serializers.CharField(source="creado_por.username", read_only=True, default="")
    num_etapas = serializers.SerializerMethodField()
    num_ejecuciones = serializers.SerializerMethodField()

    class Meta:
        model = Proceso
        fields = ["id", "nombre", "descripcion", "activo", "creado", "actualizado",
                  "creado_por", "creado_por_username", "etapas", "num_etapas", "num_ejecuciones"]
        read_only_fields = ["creado", "actualizado", "creado_por"]

    def get_num_etapas(self, obj) -> int:
        return obj.etapas.count()

    def get_num_ejecuciones(self, obj) -> int:
        return obj.ejecuciones.count()

    def _guardar_etapas(self, proceso, etapas_data):
        proceso.etapas.all().delete()
        for i, e in enumerate(etapas_data):
            tecnicos = e.pop("tecnicos", [])
            e.pop("id", None)
            etapa = EtapaProceso.objects.create(proceso=proceso, orden=e.pop("orden", i), **e)
            if tecnicos:
                etapa.tecnicos.set(tecnicos)

    def create(self, validated_data):
        etapas = validated_data.pop("etapas", [])
        proceso = Proceso.objects.create(**validated_data)
        self._guardar_etapas(proceso, etapas)
        return proceso

    def update(self, instance, validated_data):
        etapas = validated_data.pop("etapas", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        if etapas is not None:
            self._guardar_etapas(instance, etapas)
        return instance


class EtapaEjecucionSerializer(serializers.ModelSerializer):
    tecnicos_detalle = serializers.SerializerMethodField()
    checklist_nombre = serializers.CharField(source="checklist.nombre", read_only=True, default="")
    completado_por_username = serializers.CharField(source="completado_por.username", read_only=True, default="")

    class Meta:
        model = EtapaEjecucion
        fields = ["id", "orden", "nombre", "checklist", "checklist_nombre", "estado",
                  "respuesta", "tecnicos_detalle", "completado_por_username", "completado_en"]

    def get_tecnicos_detalle(self, obj):
        return _tecnicos_detalle(obj.tecnicos)


class EjecucionProcesoSerializer(serializers.ModelSerializer):
    etapas = EtapaEjecucionSerializer(many=True, read_only=True)
    proceso_nombre = serializers.CharField(source="proceso.nombre", read_only=True, default="")
    iniciado_por_username = serializers.CharField(source="iniciado_por.username", read_only=True, default="")

    class Meta:
        model = EjecucionProceso
        fields = ["id", "proceso", "proceso_nombre", "etiqueta", "estado",
                  "iniciado_por", "iniciado_por_username", "creado", "actualizado", "etapas"]
        read_only_fields = ["estado", "iniciado_por", "creado", "actualizado"]
