"""Sistema de Gestión de Calidad (SGC / ISO).

Cubre los módulos que NO existían en el ERP: diagnóstico (gap analysis),
no conformidades / CAPA, auditorías, riesgos, KPIs, capacitación, competencias,
control de equipos (calibraciones), evaluación de proveedores y quejas.

La gestión documental y los diagramas/procesos ya viven en sus propias apps
(`gestion_documental`, `diagramas`) y se enlazan desde el hub del SGC.
"""
from __future__ import annotations

from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models

from apps.core.models import Empresa


def siguiente_folio(modelo, empresa, prefijo):
    """Genera un folio único y secuencial por empresa y año: PREFIJO-AAAA-NNNN.

    Evita códigos duplicados sin importar cómo se cree el registro (manual,
    desde auditoría, queja, diagnóstico, etc.)."""
    from datetime import date as _date
    base = f"{prefijo}-{_date.today().year}-"
    maxn = 0
    for fo in modelo.objects.filter(empresa=empresa, folio__startswith=base).values_list("folio", flat=True):
        try:
            maxn = max(maxn, int(fo.rsplit("-", 1)[-1]))
        except (ValueError, IndexError):
            continue
    return f"{base}{maxn + 1:04d}"


# ── 1. Diagnóstico inicial / Gap Analysis ──────────────────────────────────
class Norma(models.Model):
    codigo = models.CharField(max_length=40, help_text="p.ej. ISO 9001:2015")
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True)
    activa = models.BooleanField(default=True)

    class Meta:
        ordering = ["codigo"]

    def __str__(self) -> str:
        return self.codigo


class RequisitoISO(models.Model):
    """Cláusula/requisito de una norma (ítem del cuestionario de diagnóstico)."""
    norma = models.ForeignKey(Norma, on_delete=models.CASCADE, related_name="requisitos")
    clausula = models.CharField(max_length=20, help_text="p.ej. 7.1.5")
    titulo = models.CharField(max_length=300)
    descripcion = models.TextField(blank=True)
    orden = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["norma", "orden", "clausula"]

    def __str__(self) -> str:
        return f"{self.clausula} {self.titulo}"


class EvaluacionRequisito(models.Model):
    """Respuesta del diagnóstico por empresa/requisito."""
    NIVELES = [("NO", "No cumple"), ("PARCIAL", "Parcial"), ("SI", "Cumple"), ("NA", "No aplica")]
    PUNTAJE = {"NO": 0, "PARCIAL": 50, "SI": 100, "NA": None}

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="evaluaciones_iso")
    requisito = models.ForeignKey(RequisitoISO, on_delete=models.CASCADE, related_name="evaluaciones")
    cumple = models.CharField(max_length=10, choices=NIVELES, default="NO")
    evidencia = models.TextField(blank=True)
    observaciones = models.TextField(blank=True)
    responsable = models.CharField(max_length=120, blank=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [("empresa", "requisito")]


# ── 5. No conformidades / CAPA ──────────────────────────────────────────────
class NoConformidad(models.Model):
    TIPOS = [("CORRECTIVA", "Acción correctiva"), ("PREVENTIVA", "Acción preventiva"), ("MEJORA", "Mejora")]
    ORIGENES = [
        ("AUDITORIA", "Auditoría interna"), ("QUEJA", "Queja de cliente"),
        ("PROCESO", "Desviación de proceso"), ("PROVEEDOR", "Proveedor"), ("OTRO", "Otro"),
    ]
    ESTADOS = [("ABIERTA", "Abierta"), ("EN_PROCESO", "En proceso"), ("CERRADA", "Cerrada"), ("VENCIDA", "Vencida")]

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="no_conformidades")
    folio = models.CharField(max_length=30, blank=True)
    tipo = models.CharField(max_length=12, choices=TIPOS, default="CORRECTIVA")
    origen = models.CharField(max_length=12, choices=ORIGENES, default="OTRO")
    descripcion = models.TextField(help_text="Descripción de la no conformidad")
    causa_raiz = models.TextField(blank=True, help_text="Análisis de causa raíz (5 porqués, Ishikawa…)")
    accion = models.TextField(blank=True, help_text="Acción correctiva/preventiva propuesta")
    responsable = models.CharField(max_length=120, blank=True)
    responsable_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="nc_asignadas", help_text="Usuario responsable del cierre")
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="nc_creadas")
    fecha_deteccion = models.DateField(auto_now_add=True)
    fecha_compromiso = models.DateField(null=True, blank=True)
    fecha_cierre = models.DateField(null=True, blank=True)
    estado = models.CharField(max_length=12, choices=ESTADOS, default="ABIERTA")
    eficacia_verificada = models.BooleanField(default=False)
    # Flujo de aprobación (Pilar 3): segregación de funciones — quien aprueba el
    # plan y quien verifica la eficacia deben ser distintos del ejecutor.
    aprobada_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="nc_aprobadas")
    fecha_aprobacion = models.DateField(null=True, blank=True)
    verificada_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="nc_verificadas")

    class Meta:
        ordering = ["-fecha_deteccion"]

    def save(self, *args, **kwargs):
        if not self.folio and self.empresa_id:
            self.folio = siguiente_folio(NoConformidad, self.empresa, "NC")
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.folio or 'NC'} · {self.get_tipo_display()}"


