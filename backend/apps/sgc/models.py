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
    causa_raiz = models.TextField(blank=True, help_text="Análisis de causa raíz (resumen)")
    # Análisis estructurado: 5 porqués (lista de strings) e Ishikawa
    # (dict por categoría 6M -> lista de causas). Alimentan el Pareto de causas.
    cinco_porques = models.JSONField(default=list, blank=True)
    ishikawa = models.JSONField(default=dict, blank=True)
    categoria_causa = models.CharField(
        max_length=20, blank=True,
        choices=[("METODO", "Método"), ("MAQUINA", "Maquinaria/Equipo"), ("MANO_OBRA", "Mano de obra"),
                 ("MATERIAL", "Material"), ("MEDICION", "Medición"), ("MEDIO", "Medio ambiente")],
        help_text="Categoría 6M de la causa raíz principal (para análisis de Pareto)")
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
    responsable_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="kpis_asignados", help_text="Responsable de mantener el indicador")
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
    participantes = models.TextField(blank=True, help_text="Empleados / puestos (texto libre)")
    # Vínculo a empleados reales de RH (para que aparezca en el portal del empleado).
    empleados = models.ManyToManyField(
        "rh.Empleado", blank=True, related_name="capacitaciones_sgc",
        help_text="Empleados de RH inscritos en esta capacitación")
    fecha = models.DateField(null=True, blank=True)
    vigencia_meses = models.PositiveSmallIntegerField(default=12)
    fecha_vencimiento = models.DateField(null=True, blank=True)
    estado = models.CharField(max_length=12, choices=ESTADOS, default="PROGRAMADA")
    calificacion = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True,
                                       help_text="Calificación general (opcional; las individuales van por participante)")
    requiere_calificacion = models.BooleanField(
        default=True, help_text="Si no aplica, solo se registra asistencia/nombre y evidencia")
    calificacion_minima = models.DecimalField(
        max_digits=5, decimal_places=2, default=70, help_text="Mínima para aprobar")

    class Meta:
        ordering = ["-fecha"]


class ParticipanteCapacitacion(models.Model):
    """Participante de una capacitación con seguimiento individual.

    Contempla todos los casos:
      - Empleado real de RH (FK) o participante externo por nombre libre.
      - Con calificación o solo asistencia (cuando el curso no la requiere).
      - Evidencia/constancia individual (archivo) y estado por persona.
    """
    ESTADOS = [
        ("INSCRITO", "Inscrito"), ("ASISTIO", "Asistió"),
        ("APROBADO", "Aprobado"), ("NO_APROBADO", "No aprobado"), ("AUSENTE", "Ausente"),
    ]
    capacitacion = models.ForeignKey(
        Capacitacion, on_delete=models.CASCADE, related_name="participantes_lista")
    empleado = models.ForeignKey(
        "rh.Empleado", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="participaciones_capacitacion",
        help_text="Empleado de RH (opcional si es externo)")
    nombre = models.CharField(
        max_length=200, blank=True, help_text="Nombre del participante (si no es empleado de RH)")
    calificacion = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    estado = models.CharField(max_length=12, choices=ESTADOS, default="INSCRITO")
    intentos = models.PositiveSmallIntegerField(
        default=1, help_text="Número de veces que ha presentado el curso")
    reprogramado = models.BooleanField(
        default=False, help_text="True si este reprobado ya fue movido a otra edición del curso")
    evidencia = models.FileField(upload_to="sgc/capacitaciones/", blank=True, null=True,
                                 help_text="Constancia / evidencia individual")
    evidencia_nombre = models.CharField(max_length=200, blank=True)
    observaciones = models.CharField(max_length=300, blank=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["nombre", "id"]

    @property
    def nombre_display(self) -> str:
        if self.empleado_id:
            return f"{self.empleado.nombre} {self.empleado.apellido}".strip()
        return self.nombre or "—"

    def evaluar_estado(self, minima):
        """Calcula APROBADO/NO_APROBADO si hay calificación y el curso la requiere."""
        if self.calificacion is None:
            return
        self.estado = "APROBADO" if float(self.calificacion) >= float(minima or 0) else "NO_APROBADO"


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
    responsable_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="evaluaciones_proveedor_asignadas", help_text="Evaluador responsable")
    plan_mejora = models.TextField(blank=True, help_text="Plan de mejora acordado con el proveedor")
    estado = models.CharField(
        max_length=12,
        choices=[("BORRADOR", "Borrador"), ("EVALUADO", "Evaluado"), ("SEGUIMIENTO", "En seguimiento"), ("CERRADO", "Cerrado")],
        default="EVALUADO")
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
    responsable_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="quejas_asignadas", help_text="Responsable de atender la queja")
    fecha_compromiso = models.DateField(null=True, blank=True, help_text="Fecha objetivo de respuesta")
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
    responsable_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="contexto_asignado", help_text="Responsable de la estrategia")

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


