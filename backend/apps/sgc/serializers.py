from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import (
    AccionCAPA, ActividadSGC, Auditoria, Capacitacion, ComentarioSGC, CompetenciaPerfil, ElementoContexto, Equipo,
    EvaluacionDetalle,
    EvaluacionCompetencia, EvaluacionProveedor, EvaluacionRequisito, EvidenciaSGC, Hallazgo,
    IndicadorKPI, MedicionKPI, NoConformidad, NotificacionCalidad, Norma, ObjetivoCalidad,
    ParteInteresada, PerfilPuesto, PoliticaCalidad, Proceso, Queja, RequisitoISO,
    AcuerdoRevision, Encuesta, RespuestaEncuesta, RevisionDireccion, Riesgo,
    SubtareaImplementacion, TareaImplementacion, TareaObjetivo,
)

User = get_user_model()


def _nombre(u):
    if not u:
        return None
    return (u.get_full_name() or "").strip() or u.username


class NormaSerializer(serializers.ModelSerializer):
    class Meta: model = Norma; fields = "__all__"


class RequisitoISOSerializer(serializers.ModelSerializer):
    norma_codigo = serializers.CharField(source="norma.codigo", read_only=True)
    class Meta: model = RequisitoISO; fields = "__all__"


class EvaluacionRequisitoSerializer(serializers.ModelSerializer):
    clausula = serializers.CharField(source="requisito.clausula", read_only=True)
    titulo = serializers.CharField(source="requisito.titulo", read_only=True)
    class Meta: model = EvaluacionRequisito; fields = "__all__"


class AccionCAPASerializer(serializers.ModelSerializer):
    responsable_nombre = serializers.SerializerMethodField()
    estado_display = serializers.CharField(source="get_estado_display", read_only=True)
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)
    class Meta: model = AccionCAPA; fields = "__all__"
    def get_responsable_nombre(self, o): return _nombre(o.responsable_user)


class NoConformidadSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)
    estado_display = serializers.CharField(source="get_estado_display", read_only=True)
    responsable_nombre = serializers.SerializerMethodField()
    creado_por_nombre = serializers.SerializerMethodField()
    aprobada_por_nombre = serializers.SerializerMethodField()
    verificada_por_nombre = serializers.SerializerMethodField()
    acciones = AccionCAPASerializer(many=True, read_only=True)
    acciones_total = serializers.IntegerField(source="acciones.count", read_only=True)
    acciones_hechas = serializers.SerializerMethodField()
    class Meta: model = NoConformidad; fields = "__all__"
    def get_responsable_nombre(self, o): return _nombre(o.responsable_user)
    def get_creado_por_nombre(self, o): return _nombre(o.creado_por)
    def get_aprobada_por_nombre(self, o): return _nombre(o.aprobada_por)
    def get_verificada_por_nombre(self, o): return _nombre(o.verificada_por)
    def get_acciones_hechas(self, o):
        return sum(1 for a in o.acciones.all() if a.estado in ("HECHA", "VERIFICADA"))


class HallazgoSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)
    class Meta: model = Hallazgo; fields = "__all__"


class AuditoriaSerializer(serializers.ModelSerializer):
    estado_display = serializers.CharField(source="get_estado_display", read_only=True)
    hallazgos = HallazgoSerializer(many=True, read_only=True)
    auditor_lider_nombre = serializers.SerializerMethodField()
    class Meta: model = Auditoria; fields = "__all__"
    def get_auditor_lider_nombre(self, o): return _nombre(o.auditor_lider_user)


class RiesgoSerializer(serializers.ModelSerializer):
    nivel = serializers.IntegerField(read_only=True)
    severidad = serializers.CharField(read_only=True)
    responsable_nombre = serializers.SerializerMethodField()
    class Meta: model = Riesgo; fields = "__all__"
    def get_responsable_nombre(self, o): return _nombre(o.responsable_user)


class IndicadorKPISerializer(serializers.ModelSerializer):
    cumple = serializers.BooleanField(read_only=True)
    proceso_nombre = serializers.CharField(source="proceso_ref.nombre", read_only=True, default=None)
    class Meta: model = IndicadorKPI; fields = "__all__"


class MedicionKPISerializer(serializers.ModelSerializer):
    class Meta: model = MedicionKPI; fields = "__all__"; read_only_fields = ["registrado_por"]


class CapacitacionSerializer(serializers.ModelSerializer):
    responsable_nombre = serializers.SerializerMethodField()
    class Meta: model = Capacitacion; fields = "__all__"
    def get_responsable_nombre(self, o): return _nombre(o.responsable_user)


class EquipoSerializer(serializers.ModelSerializer):
    responsable_nombre = serializers.SerializerMethodField()
    class Meta: model = Equipo; fields = "__all__"
    def get_responsable_nombre(self, o): return _nombre(o.responsable_user)