# ── 6. Auditorías internas ──────────────────────────────────────────────────
class Auditoria(models.Model):
    TIPOS = [("INTERNA", "Interna"), ("EXTERNA", "Externa"), ("PROVEEDOR", "A proveedor")]
    ESTADOS = [("PROGRAMADA", "Programada"), ("EN_CURSO", "En curso"), ("CERRADA", "Cerrada"), ("CANCELADA", "Cancelada")]

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="auditorias")
    norma = models.ForeignKey(Norma, on_delete=models.SET_NULL, null=True, blank=True)
    titulo = models.CharField(max_length=200)
    tipo = models.CharField(max_length=12, choices=TIPOS, default="INTERNA")
    alcance = models.TextField(blank=True)
    auditor_lider = models.CharField(max_length=120, blank=True)
    auditor_lider_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="auditorias_lideradas", help_text="Auditor líder (usuario)")
    fecha_programada = models.DateField(null=True, blank=True)
    fecha_realizada = models.DateField(null=True, blank=True)
    estado = models.CharField(max_length=12, choices=ESTADOS, default="PROGRAMADA")

    class Meta:
        ordering = ["-fecha_programada"]

    def __str__(self) -> str:
        return self.titulo


class Hallazgo(models.Model):
    TIPOS = [("NC_MAYOR", "No conformidad mayor"), ("NC_MENOR", "No conformidad menor"),
             ("OBSERVACION", "Observación"), ("OPORTUNIDAD", "Oportunidad de mejora"), ("CONFORME", "Conforme")]
    auditoria = models.ForeignKey(Auditoria, on_delete=models.CASCADE, related_name="hallazgos")
    requisito = models.ForeignKey(RequisitoISO, on_delete=models.SET_NULL, null=True, blank=True)
    tipo = models.CharField(max_length=12, choices=TIPOS, default="OBSERVACION")
    descripcion = models.TextField()
    evidencia = models.TextField(blank=True)
    no_conformidad = models.ForeignKey(NoConformidad, on_delete=models.SET_NULL, null=True, blank=True,
                                       related_name="hallazgos")


# ── 4. Gestión de riesgos ───────────────────────────────────────────────────
class Riesgo(models.Model):
    ESTADOS = [("IDENTIFICADO", "Identificado"), ("EN_TRATAMIENTO", "En tratamiento"),
               ("CONTROLADO", "Controlado"), ("ACEPTADO", "Aceptado")]
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="riesgos")
    proceso = models.CharField(max_length=150, blank=True)
    proceso_ref = models.ForeignKey(
        "Proceso", on_delete=models.SET_NULL, null=True, blank=True, related_name="riesgos")
    descripcion = models.TextField()
    es_oportunidad = models.BooleanField(default=False, help_text="True = oportunidad; False = riesgo")
    probabilidad = models.PositiveSmallIntegerField(default=1, help_text="1 a 5")
    impacto = models.PositiveSmallIntegerField(default=1, help_text="1 a 5")
    controles = models.TextField(blank=True)
    plan_mitigacion = models.TextField(blank=True)
    responsable = models.CharField(max_length=120, blank=True)
    responsable_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="riesgos_asignados", help_text="Responsable del tratamiento")
    estado = models.CharField(max_length=15, choices=ESTADOS, default="IDENTIFICADO")
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-id"]

    @property
    def nivel(self) -> int:
        return (self.probabilidad or 0) * (self.impacto or 0)

    @property
    def severidad(self) -> str:
        n = self.nivel
        if n >= 15:
            return "CRITICO"
        if n >= 8:
            return "ALTO"
        if n >= 4:
            return "MEDIO"
        return "BAJO"