# ═════════════════════════════════════════════════════════════════════════════
# CLÁUSULA 8.7 · CONTROL DE SALIDAS NO CONFORMES
# (producto/servicio que no cumple, distinto de una No Conformidad del sistema)
# ═════════════════════════════════════════════════════════════════════════════
class SalidaNoConforme(models.Model):
    """Registro de un producto/servicio no conforme detectado y su disposición.

    ISO 9001 8.7: la organización debe identificar y controlar las salidas que no
    cumplen para prevenir su uso o entrega no intencionada, y tomar acciones de
    disposición (corregir, segregar, devolver, concesión, etc.)."""
    ORIGENES = [
        ("RECEPCION", "Recepción / entrada"),
        ("PROCESO", "Durante el proceso"),
        ("FINAL", "Inspección final"),
        ("CLIENTE", "Detectado por el cliente"),
        ("AUDITORIA", "Auditoría"),
    ]
    DISPOSICIONES = [
        ("CORRECCION", "Corrección / reproceso"),
        ("SEGREGACION", "Segregación / contención"),
        ("DEVOLUCION", "Devolución al proveedor"),
        ("CONCESION", "Aceptación bajo concesión"),
        ("DESECHO", "Desecho / scrap"),
        ("RECLASIFICACION", "Reclasificación"),
    ]
    ESTADOS = [
        ("ABIERTA", "Abierta"),
        ("EN_TRATAMIENTO", "En tratamiento"),
        ("CERRADA", "Cerrada"),
    ]
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="salidas_no_conformes")
    folio = models.CharField(max_length=30, blank=True)
    descripcion = models.TextField(help_text="Qué producto/servicio y por qué no cumple")
    origen = models.CharField(max_length=12, choices=ORIGENES, default="PROCESO")
    proceso_ref = models.ForeignKey(
        "Proceso", on_delete=models.SET_NULL, null=True, blank=True, related_name="salidas_no_conformes")
    cantidad = models.CharField(max_length=60, blank=True, help_text="p.ej. 12 piezas, 3 servicios")
    requisito_incumplido = models.CharField(max_length=300, blank=True)
    disposicion = models.CharField(max_length=15, choices=DISPOSICIONES, default="CORRECCION")
    autorizo_concesion = models.CharField(
        max_length=200, blank=True, help_text="Quién autorizó (si la disposición es concesión)")
    responsable_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="salidas_nc_asignadas", help_text="Responsable del tratamiento")
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="salidas_nc_creadas")
    estado = models.CharField(max_length=15, choices=ESTADOS, default="ABIERTA")
    fecha_deteccion = models.DateField(null=True, blank=True)
    fecha_cierre = models.DateField(null=True, blank=True)
    # Si el problema es recurrente/grave, se eleva a una No Conformidad del sistema.
    no_conformidad = models.ForeignKey(
        NoConformidad, on_delete=models.SET_NULL, null=True, blank=True, related_name="salidas_origen")
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-creado"]

    def save(self, *args, **kwargs):
        if not self.folio and self.empresa_id:
            self.folio = siguiente_folio(SalidaNoConforme, self.empresa, "SNC")
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.folio} · {self.descripcion[:40]}"