class EvaluacionProveedorSerializer(serializers.ModelSerializer):
    proveedor_nombre = serializers.CharField(source="proveedor.razon_social", read_only=True)
    puntaje = serializers.FloatField(read_only=True)
    homologado = serializers.BooleanField(read_only=True)
    class Meta: model = EvaluacionProveedor; fields = "__all__"


class QuejaSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)
    class Meta: model = Queja; fields = "__all__"


class PoliticaCalidadSerializer(serializers.ModelSerializer):
    class Meta: model = PoliticaCalidad; fields = "__all__"


class TareaObjetivoSerializer(serializers.ModelSerializer):
    responsable_nombre = serializers.SerializerMethodField()
    completada = serializers.BooleanField(read_only=True)
    class Meta: model = TareaObjetivo; fields = "__all__"
    def get_responsable_nombre(self, o): return _nombre(o.responsable_user)


class ObjetivoCalidadSerializer(serializers.ModelSerializer):
    responsable_nombre = serializers.SerializerMethodField()
    proceso_nombre = serializers.CharField(source="proceso_ref.nombre", read_only=True, default=None)
    kpi_nombre = serializers.CharField(source="kpi_ref.nombre", read_only=True, default=None)
    kpi_valor = serializers.DecimalField(source="kpi_ref.valor_actual", max_digits=14, decimal_places=2, read_only=True, default=None)
    kpi_meta = serializers.DecimalField(source="kpi_ref.meta", max_digits=14, decimal_places=2, read_only=True, default=None)
    tareas = TareaObjetivoSerializer(many=True, read_only=True)
    tiene_tareas = serializers.SerializerMethodField()
    class Meta: model = ObjetivoCalidad; fields = "__all__"
    def get_responsable_nombre(self, o): return _nombre(o.responsable_user)
    def get_tiene_tareas(self, o): return o.tareas.exists()


class ElementoContextoSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)
    class Meta: model = ElementoContexto; fields = "__all__"


class ParteInteresadaSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)
    class Meta: model = ParteInteresada; fields = "__all__"


class AcuerdoRevisionSerializer(serializers.ModelSerializer):
    responsable_nombre = serializers.SerializerMethodField()
    completado = serializers.BooleanField(read_only=True)
    estado_display = serializers.CharField(source="get_estado_display", read_only=True)
    class Meta: model = AcuerdoRevision; fields = "__all__"
    def get_responsable_nombre(self, o): return _nombre(o.responsable_user)


class RevisionDireccionSerializer(serializers.ModelSerializer):
    acuerdos_items = AcuerdoRevisionSerializer(many=True, read_only=True)
    acuerdos_total = serializers.IntegerField(source="acuerdos_items.count", read_only=True)
    acuerdos_cerrados = serializers.SerializerMethodField()
    creado_por_nombre = serializers.SerializerMethodField()
    class Meta: model = RevisionDireccion; fields = "__all__"; read_only_fields = ["metricas", "creado_por"]
    def get_acuerdos_cerrados(self, o):
        return sum(1 for a in o.acuerdos_items.all() if a.estado == "CERRADO")
    def get_creado_por_nombre(self, o): return _nombre(o.creado_por)


class CompetenciaPerfilSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)
    nivel_display = serializers.CharField(source="get_nivel_requerido_display", read_only=True)
    class Meta: model = CompetenciaPerfil; fields = "__all__"


class PerfilPuestoSerializer(serializers.ModelSerializer):
    competencias = CompetenciaPerfilSerializer(many=True, read_only=True)
    competencias_total = serializers.IntegerField(source="competencias.count", read_only=True)
    class Meta: model = PerfilPuesto; fields = "__all__"


class EvaluacionDetalleSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)
    nivel_req_display = serializers.CharField(source="get_nivel_requerido_display", read_only=True)
    nivel_act_display = serializers.CharField(source="get_nivel_actual_display", read_only=True)
    brecha = serializers.IntegerField(read_only=True)
    class Meta: model = EvaluacionDetalle; fields = "__all__"


class EvaluacionCompetenciaSerializer(serializers.ModelSerializer):
    perfil_puesto = serializers.CharField(source="perfil.puesto", read_only=True, default=None)
    detalles = EvaluacionDetalleSerializer(many=True, read_only=True)
    eficacia_display = serializers.CharField(source="get_eficacia_display", read_only=True)
    capacitacion_nombre = serializers.CharField(source="capacitacion_ref.curso", read_only=True, default=None)
    class Meta: model = EvaluacionCompetencia; fields = "__all__"


# ── Colaboración (Pilar 1) ──────────────────────────────────────────────────
class MiembroSerializer(serializers.ModelSerializer):
    nombre = serializers.SerializerMethodField()
    rol = serializers.SerializerMethodField()
    class Meta:
        model = User
        fields = ["id", "username", "nombre", "email", "rol"]

    def get_nombre(self, u):
        return _nombre(u)

    def get_rol(self, u):
        emp = self.context.get("empresa_id")
        if emp:
            m = u.empresas.filter(empresa_id=emp).first()
            if m:
                return m.rol
        return "OWNER" if u.is_superuser else "USER"