# ── 7. Indicadores KPI ──────────────────────────────────────────────────────
class IndicadorKPI(models.Model):
    SENTIDOS = [("MAYOR", "Mayor es mejor"), ("MENOR", "Menor es mejor")]
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="indicadores")
    nombre = models.CharField(max_length=200)
    proceso = models.CharField(max_length=150, blank=True)
    proceso_ref = models.ForeignKey(
        "Proceso", on_delete=models.SET_NULL, null=True, blank=True, related_name="kpis")
    unidad = models.CharField(max_length=30, blank=True, help_text="%, días, piezas…")
    meta = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    valor_actual = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    sentido = models.CharField(max_length=6, choices=SENTIDOS, default="MAYOR")
    frecuencia = models.CharField(max_length=30, blank=True, help_text="Mensual, trimestral…")
    responsable = models.CharField(max_length=120, blank=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["nombre"]

    @property
    def cumple(self) -> bool:
        if self.sentido == "MENOR":
            return float(self.valor_actual) <= float(self.meta)
        return float(self.valor_actual) >= float(self.meta)


# ── 8/9. Capacitación y competencias ───────────────────────────────────────
class Capacitacion(models.Model):
    ESTADOS = [("PROGRAMADA", "Programada"), ("IMPARTIDA", "Impartida"), ("VENCIDA", "Vencida")]
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="capacitaciones")
    curso = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True)
    instructor = models.CharField(max_length=120, blank=True)
    responsable_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="capacitaciones_asignadas", help_text="Responsable de la capacitación")
    participantes = models.TextField(blank=True, help_text="Empleados / puestos")
    fecha = models.DateField(null=True, blank=True)
    vigencia_meses = models.PositiveSmallIntegerField(default=12)
    fecha_vencimiento = models.DateField(null=True, blank=True)
    estado = models.CharField(max_length=12, choices=ESTADOS, default="PROGRAMADA")
    calificacion = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    class Meta:
        ordering = ["-fecha"]


# ── 10. Control de equipos (calibraciones) ──────────────────────────────────
class Equipo(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="equipos_sgc")
    codigo = models.CharField(max_length=40)
    nombre = models.CharField(max_length=200)
    ubicacion = models.CharField(max_length=150, blank=True)
    responsable_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="equipos_asignados", help_text="Responsable de la calibración")
    requiere_calibracion = models.BooleanField(default=True)
    fecha_ultima_calibracion = models.DateField(null=True, blank=True)
    frecuencia_meses = models.PositiveSmallIntegerField(default=12)
    fecha_proxima_calibracion = models.DateField(null=True, blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ["codigo"]


# ── 11. Evaluación de proveedores ──────────────────────────────────────────
class EvaluacionProveedor(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="evaluaciones_proveedor")
    proveedor = models.ForeignKey("cxp.Proveedor", on_delete=models.CASCADE, related_name="evaluaciones_sgc")
    periodo = models.CharField(max_length=20, help_text="p.ej. 2026-Q1")
    calidad = models.PositiveSmallIntegerField(default=0, help_text="0-100")
    tiempo_entrega = models.PositiveSmallIntegerField(default=0, help_text="0-100")
    servicio = models.PositiveSmallIntegerField(default=0, help_text="0-100")
    documentacion = models.PositiveSmallIntegerField(default=0, help_text="0-100")
    comentarios = models.TextField(blank=True)
    fecha = models.DateField(auto_now_add=True)

    class Meta:
        ordering = ["-fecha"]

    @property
    def puntaje(self) -> float:
        return round((self.calidad + self.tiempo_entrega + self.servicio + self.documentacion) / 4, 1)

    @property
    def homologado(self) -> bool:
        return self.puntaje >= 80


# ── 12. Quejas y satisfacción ───────────────────────────────────────────────
class Queja(models.Model):
    TIPOS = [("QUEJA", "Queja"), ("RECLAMO", "Reclamo"), ("SUGERENCIA", "Sugerencia"), ("FELICITACION", "Felicitación")]
    ESTADOS = [("ABIERTA", "Abierta"), ("EN_PROCESO", "En proceso"), ("RESUELTA", "Resuelta")]
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="quejas")
    folio = models.CharField(max_length=30, blank=True)
    tipo = models.CharField(max_length=12, choices=TIPOS, default="QUEJA")
    cliente = models.CharField(max_length=200, blank=True)
    descripcion = models.TextField()
    fecha = models.DateField(auto_now_add=True)
    respuesta = models.TextField(blank=True)
    satisfaccion = models.PositiveSmallIntegerField(null=True, blank=True, help_text="1-5")
    estado = models.CharField(max_length=12, choices=ESTADOS, default="ABIERTA")
    no_conformidad = models.ForeignKey(NoConformidad, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        ordering = ["-fecha"]

    def save(self, *args, **kwargs):
        if not self.folio and self.empresa_id:
            self.folio = siguiente_folio(Queja, self.empresa, "Q")
        super().save(*args, **kwargs)


# ── Política y objetivos de calidad (5.2 / 6.2) ─────────────────────────────
class PoliticaCalidad(models.Model):
    empresa = models.OneToOneField(Empresa, on_delete=models.CASCADE, related_name="politica_calidad")
    texto = models.TextField(blank=True)
    version = models.CharField(max_length=20, default="1.0")
    fecha_revision = models.DateField(null=True, blank=True)
    aprobada_por = models.CharField(max_length=150, blank=True)
    vigente = models.BooleanField(default=True)
    actualizado = models.DateTimeField(auto_now=True)


class ObjetivoCalidad(models.Model):
    ESTADOS = [("EN_CURSO", "En curso"), ("LOGRADO", "Logrado"), ("NO_LOGRADO", "No logrado")]
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="objetivos_calidad")
    objetivo = models.CharField(max_length=300)
    proceso_ref = models.ForeignKey(
        "Proceso", on_delete=models.SET_NULL, null=True, blank=True, related_name="objetivos",
        help_text="Proceso del que deriva el objetivo")
    kpi_ref = models.ForeignKey(
        "IndicadorKPI", on_delete=models.SET_NULL, null=True, blank=True, related_name="objetivos",
        help_text="KPI con el que se mide el objetivo")
    meta = models.CharField(max_length=120, blank=True, help_text="p.ej. ≥ 95%")
    indicador = models.CharField(max_length=200, blank=True, help_text="Cómo se mide")
    responsable = models.CharField(max_length=120, blank=True)
    responsable_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="objetivos_asignados", help_text="Responsable del objetivo")
    fecha_limite = models.DateField(null=True, blank=True)
    avance = models.PositiveSmallIntegerField(default=0, help_text="0-100")
    estado = models.CharField(max_length=12, choices=ESTADOS, default="EN_CURSO")

    class Meta:
        ordering = ["-id"]

    def recomputar(self, guardar=True):
        """Recalcula el avance como promedio ponderado de sus tareas y
        autocompleta el estado al llegar al 100 %. Si no hay tareas, conserva
        el avance manual."""
        tareas = list(self.tareas.all())
        if tareas:
            total_peso = sum(t.peso or 1 for t in tareas) or 1
            self.avance = round(sum((t.peso or 1) * t.avance for t in tareas) / total_peso)
            if self.avance >= 100 and self.estado != "LOGRADO":
                self.estado = "LOGRADO"
            elif self.avance < 100 and self.estado == "LOGRADO":
                self.estado = "EN_CURSO"
        if guardar:
            self.save(update_fields=["avance", "estado"])
        return self.avance


