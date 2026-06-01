from django.db import models
from django.conf import settings


class OrdenMantenimiento(models.Model):
    ESTADOS = [("PROGRAMADA", "Programada"), ("EN_PROCESO", "En proceso"),
               ("COMPLETADA", "Completada"), ("CANCELADA", "Cancelada")]
    TIPOS = [("PREVENTIVO", "Preventivo"), ("CORRECTIVO", "Correctivo")]
    unidad = models.ForeignKey("flota.Unidad", on_delete=models.PROTECT, related_name="ordenes_mantto")
    folio = models.CharField(max_length=40)
    tipo = models.CharField(max_length=15, choices=TIPOS, default="PREVENTIVO")
    fecha_programada = models.DateField()
    fecha_inicio = models.DateField(blank=True, null=True)
    fecha_fin = models.DateField(blank=True, null=True)
    km_unidad = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    estado = models.CharField(max_length=15, choices=ESTADOS, default="PROGRAMADA")
    diagnostico = models.TextField(blank=True)
    costo = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    asignado_a = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True)


class RefaccionUsada(models.Model):
    orden = models.ForeignKey(OrdenMantenimiento, on_delete=models.CASCADE, related_name="refacciones")
    producto = models.ForeignKey("almacen.Producto", on_delete=models.PROTECT)
    cantidad = models.DecimalField(max_digits=10, decimal_places=3, default=1)
    costo_unitario = models.DecimalField(max_digits=12, decimal_places=4, default=0)


# ───────────────────────────────────────────────────────────────────────────────
# Constructor de checklists / formularios de mantenimiento
#
# Un encargado (con acceso al modulo) crea un FLUJO (plantilla) compuesto de
# CAMPOS configurables (texto, numero, foto, etc.) agrupados en secciones
# (checklists). Decide cuales son obligatorios y, en numeros, rangos validos
# (mayor/menor). Asigna el flujo a uno o varios TECNICOS. Cada tecnico, desde su
# celular, crea una RESPUESTA llenando los campos; cada valor se guarda en
# ValorCampo (incluida la foto). Todo queda resguardado para consulta posterior.
# ───────────────────────────────────────────────────────────────────────────────
class FlujoChecklist(models.Model):
    empresa = models.ForeignKey(
        "core.Empresa", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="flujos_checklist",
    )
    nombre = models.CharField(max_length=160)
    descripcion = models.TextField(blank=True)
    activo = models.BooleanField(default=True)
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name="flujos_checklist_creados",
    )
    tecnicos = models.ManyToManyField(
        settings.AUTH_USER_MODEL, blank=True,
        related_name="flujos_checklist_asignados",
        help_text="Usuarios (tecnicos) que pueden llenar este flujo.",
    )
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-actualizado"]

    def __str__(self) -> str:
        return self.nombre