# ═════════════════════════════════════════════════════════════════════════════
# ECOSISTEMA DE CERTIFICACIÓN — plantillas, roadmap, programa de auditorías,
# registros, gestión de cambios, comunicación y conocimiento organizacional.
# ═════════════════════════════════════════════════════════════════════════════

# ── #1 · Biblioteca de plantillas ISO (acelera la documentación 7.5) ─────────
class PlantillaDocumento(models.Model):
    """Plantilla ISO lista para usar. Globales (empresa null) o propias.

    Permite a cualquier empresa generar su documentación base con un clic en
    vez de redactar desde cero — el mayor acelerador de la certificación."""
    CATEGORIAS = [
        ("POLITICA", "Política"), ("MANUAL", "Manual"), ("PROCEDIMIENTO", "Procedimiento"),
        ("INSTRUCTIVO", "Instructivo"), ("FORMATO", "Formato"), ("PLAN", "Plan"),
        ("MATRIZ", "Matriz"), ("OTRO", "Otro"),
    ]
    empresa = models.ForeignKey(
        Empresa, on_delete=models.CASCADE, related_name="plantillas_sgc",
        null=True, blank=True, help_text="Null = plantilla global del sistema")
    codigo = models.CharField(max_length=40, blank=True)
    nombre = models.CharField(max_length=200)
    categoria = models.CharField(max_length=15, choices=CATEGORIAS, default="PROCEDIMIENTO")
    clausula = models.CharField(max_length=20, blank=True, help_text="Cláusula ISO que cubre")
    descripcion = models.CharField(max_length=300, blank=True)
    # Contenido con marcadores tipo {{empresa}} que se sustituyen al generar.
    contenido = models.TextField(help_text="Cuerpo del documento, admite {{empresa}}, {{fecha}}, etc.")
    obligatoria = models.BooleanField(default=False, help_text="Documento exigido por la norma")
    orden = models.PositiveSmallIntegerField(default=100)
    activa = models.BooleanField(default=True)

    class Meta:
        ordering = ["orden", "nombre"]

    def __str__(self) -> str:
        return f"{self.nombre} ({self.get_categoria_display()})"


# ── #2 · Roadmap de certificación guiado ─────────────────────────────────────
class HitoCertificacion(models.Model):
    """Hito/tarea dentro de una fase del camino a la certificación.

    El roadmap consta de fases fijas (diagnóstico → documentación → ... →
    certificación); cada empresa avanza marcando sus hitos como completados."""
    FASES = [
        ("DIAGNOSTICO", "1. Diagnóstico inicial"),
        ("PLANEACION", "2. Planeación y liderazgo"),
        ("DOCUMENTACION", "3. Documentación del SGC"),
        ("IMPLEMENTACION", "4. Implementación"),
        ("MEDICION", "5. Medición y seguimiento"),
        ("AUDITORIA_INTERNA", "6. Auditoría interna"),
        ("REVISION_DIRECCION", "7. Revisión por la dirección"),
        ("PREAUDITORIA", "8. Pre-auditoría / acciones"),
        ("CERTIFICACION", "9. Auditoría de certificación"),
    ]
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="hitos_certificacion")
    fase = models.CharField(max_length=20, choices=FASES)
    titulo = models.CharField(max_length=200)
    descripcion = models.CharField(max_length=400, blank=True)
    clausula = models.CharField(max_length=20, blank=True)
    # Ruta interna recomendada para completar el hito (deep-link).
    ruta = models.CharField(max_length=120, blank=True)
    orden = models.PositiveSmallIntegerField(default=100)
    completado = models.BooleanField(default=False)
    fecha_completado = models.DateField(null=True, blank=True)
    responsable_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="hitos_certificacion_asignados")

    class Meta:
        ordering = ["orden", "id"]

    def __str__(self) -> str:
        return f"{self.get_fase_display()} · {self.titulo}"