class TareaObjetivo(models.Model):
    """Tarea / resultado clave de un objetivo. Su avance ponderado alimenta el
    porcentaje total del objetivo."""
    objetivo = models.ForeignKey(ObjetivoCalidad, on_delete=models.CASCADE, related_name="tareas")
    titulo = models.CharField(max_length=300)
    peso = models.PositiveSmallIntegerField(default=1, help_text="Peso relativo en el avance")
    avance = models.PositiveSmallIntegerField(default=0, help_text="0-100")
    responsable_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="tareas_objetivo")
    fecha_limite = models.DateField(null=True, blank=True)
    orden = models.PositiveIntegerField(default=0)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["orden", "id"]

    @property
    def completada(self) -> bool:
        return self.avance >= 100


# ── Contexto de la organización (4.1 / 4.2) ─────────────────────────────────
class ElementoContexto(models.Model):
    """Análisis FODA: factor interno (F/D) o externo (O/A)."""
    TIPOS = [("F", "Fortaleza"), ("D", "Debilidad"), ("O", "Oportunidad"), ("A", "Amenaza")]
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="contexto")
    tipo = models.CharField(max_length=1, choices=TIPOS)
    descripcion = models.CharField(max_length=400)
    estrategia = models.TextField(blank=True, help_text="Cómo se aprovecha/aborda")

    class Meta:
        ordering = ["tipo", "id"]


class ParteInteresada(models.Model):
    TIPOS = [
        ("CLIENTE", "Cliente"), ("PROVEEDOR", "Proveedor"), ("EMPLEADO", "Empleado/personal"),
        ("ACCIONISTA", "Accionista/dueño"), ("AUTORIDAD", "Autoridad/regulador"),
        ("COMUNIDAD", "Comunidad"), ("OTRO", "Otro"),
    ]
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="partes_interesadas")
    nombre = models.CharField(max_length=200)
    tipo = models.CharField(max_length=12, choices=TIPOS, default="CLIENTE")
    necesidades = models.TextField(blank=True, help_text="Necesidades y expectativas")
    influencia = models.PositiveSmallIntegerField(default=3, help_text="1-5")
    seguimiento = models.CharField(max_length=300, blank=True, help_text="Cómo se les da seguimiento")

    class Meta:
        ordering = ["tipo", "nombre"]