class CampoChecklist(models.Model):
    TIPO_TEXTO = "texto"
    TIPO_PARRAFO = "parrafo"
    TIPO_NUMERO = "numero"
    TIPO_BOOLEANO = "booleano"
    TIPO_SELECCION = "seleccion"
    TIPO_FOTO = "foto"
    TIPO_FECHA = "fecha"
    # Campos especiales que leen/actualizan el catalogo de flota:
    TIPO_UNIDAD = "unidad"        # selecciona una Unidad (sujeto del formulario)
    TIPO_KM_UNIDAD = "km_unidad"  # numero; al enviar actualiza Unidad.km_actual
    TIPO_TERMO = "termo"          # selecciona/registra el termo de la unidad
    TIPO_HORAS_TERMO = "horas_termo"  # numero; actualiza Termo.horas_actual
    TIPOS = [
        (TIPO_TEXTO, "Texto corto"),
        (TIPO_PARRAFO, "Texto largo"),
        (TIPO_NUMERO, "Numero"),
        (TIPO_BOOLEANO, "Si / No"),
        (TIPO_SELECCION, "Seleccion"),
        (TIPO_FOTO, "Foto"),
        (TIPO_FECHA, "Fecha"),
        (TIPO_UNIDAD, "Unidad (flota)"),
        (TIPO_KM_UNIDAD, "Km de la unidad (actualiza catalogo)"),
        (TIPO_TERMO, "Termo"),
        (TIPO_HORAS_TERMO, "Horas del termo (actualiza catalogo)"),
    ]

    flujo = models.ForeignKey(FlujoChecklist, on_delete=models.CASCADE, related_name="campos")
    # Clave estable del campo dentro del flujo (no cambia al reordenar/editar);
    # sirve para que otros campos dependan de este de forma confiable.
    clave = models.CharField(max_length=40, blank=True)
    seccion = models.CharField(max_length=120, blank=True, help_text="Agrupa campos como un checklist.")
    etiqueta = models.CharField(max_length=200)
    tipo = models.CharField(max_length=15, choices=TIPOS, default=TIPO_TEXTO)
    obligatorio = models.BooleanField(default=False)
    orden = models.PositiveIntegerField(default=0)
    ayuda = models.CharField(max_length=300, blank=True)
    # Opciones para tipo=seleccion (lista de strings).
    opciones = models.JSONField(default=list, blank=True)
    # Validacion condicional para tipo=numero (rango valido).
    min_valor = models.FloatField(null=True, blank=True)
    max_valor = models.FloatField(null=True, blank=True)
    # Visibilidad condicional: este campo solo se muestra/valida si el campo
    # con clave `depende_de` tiene el valor `mostrar_si`. Para booleanos el valor
    # es "si"/"no"; para seleccion, la opcion exacta.
    depende_de = models.CharField(max_length=40, blank=True)
    mostrar_si = models.CharField(max_length=120, blank=True)

    # Foto adjunta al propio campo (ademas de su valor). El creador decide cuando
    # se pide: "" = nunca, "siempre", "si_si" (cuando el Si/No es Si), "si_no".
    FOTO_NO = ""
    FOTO_SIEMPRE = "siempre"
    FOTO_SI_SI = "si_si"
    FOTO_SI_NO = "si_no"
    FOTO_APLICA_CHOICES = [
        (FOTO_NO, "No pedir foto"),
        (FOTO_SIEMPRE, "Siempre"),
        (FOTO_SI_SI, "Solo si responde Si"),
        (FOTO_SI_NO, "Solo si responde No"),
    ]
    foto_aplica = models.CharField(max_length=10, blank=True, default="", choices=FOTO_APLICA_CHOICES)
    foto_obligatoria = models.BooleanField(default=False)

    class Meta:
        ordering = ["orden", "id"]

    def __str__(self) -> str:
        return f"{self.flujo_id} · {self.etiqueta}"


class RespuestaChecklist(models.Model):
    flujo = models.ForeignKey(FlujoChecklist, on_delete=models.CASCADE, related_name="respuestas")
    tecnico = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name="respuestas_checklist",
    )
    orden = models.ForeignKey(
        OrdenMantenimiento, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="respuestas_checklist",
    )
    # Contexto de flota: unidad/termo a los que se refirio esta respuesta
    # (cuando el flujo incluye campos de tipo unidad/termo).
    unidad = models.ForeignKey(
        "flota.Unidad", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="respuestas_checklist",
    )
    termo = models.ForeignKey(
        "flota.Termo", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="respuestas_checklist",
    )
    nota = models.CharField(max_length=400, blank=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-creado"]

    def __str__(self) -> str:
        return f"Respuesta #{self.pk} de {self.flujo_id}"


def valor_foto_upload_to(instance: "ValorCampo", filename: str) -> str:
    return f"mantenimiento/checklist/{instance.respuesta.flujo_id}/{filename}"


class ValorCampo(models.Model):
    respuesta = models.ForeignKey(RespuestaChecklist, on_delete=models.CASCADE, related_name="valores")
    campo = models.ForeignKey(CampoChecklist, on_delete=models.CASCADE, related_name="valores")
    texto = models.TextField(blank=True)
    numero = models.FloatField(null=True, blank=True)
    booleano = models.BooleanField(null=True, blank=True)
    foto = models.ImageField(upload_to=valor_foto_upload_to, null=True, blank=True)

    class Meta:
        unique_together = ("respuesta", "campo")

    def __str__(self) -> str:
        return f"{self.respuesta_id} · campo {self.campo_id}"


# ───────────────────────────────────────────────────────────────────────────────
# Flujo de trabajo multi-etapa (Proceso)
#
# Un Proceso es una SECUENCIA de etapas. Cada etapa usa un checklist
# (FlujoChecklist) y la llenan ciertos usuarios. Al INICIAR un proceso se crea
# una Ejecucion con sus EtapaEjecucion: la primera queda ACTIVA y el resto
# PENDIENTE. Cuando los usuarios de la etapa activa la completan, se habilita
# (ACTIVA) la siguiente etapa para SUS usuarios. Asi se encadenan los checklists.
# ───────────────────────────────────────────────────────────────────────────────
class Proceso(models.Model):
    empresa = models.ForeignKey(
        "core.Empresa", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="procesos_mantto",
    )
    nombre = models.CharField(max_length=160)
    descripcion = models.TextField(blank=True)
    activo = models.BooleanField(default=True)
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name="procesos_creados",
    )
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-actualizado"]

    def __str__(self) -> str:
        return self.nombre