# ── #4 · Programa anual de auditorías + checklist reutilizable (9.2) ──────────
class ProgramaAuditoria(models.Model):
    """Programa anual de auditorías internas (ISO 9.2.1)."""
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="programas_auditoria")
    anio = models.PositiveIntegerField()
    nombre = models.CharField(max_length=200, blank=True)
    objetivo = models.TextField(blank=True)
    alcance = models.TextField(blank=True)
    criterios = models.CharField(max_length=300, blank=True, help_text="Normas/criterios de referencia")
    responsable_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="programas_auditoria_asignados")
    aprobado = models.BooleanField(default=False)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-anio"]
        unique_together = [("empresa", "anio")]

    def __str__(self) -> str:
        return f"Programa de auditorías {self.anio}"


class PlantillaChecklist(models.Model):
    """Lista de verificación reutilizable para auditar (preguntas por cláusula)."""
    empresa = models.ForeignKey(
        Empresa, on_delete=models.CASCADE, related_name="checklists_auditoria",
        null=True, blank=True, help_text="Null = checklist global")
    nombre = models.CharField(max_length=200)
    descripcion = models.CharField(max_length=300, blank=True)
    norma = models.ForeignKey(Norma, on_delete=models.SET_NULL, null=True, blank=True)
    activa = models.BooleanField(default=True)

    class Meta:
        ordering = ["nombre"]

    def __str__(self) -> str:
        return self.nombre


class ItemChecklist(models.Model):
    """Pregunta/criterio de una lista de verificación."""
    checklist = models.ForeignKey(PlantillaChecklist, on_delete=models.CASCADE, related_name="items")
    clausula = models.CharField(max_length=20, blank=True)
    pregunta = models.TextField()
    guia = models.CharField(max_length=400, blank=True, help_text="Qué evidencia buscar")
    orden = models.PositiveSmallIntegerField(default=100)

    class Meta:
        ordering = ["orden", "id"]