# ── Revisión por la dirección (9.3) ─────────────────────────────────────────
class RevisionDireccion(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="revisiones_direccion")
    fecha = models.DateField(null=True, blank=True)
    periodo = models.CharField(max_length=40, blank=True, help_text="p.ej. 2026-S1")
    participantes = models.TextField(blank=True)
    # Entradas (9.3.2)
    entradas = models.TextField(blank=True, help_text="Estado de acciones previas, cambios, desempeño (KPIs, NC, auditorías, satisfacción, proveedores), recursos, riesgos…")
    # Salidas (9.3.3)
    conclusiones = models.TextField(blank=True, help_text="Oportunidades de mejora, cambios al SGC, necesidades de recursos")
    acuerdos = models.TextField(blank=True, help_text="Acuerdos, responsables y fechas")
    proxima_fecha = models.DateField(null=True, blank=True)
    # Foto del estado del SGC en el momento de la revisión (9.3.2).
    metricas = models.JSONField(default=dict, blank=True)
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")

    class Meta:
        ordering = ["-fecha"]


class AcuerdoRevision(models.Model):
    """Acuerdo/decisión (salida 9.3.3) con responsable y seguimiento."""
    ESTADOS = [("PENDIENTE", "Pendiente"), ("EN_PROCESO", "En proceso"), ("CERRADO", "Cerrado")]
    revision = models.ForeignKey(RevisionDireccion, on_delete=models.CASCADE, related_name="acuerdos_items")
    descripcion = models.CharField(max_length=400)
    responsable_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="acuerdos_revision")
    fecha_compromiso = models.DateField(null=True, blank=True)
    estado = models.CharField(max_length=12, choices=ESTADOS, default="PENDIENTE")
    orden = models.PositiveIntegerField(default=0)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["orden", "id"]

    @property
    def completado(self) -> bool:
        return self.estado == "CERRADO"


# ── Competencias (7.2) ──────────────────────────────────────────────────────
NIVELES_COMPETENCIA = [(1, "Básico"), (2, "Intermedio"), (3, "Avanzado"), (4, "Experto")]
TIPOS_COMPETENCIA = [
    ("CONOCIMIENTO", "Conocimiento"), ("TECNICA", "Habilidad técnica"),
    ("BLANDA", "Habilidad blanda"), ("CERTIFICACION", "Certificación"),
    ("EXPERIENCIA", "Experiencia"),
]


class PerfilPuesto(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="perfiles_puesto")
    puesto = models.CharField(max_length=150)
    area = models.CharField(max_length=120, blank=True)
    funciones = models.TextField(blank=True, help_text="Funciones/responsabilidades del puesto")
    escolaridad = models.CharField(max_length=200, blank=True)
    formacion = models.TextField(blank=True, help_text="Cursos/certificaciones requeridas")
    experiencia = models.CharField(max_length=200, blank=True)
    habilidades = models.TextField(blank=True, help_text="Competencias/habilidades requeridas")

    class Meta:
        ordering = ["puesto"]


class CompetenciaPerfil(models.Model):
    """Competencia requerida por un puesto, con su nivel objetivo (7.2)."""
    perfil = models.ForeignKey(PerfilPuesto, on_delete=models.CASCADE, related_name="competencias")
    tipo = models.CharField(max_length=14, choices=TIPOS_COMPETENCIA, default="CONOCIMIENTO")
    nombre = models.CharField(max_length=200)
    nivel_requerido = models.PositiveSmallIntegerField(choices=NIVELES_COMPETENCIA, default=2)
    obligatoria = models.BooleanField(default=True)
    orden = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["orden", "id"]


class EvaluacionCompetencia(models.Model):
    ESTADOS = [("CUMPLE", "Cumple perfil"), ("BRECHA", "Con brecha"), ("EN_DESARROLLO", "En desarrollo")]
    EFICACIA = [("PENDIENTE", "Por evaluar"), ("EFICAZ", "Eficaz"), ("NO_EFICAZ", "No eficaz")]
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="evaluaciones_competencia")
    persona = models.CharField(max_length=150)
    persona_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="evaluaciones_competencia")
    perfil = models.ForeignKey(PerfilPuesto, on_delete=models.SET_NULL, null=True, blank=True, related_name="evaluaciones")
    fecha = models.DateField(auto_now_add=True)
    nivel = models.PositiveSmallIntegerField(default=0, help_text="% de cumplimiento del perfil (0-100)")
    brechas = models.TextField(blank=True)
    plan_desarrollo = models.TextField(blank=True, help_text="Capacitación/acciones para cerrar brechas")
    capacitacion_ref = models.ForeignKey(
        "Capacitacion", on_delete=models.SET_NULL, null=True, blank=True, related_name="evaluaciones_competencia",
        help_text="Capacitación que cierra las brechas")
    eficacia = models.CharField(max_length=10, choices=EFICACIA, default="PENDIENTE")
    fecha_reevaluacion = models.DateField(null=True, blank=True)
    estado = models.CharField(max_length=14, choices=ESTADOS, default="BRECHA")

    class Meta:
        ordering = ["-fecha"]

    def recomputar(self, guardar=True):
        """Calcula el % de cumplimiento, el estado y el texto de brechas a partir
        de los detalles por competencia (nivel actual vs requerido)."""
        dets = list(self.detalles.all())
        if dets:
            suma = sum(min(d.nivel_actual / d.nivel_requerido, 1) for d in dets if d.nivel_requerido)
            self.nivel = round(suma / len(dets) * 100)
            faltantes = [d for d in dets if d.nivel_actual < d.nivel_requerido]
            oblig_fal = [d for d in faltantes if d.obligatoria]
            self.brechas = "; ".join(
                f"{d.nombre} (req. {d.get_nivel_requerido_display()}, actual {dict(NIVELES_COMPETENCIA).get(d.nivel_actual, 'Sin')})"
                for d in faltantes) or ""
            if oblig_fal:
                self.estado = "BRECHA"
            elif self.nivel >= 90:
                self.estado = "CUMPLE"
            else:
                self.estado = "EN_DESARROLLO"
        if guardar:
            self.save(update_fields=["nivel", "brechas", "estado"])
        return self.nivel