class ComentarioSGCSerializer(serializers.ModelSerializer):
    autor_nombre = serializers.SerializerMethodField()
    autor_username = serializers.CharField(source="autor.username", read_only=True, default=None)
    menciones_nombres = serializers.SerializerMethodField()
    class Meta:
        model = ComentarioSGC
        fields = ["id", "texto", "autor", "autor_nombre", "autor_username",
                  "menciones_nombres", "editado", "creado", "actualizado"]
        read_only_fields = ["autor", "editado", "creado", "actualizado"]

    def get_autor_nombre(self, o):
        return _nombre(o.autor)

    def get_menciones_nombres(self, o):
        return [_nombre(u) for u in o.menciones.all()]


class ActividadSGCSerializer(serializers.ModelSerializer):
    actor_nombre = serializers.SerializerMethodField()
    verbo_display = serializers.CharField(source="get_verbo_display", read_only=True)
    class Meta:
        model = ActividadSGC
        fields = ["id", "verbo", "verbo_display", "descripcion", "datos",
                  "actor", "actor_nombre", "creado"]

    def get_actor_nombre(self, o):
        return _nombre(o.actor)


class NotificacionCalidadSerializer(serializers.ModelSerializer):
    actor_nombre = serializers.SerializerMethodField()
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)
    class Meta:
        model = NotificacionCalidad
        fields = ["id", "tipo", "tipo_display", "titulo", "mensaje", "url",
                  "actor", "actor_nombre", "leida", "creada", "leida_en"]
        read_only_fields = fields

    def get_actor_nombre(self, o):
        return _nombre(o.actor)


# ── Pilar 2 · Implementación (Kanban) ───────────────────────────────────────
class SubtareaImplementacionSerializer(serializers.ModelSerializer):
    responsable_nombre = serializers.SerializerMethodField()
    completada = serializers.BooleanField(read_only=True)
    class Meta: model = SubtareaImplementacion; fields = "__all__"
    def get_responsable_nombre(self, o): return _nombre(o.responsable_user)


class TareaImplementacionSerializer(serializers.ModelSerializer):
    responsable_nombre = serializers.SerializerMethodField()
    clausula = serializers.CharField(source="requisito.clausula", read_only=True, default=None)
    requisito_titulo = serializers.CharField(source="requisito.titulo", read_only=True, default=None)
    subtareas = SubtareaImplementacionSerializer(many=True, read_only=True)
    subtareas_total = serializers.IntegerField(source="subtareas.count", read_only=True)
    class Meta: model = TareaImplementacion; fields = "__all__"; read_only_fields = ["creado_por"]
    def get_responsable_nombre(self, o): return _nombre(o.responsable_user)


# ── Pilar 3 · Evidencias ────────────────────────────────────────────────────
class EvidenciaSGCSerializer(serializers.ModelSerializer):
    subido_por_nombre = serializers.SerializerMethodField()
    archivo_url = serializers.SerializerMethodField()
    class Meta:
        model = EvidenciaSGC
        fields = ["id", "nombre", "descripcion", "archivo", "archivo_url",
                  "subido_por", "subido_por_nombre", "creado"]
        read_only_fields = ["subido_por", "creado"]
    def get_subido_por_nombre(self, o): return _nombre(o.subido_por)
    def get_archivo_url(self, o):
        try:
            return o.archivo.url
        except Exception:
            return None


# ── Pilar 4 · Procesos (SIPOC) ──────────────────────────────────────────────
class ProcesoSerializer(serializers.ModelSerializer):
    dueno_nombre = serializers.SerializerMethodField()
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)
    kpis_count = serializers.IntegerField(source="kpis.count", read_only=True)
    riesgos_count = serializers.IntegerField(source="riesgos.count", read_only=True)
    class Meta: model = Proceso; fields = "__all__"
    def get_dueno_nombre(self, o): return _nombre(o.dueno_user)


# ── Encuestas públicas ──────────────────────────────────────────────────────
class EncuestaSerializer(serializers.ModelSerializer):
    respuestas_count = serializers.IntegerField(source="respuestas.count", read_only=True)
    class Meta:
        model = Encuesta
        fields = "__all__"
        read_only_fields = ["token", "creado_por", "creado"]


class EncuestaPublicaSerializer(serializers.ModelSerializer):
    empresa_nombre = serializers.CharField(source="empresa.nombre_comercial", read_only=True)
    class Meta:
        model = Encuesta
        fields = ["token", "titulo", "descripcion", "preguntas", "color", "mensaje_gracias", "activa", "empresa_nombre"]


class RespuestaEncuestaSerializer(serializers.ModelSerializer):
    class Meta:
        model = RespuestaEncuesta
        fields = "__all__"