# ── #5 · Gestión de registros con retención (7.5) ────────────────────────────
class RegistroCalidad(models.Model):
    """Lista maestra de registros (evidencia retenida): qué se conserva, dónde,
    cuánto tiempo y cómo se dispone. ISO 9001 7.5.3."""
    SOPORTES = [("DIGITAL", "Digital"), ("FISICO", "Físico"), ("AMBOS", "Ambos")]
    DISPOSICIONES = [("ELIMINAR", "Eliminar"), ("ARCHIVAR", "Archivar"), ("CONSERVAR", "Conservar indefinidamente")]
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="registros_calidad")
    codigo = models.CharField(max_length=40, blank=True)
    nombre = models.CharField(max_length=200)
    proceso = models.CharField(max_length=150, blank=True)
    proceso_ref = models.ForeignKey(
        "Proceso", on_delete=models.SET_NULL, null=True, blank=True, related_name="registros")
    soporte = models.CharField(max_length=10, choices=SOPORTES, default="DIGITAL")
    ubicacion = models.CharField(max_length=200, blank=True, help_text="Dónde se almacena")
    responsable_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="registros_asignados")
    retencion_meses = models.PositiveSmallIntegerField(default=36, help_text="Tiempo de retención (meses)")
    disposicion = models.CharField(max_length=12, choices=DISPOSICIONES, default="ARCHIVAR")
    activo = models.BooleanField(default=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["codigo", "nombre"]

    def __str__(self) -> str:
        return f"{self.codigo} · {self.nombre}"


# ── #6 · Gestión de cambios (6.3) ────────────────────────────────────────────
class GestionCambio(models.Model):
    """Planificación de cambios del SGC (ISO 9001 6.3): por qué, consecuencias,
    recursos, responsables y autorización."""
    ESTADOS = [("PROPUESTO", "Propuesto"), ("APROBADO", "Aprobado"),
               ("EN_PROCESO", "En proceso"), ("IMPLEMENTADO", "Implementado"), ("RECHAZADO", "Rechazado")]
    TIPOS = [
        ("PROCESO", "Proceso"), ("DOCUMENTO", "Documento"), ("INFRAESTRUCTURA", "Infraestructura"),
        ("PROVEEDOR", "Proveedor"), ("ORGANIZACIONAL", "Organizacional"), ("TECNOLOGICO", "Tecnológico"),
        ("PRODUCTO", "Producto/Servicio"), ("OTRO", "Otro"),
    ]
    PRIORIDADES = [("BAJA", "Baja"), ("MEDIA", "Media"), ("ALTA", "Alta"), ("CRITICA", "Crítica")]
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="cambios_sgc")
    folio = models.CharField(max_length=30, blank=True)
    titulo = models.CharField(max_length=200)
    descripcion = models.TextField(help_text="En qué consiste el cambio")
    tipo = models.CharField(max_length=16, choices=TIPOS, default="PROCESO",
                            help_text="Categoría del cambio (para análisis y trazabilidad)")
    prioridad = models.CharField(max_length=8, choices=PRIORIDADES, default="MEDIA")
    justificacion = models.TextField(blank=True, help_text="Propósito y motivo del cambio")
    consecuencias = models.TextField(blank=True, help_text="Consecuencias potenciales")
    recursos = models.TextField(blank=True, help_text="Recursos necesarios")
    impacto_integridad = models.CharField(
        max_length=300, blank=True, help_text="Cómo se preserva la integridad del SGC")
    # Evaluación de riesgo del cambio (matriz 5×5): 0 = no evaluado.
    riesgo_probabilidad = models.PositiveSmallIntegerField(default=0, help_text="Probabilidad 1-5 (0 = sin evaluar)")
    riesgo_impacto = models.PositiveSmallIntegerField(default=0, help_text="Impacto 1-5 (0 = sin evaluar)")
    # Plan de implementación: lista de tareas [{"texto": str, "hecho": bool}].
    plan_accion = models.JSONField(default=list, blank=True)
    responsable_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="cambios_asignados")
    autorizado_por = models.CharField(max_length=150, blank=True)
    fecha_objetivo = models.DateField(null=True, blank=True)
    fecha_implementacion = models.DateField(null=True, blank=True, help_text="Fecha real de implementación")
    estado = models.CharField(max_length=12, choices=ESTADOS, default="PROPUESTO")
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="cambios_creados")
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-creado"]

    def save(self, *args, **kwargs):
        if not self.folio and self.empresa_id:
            self.folio = siguiente_folio(GestionCambio, self.empresa, "CAM")
        super().save(*args, **kwargs)

    @property
    def riesgo_score(self) -> int:
        return int(self.riesgo_probabilidad or 0) * int(self.riesgo_impacto or 0)

    @property
    def nivel_riesgo(self) -> str:
        s = self.riesgo_score
        if s <= 0:
            return "SIN_EVALUAR"
        if s <= 4:
            return "BAJO"
        if s <= 9:
            return "MEDIO"
        if s <= 14:
            return "ALTO"
        return "EXTREMO"

    @property
    def progreso_plan(self) -> int:
        tareas = self.plan_accion or []
        if not isinstance(tareas, list) or not tareas:
            return 0
        hechas = sum(1 for t in tareas if isinstance(t, dict) and t.get("hecho"))
        return round(hechas / len(tareas) * 100)

    def __str__(self) -> str:
        return f"{self.folio} · {self.titulo}"