class EvaluacionDetalle(models.Model):
    """Nivel real de una persona en una competencia (genera la brecha)."""
    evaluacion = models.ForeignKey(EvaluacionCompetencia, on_delete=models.CASCADE, related_name="detalles")
    competencia = models.ForeignKey(CompetenciaPerfil, on_delete=models.SET_NULL, null=True, blank=True)
    nombre = models.CharField(max_length=200)
    tipo = models.CharField(max_length=14, choices=TIPOS_COMPETENCIA, default="CONOCIMIENTO")
    nivel_requerido = models.PositiveSmallIntegerField(choices=NIVELES_COMPETENCIA, default=2)
    nivel_actual = models.PositiveSmallIntegerField(default=0, help_text="0 = no lo tiene")
    obligatoria = models.BooleanField(default=True)
    orden = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["orden", "id"]

    @property
    def brecha(self) -> int:
        return max(0, self.nivel_requerido - self.nivel_actual)


# ─────────────────────────────────────────────────────────────────────────────
# CAPA DE COLABORACIÓN MULTI-USUARIO (Pilar 1)
#
# Tres piezas genéricas (vía ContentType) que se pueden enganchar a CUALQUIER
# registro del SGC sin acoplar tablas: hilo de comentarios, bitácora de
# actividad (trazabilidad) y notificaciones a usuarios reales.
# ─────────────────────────────────────────────────────────────────────────────
class ComentarioSGC(models.Model):
    """Comentario en el hilo de discusión de cualquier registro del SGC."""
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="comentarios_sgc")
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    objeto = GenericForeignKey("content_type", "object_id")
    autor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name="comentarios_sgc")
    texto = models.TextField()
    menciones = models.ManyToManyField(
        settings.AUTH_USER_MODEL, blank=True, related_name="menciones_sgc")
    editado = models.BooleanField(default=False)
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["creado"]
        indexes = [models.Index(fields=["content_type", "object_id"])]


class ActividadSGC(models.Model):
    """Bitácora/trazabilidad: registro inmutable de cada acción sobre un objeto."""
    VERBOS = [
        ("CREO", "creó"), ("ACTUALIZO", "actualizó"), ("CAMBIO_ESTADO", "cambió el estado"),
        ("ASIGNO", "asignó"), ("COMENTO", "comentó"), ("CERRO", "cerró"),
        ("REABRIO", "reabrió"), ("ADJUNTO", "adjuntó evidencia"),
        ("APROBO", "aprobó"), ("RECHAZO", "rechazó"), ("VERIFICO", "verificó eficacia"),
    ]
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="actividad_sgc")
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    objeto = GenericForeignKey("content_type", "object_id")
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name="actividad_sgc")
    verbo = models.CharField(max_length=15, choices=VERBOS, default="ACTUALIZO")
    descripcion = models.CharField(max_length=300, blank=True)
    datos = models.JSONField(default=dict, blank=True, help_text="{campo: [antes, despues]}")
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-creado"]
        indexes = [models.Index(fields=["content_type", "object_id"])]