class EtapaProceso(models.Model):
    """Definicion de una etapa dentro de un proceso (plantilla)."""
    proceso = models.ForeignKey(Proceso, on_delete=models.CASCADE, related_name="etapas")
    orden = models.PositiveIntegerField(default=0)
    nombre = models.CharField(max_length=160, blank=True)
    checklist = models.ForeignKey(
        FlujoChecklist, on_delete=models.PROTECT, related_name="etapas_proceso",
    )
    tecnicos = models.ManyToManyField(
        settings.AUTH_USER_MODEL, blank=True, related_name="etapas_proceso_asignadas",
        help_text="Usuarios que llenan esta etapa.",
    )

    class Meta:
        ordering = ["orden", "id"]

    def __str__(self) -> str:
        return f"{self.proceso_id} · etapa {self.orden}: {self.nombre or self.checklist.nombre}"


class EjecucionProceso(models.Model):
    EN_CURSO = "EN_CURSO"
    COMPLETADO = "COMPLETADO"
    CANCELADO = "CANCELADO"
    ESTADOS = [
        (EN_CURSO, "En curso"),
        (COMPLETADO, "Completado"),
        (CANCELADO, "Cancelado"),
    ]
    proceso = models.ForeignKey(Proceso, on_delete=models.CASCADE, related_name="ejecuciones")
    etiqueta = models.CharField(max_length=200, blank=True,
                                help_text="Referencia de la corrida (ej. unidad, folio).")
    estado = models.CharField(max_length=12, choices=ESTADOS, default=EN_CURSO, db_index=True)
    iniciado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name="ejecuciones_iniciadas",
    )
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-creado"]

    def __str__(self) -> str:
        return f"{self.proceso_id} · ejecucion #{self.pk} ({self.estado})"


class EtapaEjecucion(models.Model):
    PENDIENTE = "PENDIENTE"
    ACTIVA = "ACTIVA"
    COMPLETADA = "COMPLETADA"
    ESTADOS = [
        (PENDIENTE, "Pendiente"),
        (ACTIVA, "Activa"),
        (COMPLETADA, "Completada"),
    ]
    ejecucion = models.ForeignKey(EjecucionProceso, on_delete=models.CASCADE, related_name="etapas")
    etapa = models.ForeignKey(EtapaProceso, on_delete=models.SET_NULL, null=True, blank=True)
    orden = models.PositiveIntegerField(default=0)
    nombre = models.CharField(max_length=160, blank=True)
    # Snapshot del checklist y de los tecnicos al momento de iniciar.
    checklist = models.ForeignKey(
        FlujoChecklist, on_delete=models.SET_NULL, null=True, related_name="etapas_ejecucion",
    )
    tecnicos = models.ManyToManyField(
        settings.AUTH_USER_MODEL, blank=True, related_name="etapas_ejecucion_asignadas",
    )
    estado = models.CharField(max_length=12, choices=ESTADOS, default=PENDIENTE, db_index=True)
    respuesta = models.ForeignKey(
        RespuestaChecklist, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="etapa_ejecucion",
    )
    completado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="etapas_completadas",
    )
    completado_en = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["orden", "id"]

    def __str__(self) -> str:
        return f"ejec {self.ejecucion_id} · etapa {self.orden} ({self.estado})"