# ── #6 · Comunicación (7.4) ──────────────────────────────────────────────────
class ComunicacionSGC(models.Model):
    """Matriz de comunicación (ISO 9001 7.4): qué, cuándo, a quién, cómo y quién."""
    DIRECCIONES = [("INTERNA", "Interna"), ("EXTERNA", "Externa"), ("AMBAS", "Ambas")]
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="comunicaciones_sgc")
    que = models.CharField(max_length=250, help_text="Qué se comunica")
    direccion = models.CharField(max_length=10, choices=DIRECCIONES, default="INTERNA")
    cuando = models.CharField(max_length=150, blank=True, help_text="Frecuencia / cuándo")
    a_quien = models.CharField(max_length=250, blank=True, help_text="Audiencia / partes interesadas")
    como = models.CharField(max_length=200, blank=True, help_text="Canal/medio")
    responsable_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="comunicaciones_asignadas")
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ["que"]

    def __str__(self) -> str:
        return self.que


# ── #6 · Conocimiento organizacional (7.1.6) ─────────────────────────────────
class ConocimientoOrganizacional(models.Model):
    """Base de conocimiento y lecciones aprendidas (ISO 9001 7.1.6)."""
    TIPOS = [("LECCION", "Lección aprendida"), ("MEJOR_PRACTICA", "Mejor práctica"),
             ("EXPERIENCIA", "Experiencia"), ("FUENTE_EXTERNA", "Fuente externa"), ("OTRO", "Otro")]
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="conocimiento_sgc")
    titulo = models.CharField(max_length=200)
    tipo = models.CharField(max_length=15, choices=TIPOS, default="LECCION")
    area = models.CharField(max_length=150, blank=True, help_text="Proceso/área relacionada")
    contenido = models.TextField(help_text="Descripción del conocimiento / lección")
    origen = models.CharField(max_length=200, blank=True, help_text="De dónde proviene (NC, proyecto, etc.)")
    etiquetas = models.CharField(max_length=300, blank=True)
    autor_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="conocimiento_aportado")
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-creado"]

    def __str__(self) -> str:
        return self.titulo


# ── Snapshot histórico de madurez (para tendencias del centro de mando) ──────
class SnapshotMadurez(models.Model):
    """Foto periódica de los indicadores clave del SGC, para graficar la
    evolución de la madurez en el tiempo y proyectar la certificación."""
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="snapshots_madurez")
    fecha = models.DateField()
    madurez = models.DecimalField(max_digits=5, decimal_places=1, default=0)
    cumplimiento_iso = models.DecimalField(max_digits=5, decimal_places=1, default=0)
    nc_abiertas = models.PositiveIntegerField(default=0)
    nc_cerradas = models.PositiveIntegerField(default=0)
    riesgos_altos = models.PositiveIntegerField(default=0)
    kpis_en_meta = models.PositiveIntegerField(default=0)
    kpis_total = models.PositiveIntegerField(default=0)
    objetivos_logrados = models.PositiveIntegerField(default=0)
    satisfaccion = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    datos = models.JSONField(default=dict, blank=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["fecha"]
        unique_together = [("empresa", "fecha")]


# ── Respuestas del checklist de una auditoría en ejecución (9.2) ─────────────
class RespuestaChecklistAuditoria(models.Model):
    """Evaluación de un requisito durante la ejecución de una auditoría en vivo.
    Permite marcar conforme/no conforme por punto y generar hallazgos al cerrar."""
    RESULTADOS = [
        ("CONFORME", "Conforme"), ("NO_CONFORME", "No conforme"),
        ("OBSERVACION", "Observación"), ("NA", "No aplica"), ("PENDIENTE", "Pendiente"),
    ]
    auditoria = models.ForeignKey(Auditoria, on_delete=models.CASCADE, related_name="respuestas_checklist")
    requisito = models.ForeignKey(RequisitoISO, on_delete=models.SET_NULL, null=True, blank=True)
    clausula = models.CharField(max_length=20, blank=True)
    pregunta = models.TextField(blank=True)
    resultado = models.CharField(max_length=12, choices=RESULTADOS, default="PENDIENTE")
    nota = models.TextField(blank=True, help_text="Evidencia/observación del auditor")
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["clausula", "id"]
        unique_together = [("auditoria", "requisito")]