class NotificacionCalidad(models.Model):
    """Notificación in-app dirigida a un usuario del SGC."""
    TIPOS = [
        ("ASIGNACION", "Te asignaron"), ("MENCION", "Te mencionaron"),
        ("COMENTARIO", "Nuevo comentario"), ("VENCIMIENTO", "Vencimiento"),
        ("CAMBIO_ESTADO", "Cambio de estado"), ("APROBACION", "Requiere aprobación"),
        ("INFO", "Información"),
    ]
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="notificaciones_sgc")
    destinatario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notificaciones_sgc")
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="+")
    tipo = models.CharField(max_length=14, choices=TIPOS, default="INFO")
    titulo = models.CharField(max_length=200)
    mensaje = models.TextField(blank=True)
    url = models.CharField(max_length=300, blank=True, help_text="Ruta del frontend al registro")
    content_type = models.ForeignKey(ContentType, on_delete=models.SET_NULL, null=True, blank=True)
    object_id = models.PositiveIntegerField(null=True, blank=True)
    objeto = GenericForeignKey("content_type", "object_id")
    leida = models.BooleanField(default=False)
    creada = models.DateTimeField(auto_now_add=True)
    leida_en = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-creada"]
        indexes = [models.Index(fields=["destinatario", "leida"])]


# ═════════════════════════════════════════════════════════════════════════════
# ENCUESTAS PÚBLICAS (voz del cliente con link compartible)
# ═════════════════════════════════════════════════════════════════════════════
class Encuesta(models.Model):
    """Encuesta/formulario con preguntas configurables y link público.

    `preguntas` es una lista de dicts:
      {"id", "tipo": rating|nps|texto|parrafo|opcion|checkbox|si_no,
       "titulo", "requerido": bool, "opciones": [..]}
    """
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="encuestas")
    token = models.CharField(max_length=24, unique=True, db_index=True)
    titulo = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True)
    preguntas = models.JSONField(default=list, blank=True)
    color = models.CharField(max_length=20, default="#EC4899")
    mensaje_gracias = models.CharField(max_length=300, blank=True, default="¡Gracias por tu respuesta!")
    crear_queja = models.BooleanField(default=True, help_text="Crea un caso en Quejas con cada respuesta")
    activa = models.BooleanField(default=True)
    creado = models.DateTimeField(auto_now_add=True)
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")

    class Meta:
        ordering = ["-creado"]


class RespuestaEncuesta(models.Model):
    encuesta = models.ForeignKey(Encuesta, on_delete=models.CASCADE, related_name="respuestas")
    respuestas = models.JSONField(default=dict, blank=True)
    cliente_nombre = models.CharField(max_length=200, blank=True)
    cliente_email = models.CharField(max_length=200, blank=True)
    satisfaccion = models.PositiveSmallIntegerField(null=True, blank=True, help_text="1-5 derivado")
    nps = models.PositiveSmallIntegerField(null=True, blank=True, help_text="0-10 derivado")
    queja = models.ForeignKey("Queja", on_delete=models.SET_NULL, null=True, blank=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-creado"]


# ═════════════════════════════════════════════════════════════════════════════
# PILAR 2 · TABLERO DE IMPLEMENTACIÓN DEL SGC (Kanban ISO)
# ═════════════════════════════════════════════════════════════════════════════
class TareaImplementacion(models.Model):
    """Tarjeta del tablero para implementar el SGC cláusula por cláusula."""
    COLUMNAS = [
        ("POR_HACER", "Por hacer"), ("EN_PROCESO", "En proceso"),
        ("IMPLEMENTADO", "Implementado"), ("VERIFICADO", "Verificado"),
    ]
    PRIORIDADES = [("BAJA", "Baja"), ("MEDIA", "Media"), ("ALTA", "Alta")]

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="tareas_implementacion")
    requisito = models.ForeignKey(
        RequisitoISO, on_delete=models.SET_NULL, null=True, blank=True, related_name="tareas_impl",
        help_text="Cláusula ISO que esta tarjeta ayuda a cumplir")
    titulo = models.CharField(max_length=300)
    descripcion = models.TextField(blank=True)
    columna = models.CharField(max_length=14, choices=COLUMNAS, default="POR_HACER")
    prioridad = models.CharField(max_length=6, choices=PRIORIDADES, default="MEDIA")
    responsable_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="tareas_impl_asignadas")
    avance = models.PositiveSmallIntegerField(default=0, help_text="0-100")
    fecha_limite = models.DateField(null=True, blank=True)
    orden = models.PositiveIntegerField(default=0)
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["columna", "orden", "id"]

    def recomputar(self, guardar=True):
        """Avance = promedio ponderado de subtareas; al 100 % mueve la tarjeta a
        'Implementado' si seguía pendiente. Sin subtareas conserva su avance."""
        subs = list(self.subtareas.all())
        campos = ["avance"]
        if subs:
            tp = sum(s.peso or 1 for s in subs) or 1
            self.avance = round(sum((s.peso or 1) * s.avance for s in subs) / tp)
            if self.avance >= 100 and self.columna in ("POR_HACER", "EN_PROCESO"):
                self.columna = "IMPLEMENTADO"; campos.append("columna")
            elif self.avance > 0 and self.columna == "POR_HACER":
                self.columna = "EN_PROCESO"; campos.append("columna")
        if guardar:
            self.save(update_fields=campos)
        return self.avance


class SubtareaImplementacion(models.Model):
    """Subtarea de una tarjeta del tablero; su avance ponderado alimenta el de
    la tarjeta padre."""
    tarea = models.ForeignKey(TareaImplementacion, on_delete=models.CASCADE, related_name="subtareas")
    titulo = models.CharField(max_length=300)
    peso = models.PositiveSmallIntegerField(default=1)
    avance = models.PositiveSmallIntegerField(default=0, help_text="0-100")
    responsable_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="subtareas_impl")
    orden = models.PositiveIntegerField(default=0)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["orden", "id"]

    @property
    def completada(self) -> bool:
        return self.avance >= 100


# ═════════════════════════════════════════════════════════════════════════════
# PILAR 3 · CAPA AVANZADO (acciones múltiples + evidencias)
# ═════════════════════════════════════════════════════════════════════════════
class AccionCAPA(models.Model):
    """Acción individual de un plan de acción (una NC tiene varias)."""
    TIPOS = [("INMEDIATA", "Contención/inmediata"), ("CORRECTIVA", "Correctiva"), ("PREVENTIVA", "Preventiva")]
    ESTADOS = [("PENDIENTE", "Pendiente"), ("EN_PROCESO", "En proceso"), ("HECHA", "Realizada"), ("VERIFICADA", "Verificada")]
    EFICACIA = [("PENDIENTE", "Por evaluar"), ("EFICAZ", "Eficaz"), ("NO_EFICAZ", "No eficaz")]

    no_conformidad = models.ForeignKey(NoConformidad, on_delete=models.CASCADE, related_name="acciones")
    descripcion = models.TextField()
    tipo = models.CharField(max_length=12, choices=TIPOS, default="CORRECTIVA")
    responsable_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="acciones_capa")
    fecha_compromiso = models.DateField(null=True, blank=True)
    fecha_real = models.DateField(null=True, blank=True)
    estado = models.CharField(max_length=12, choices=ESTADOS, default="PENDIENTE")
    eficacia = models.CharField(max_length=10, choices=EFICACIA, default="PENDIENTE")
    evidencia = models.TextField(blank=True)
    orden = models.PositiveIntegerField(default=0)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["orden", "id"]


class EvidenciaSGC(models.Model):
    """Archivo de evidencia adjunto a cualquier registro del SGC (genérico)."""
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="evidencias_sgc")
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    objeto = GenericForeignKey("content_type", "object_id")
    archivo = models.FileField(upload_to="sgc/evidencias/")
    nombre = models.CharField(max_length=200, blank=True)
    descripcion = models.CharField(max_length=300, blank=True)
    subido_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="evidencias_sgc")
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-creado"]
        indexes = [models.Index(fields=["content_type", "object_id"])]


# ═════════════════════════════════════════════════════════════════════════════
# PILAR 4 · PROCESOS (SIPOC) + MEDICIONES DE KPI (tendencias)
# ═════════════════════════════════════════════════════════════════════════════
class Proceso(models.Model):
    """Proceso del SGC con su ficha SIPOC; eje que une KPIs, riesgos y auditorías."""
    TIPOS = [("ESTRATEGICO", "Estratégico"), ("CLAVE", "Clave / Operativo"), ("APOYO", "Apoyo")]
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="procesos")
    codigo = models.CharField(max_length=40, blank=True)
    nombre = models.CharField(max_length=200)
    tipo = models.CharField(max_length=12, choices=TIPOS, default="CLAVE")
    objetivo = models.TextField(blank=True)
    dueno_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="procesos_dueno", help_text="Dueño del proceso")
    # SIPOC
    proveedores = models.TextField(blank=True, help_text="Suppliers")
    entradas = models.TextField(blank=True, help_text="Inputs")
    actividades = models.TextField(blank=True, help_text="Process (actividades clave)")
    salidas = models.TextField(blank=True, help_text="Outputs")
    clientes = models.TextField(blank=True, help_text="Customers")
    activo = models.BooleanField(default=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["tipo", "nombre"]

    def __str__(self) -> str:
        return self.nombre


class MedicionKPI(models.Model):
    """Valor histórico de un KPI en una fecha (para graficar la tendencia)."""
    kpi = models.ForeignKey(IndicadorKPI, on_delete=models.CASCADE, related_name="mediciones")
    fecha = models.DateField()
    valor = models.DecimalField(max_digits=14, decimal_places=2)
    nota = models.CharField(max_length=200, blank=True)
    registrado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+")
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["fecha"]
        unique_together = [("kpi", "fecha")]
