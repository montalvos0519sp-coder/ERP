"""Modulo de Gestion Documental — alineado con ISO 9001.

Componentes:
    - TipoDocumento: clasificacion (Politica, Procedimiento, Instructivo, Formato, Manual, Registro).
      Configurable por empresa (cada empresa define los tipos que aplica).
    - Documento: el documento controlado. Tiene codigo unico, version, vigencia.
    - VersionDocumento: historial de versiones del mismo documento.
    - FlujoAprobacion: configura QUIENES deben aprobar para esta empresa + tipo.
      Soporta: 1 aprobador, varios en paralelo, o flujo secuencial por pasos.
    - PasoFlujo: cada paso del flujo (orden, aprobador o rol).
    - SolicitudAprobacion: instancia de flujo creada al enviar a aprobacion.
    - PasoAprobacion: estado por cada paso de la solicitud.
    - AccesoDocumento: permisos por usuario (ver, descargar).
    - PropuestaMejora: usuario propone cambio, queda en revision por el aprobador.

Cumple ISO 9001 con: codigo controlado, version, fecha de emision, fecha de
revision, vigencia, aprobador identificado, registro de cambios, control de
distribucion (AccesoDocumento), y registro de mejoras (PropuestaMejora).
"""
from __future__ import annotations

import os
import uuid

from django.conf import settings
from django.db import models

from apps.core.models import Empresa


def documento_upload_to(instance, filename: str) -> str:
    """Guarda los archivos como documentos/<empresa_id>/<uuid>/<filename>."""
    ext = os.path.splitext(filename)[1].lower()
    folder_uuid = str(uuid.uuid4())[:12]
    safe_name = filename.replace("/", "_").replace("\\", "_")
    return f"documentos/{instance.empresa_id or 0}/{folder_uuid}/{safe_name}"


def version_upload_to(instance, filename: str) -> str:
    return documento_upload_to(instance.documento, filename)


def propuesta_upload_to(instance, filename: str) -> str:
    safe_name = filename.replace("/", "_").replace("\\", "_")
    return f"documentos/propuestas/{instance.documento.empresa_id or 0}/{uuid.uuid4().hex[:12]}/{safe_name}"


class TipoDocumento(models.Model):
    """Clasificacion ISO 9001 estandar, configurable por empresa.

    Tipos sugeridos (la empresa puede agregar otros):
      - POLITICA: Politica de Calidad, etc.
      - PROCEDIMIENTO: PR-XX procedimientos operativos.
      - INSTRUCTIVO: IT-XX instructivos de trabajo.
      - FORMATO: FR-XX formatos / formularios.
      - MANUAL: MN-XX manuales (de calidad, operacion).
      - REGISTRO: RG-XX registros de calidad.
      - OTRO: catch-all para tipos personalizados.
    """

    CATEGORIA_POLITICA = "POLITICA"
    CATEGORIA_PROCEDIMIENTO = "PROCEDIMIENTO"
    CATEGORIA_INSTRUCTIVO = "INSTRUCTIVO"
    CATEGORIA_FORMATO = "FORMATO"
    CATEGORIA_MANUAL = "MANUAL"
    CATEGORIA_REGISTRO = "REGISTRO"
    CATEGORIA_PLAN = "PLAN"
    CATEGORIA_OTRO = "OTRO"
    CATEGORIA_CHOICES = [
        (CATEGORIA_POLITICA, "Politica"),
        (CATEGORIA_MANUAL, "Manual"),
        (CATEGORIA_PROCEDIMIENTO, "Procedimiento"),
        (CATEGORIA_INSTRUCTIVO, "Instructivo"),
        (CATEGORIA_FORMATO, "Formato"),
        (CATEGORIA_REGISTRO, "Registro"),
        (CATEGORIA_PLAN, "Plan"),
        (CATEGORIA_OTRO, "Otro"),
    ]

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="tipos_documento")
    categoria = models.CharField(max_length=20, choices=CATEGORIA_CHOICES, default=CATEGORIA_PROCEDIMIENTO)
    codigo = models.CharField(
        max_length=10,
        help_text="Prefijo corto. Ej. 'PR' para procedimientos, 'IT' para instructivos.",
    )
    nombre = models.CharField(max_length=120)
    descripcion = models.CharField(max_length=400, blank=True)
    color = models.CharField(max_length=9, default="#3B82F6")
    icono = models.CharField(max_length=40, default="FileText")
    activo = models.BooleanField(default=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("empresa", "codigo")]
        ordering = ["empresa", "categoria", "codigo"]

    def __str__(self) -> str:
        return f"{self.codigo} · {self.nombre}"


class FlujoAprobacion(models.Model):
    """Configuracion del flujo de aprobacion para una empresa + tipo de doc.

    Modos:
      - UNICO: 1 solo aprobador (designado en PasoFlujo orden=1).
      - PARALELO: varios aprobadores, basta con que firme `min_aprobaciones`.
      - SECUENCIAL: pasos en orden estricto; cada uno aprueba para que pase al siguiente.
    """

    MODO_UNICO = "UNICO"
    MODO_PARALELO = "PARALELO"
    MODO_SECUENCIAL = "SECUENCIAL"
    MODO_CHOICES = [
        (MODO_UNICO, "Un solo aprobador"),
        (MODO_PARALELO, "Aprobadores en paralelo"),
        (MODO_SECUENCIAL, "Aprobadores en orden (secuencial)"),
    ]

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="flujos_aprobacion")
    nombre = models.CharField(max_length=120)
    descripcion = models.CharField(max_length=400, blank=True)
    tipo_documento = models.ForeignKey(
        TipoDocumento, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="flujos",
        help_text="Si esta vacio, es un flujo generico que el usuario puede elegir manualmente.",
    )
    modo = models.CharField(max_length=12, choices=MODO_CHOICES, default=MODO_UNICO)
    min_aprobaciones = models.PositiveIntegerField(
        default=1, help_text="Solo aplica en modo PARALELO. Cuantas firmas se necesitan.",
    )
    activo = models.BooleanField(default=True)
    es_default = models.BooleanField(
        default=False,
        help_text="Si es True, este flujo se usa por defecto para su tipo de documento.",
    )
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["empresa", "tipo_documento", "nombre"]

    def __str__(self) -> str:
        return f"{self.nombre} ({self.get_modo_display()})"


class PasoFlujo(models.Model):
    """Un paso del FlujoAprobacion. Especifica QUIEN aprueba en ese paso."""

    flujo = models.ForeignKey(FlujoAprobacion, on_delete=models.CASCADE, related_name="pasos")
    orden = models.PositiveIntegerField(default=1)
    aprobador = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="pasos_flujo",
    )
    obligatorio = models.BooleanField(
        default=True,
        help_text="Si False, el flujo puede avanzar sin este aprobador (modo paralelo).",
    )
    descripcion = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ["flujo", "orden"]
        unique_together = [("flujo", "aprobador")]

    def __str__(self) -> str:
        return f"{self.flujo.nombre} #{self.orden} · {self.aprobador.username}"


class Documento(models.Model):
    """Documento controlado del SGC.

    ISO 9001: cada doc tiene codigo unico, version, fecha de emision, fecha de
    revision proxima, y un responsable. La distribucion controlada se gestiona
    via AccesoDocumento.
    """

    ESTADO_BORRADOR = "BORRADOR"
    ESTADO_EN_REVISION = "EN_REVISION"
    ESTADO_VIGENTE = "VIGENTE"
    ESTADO_OBSOLETO = "OBSOLETO"
    ESTADO_RECHAZADO = "RECHAZADO"
    ESTADO_CHOICES = [
        (ESTADO_BORRADOR, "Borrador"),
        (ESTADO_EN_REVISION, "En revision"),
        (ESTADO_VIGENTE, "Vigente"),
        (ESTADO_OBSOLETO, "Obsoleto"),
        (ESTADO_RECHAZADO, "Rechazado"),
    ]

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="documentos")
    tipo = models.ForeignKey(TipoDocumento, on_delete=models.PROTECT, related_name="documentos")
    # Departamento se toma del modulo RH (apps.rh.Departamento). Lo dejamos como FK string
    # para evitar imports circulares y permitir documentos sin departamento.
    departamento = models.ForeignKey(
        "rh.Departamento", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="documentos",
    )

    codigo = models.CharField(
        max_length=40,
        help_text="Codigo unico del documento. Ej. 'PR-RH-001'.",
    )
    titulo = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True)
    version = models.CharField(max_length=10, default="1.0")
    estado = models.CharField(max_length=15, choices=ESTADO_CHOICES, default=ESTADO_BORRADOR, db_index=True)

    archivo = models.FileField(upload_to=documento_upload_to, blank=True, null=True)
    archivo_nombre_original = models.CharField(max_length=300, blank=True)
    archivo_mime = models.CharField(max_length=120, blank=True)
    archivo_tamano = models.PositiveBigIntegerField(default=0)

    # Fechas ISO 9001
    fecha_emision = models.DateField(null=True, blank=True)
    fecha_aprobacion = models.DateField(null=True, blank=True)
    fecha_proxima_revision = models.DateField(
        null=True, blank=True,
        help_text="Cuando se debe revisar este doc. ISO 9001 recomienda revisiones periodicas.",
    )
    fecha_obsolescencia = models.DateField(null=True, blank=True)

    # Etiquetas para busqueda libre.
    etiquetas = models.CharField(
        max_length=400, blank=True,
        help_text="Separadas por coma. Para busqueda.",
    )

    palabras_clave = models.CharField(max_length=400, blank=True)

    # Audit
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name="documentos_creados",
    )
    aprobado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="documentos_aprobados",
    )
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    # Flujo que aplica
    flujo = models.ForeignKey(
        FlujoAprobacion, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="documentos",
    )

    # Si todos los usuarios de la empresa lo ven (cuando esta VIGENTE).
    visible_para_todos = models.BooleanField(default=True)

    class Meta:
        unique_together = [("empresa", "codigo")]
        ordering = ["-actualizado"]
        indexes = [
            models.Index(fields=["empresa", "estado"]),
            models.Index(fields=["empresa", "tipo"]),
            models.Index(fields=["codigo"]),
        ]

    def __str__(self) -> str:
        return f"{self.codigo} v{self.version} — {self.titulo}"

    @property
    def es_vigente(self) -> bool:
        return self.estado == self.ESTADO_VIGENTE


class VersionDocumento(models.Model):
    """Cada vez que se aprueba una version nueva, se guarda aqui la anterior."""

    documento = models.ForeignKey(Documento, on_delete=models.CASCADE, related_name="versiones")
    version = models.CharField(max_length=10)
    archivo = models.FileField(upload_to=version_upload_to)
    archivo_nombre_original = models.CharField(max_length=300, blank=True)
    archivo_mime = models.CharField(max_length=120, blank=True)
    archivo_tamano = models.PositiveBigIntegerField(default=0)
    fecha_emision = models.DateField(null=True, blank=True)
    fecha_aprobacion = models.DateField(null=True, blank=True)
    aprobado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="versiones_aprobadas",
    )
    notas_cambios = models.TextField(blank=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-creado"]
        unique_together = [("documento", "version")]

    def __str__(self) -> str:
        return f"{self.documento.codigo} v{self.version}"


class SolicitudAprobacion(models.Model):
    """Instancia del flujo de aprobacion para un documento.

    Cuando un usuario envia un Documento a aprobacion, se crea esta solicitud
    con un PasoAprobacion por cada PasoFlujo del flujo asociado.
    """

    ESTADO_PENDIENTE = "PENDIENTE"
    ESTADO_APROBADA = "APROBADA"
    ESTADO_RECHAZADA = "RECHAZADA"
    ESTADO_CANCELADA = "CANCELADA"
    ESTADO_CHOICES = [
        (ESTADO_PENDIENTE, "Pendiente"),
        (ESTADO_APROBADA, "Aprobada"),
        (ESTADO_RECHAZADA, "Rechazada"),
        (ESTADO_CANCELADA, "Cancelada"),
    ]

    documento = models.ForeignKey(Documento, on_delete=models.CASCADE, related_name="solicitudes")
    flujo = models.ForeignKey(FlujoAprobacion, on_delete=models.PROTECT, related_name="solicitudes")
    estado = models.CharField(max_length=12, choices=ESTADO_CHOICES, default=ESTADO_PENDIENTE, db_index=True)
    enviada_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name="solicitudes_doc_enviadas",
    )
    comentario_envio = models.CharField(max_length=600, blank=True)
    fecha_envio = models.DateTimeField(auto_now_add=True)
    fecha_cierre = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-fecha_envio"]

    def __str__(self) -> str:
        return f"Solicitud {self.documento.codigo} ({self.estado})"


class PasoAprobacion(models.Model):
    """Estado de cada paso individual de una SolicitudAprobacion."""

    ESTADO_PENDIENTE = "PENDIENTE"
    ESTADO_APROBADO = "APROBADO"
    ESTADO_RECHAZADO = "RECHAZADO"
    ESTADO_OMITIDO = "OMITIDO"
    ESTADO_CHOICES = [
        (ESTADO_PENDIENTE, "Pendiente"),
        (ESTADO_APROBADO, "Aprobado"),
        (ESTADO_RECHAZADO, "Rechazado"),
        (ESTADO_OMITIDO, "Omitido"),
    ]

    solicitud = models.ForeignKey(SolicitudAprobacion, on_delete=models.CASCADE, related_name="pasos")
    orden = models.PositiveIntegerField(default=1)
    aprobador = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
        related_name="pasos_aprobacion",
    )
    obligatorio = models.BooleanField(default=True)
    estado = models.CharField(max_length=12, choices=ESTADO_CHOICES, default=ESTADO_PENDIENTE, db_index=True)
    comentario = models.CharField(max_length=600, blank=True)
    decidido_en = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["solicitud", "orden"]
        unique_together = [("solicitud", "aprobador")]

    def __str__(self) -> str:
        return f"Paso {self.orden} {self.aprobador.username} ({self.estado})"


class AccesoDocumento(models.Model):
    """Distribucion controlada (ISO 9001 7.5.3).

    Define que usuario puede ver y/o descargar un documento. Si el documento
    tiene `visible_para_todos=True`, no se necesitan accesos individuales.
    """

    documento = models.ForeignKey(Documento, on_delete=models.CASCADE, related_name="accesos")
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="accesos_documentos",
    )
    puede_ver = models.BooleanField(default=True)
    puede_descargar = models.BooleanField(default=True)
    puede_proponer_mejora = models.BooleanField(default=True)
    otorgado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="accesos_otorgados",
    )
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("documento", "usuario")]
        ordering = ["-creado"]

    def __str__(self) -> str:
        return f"{self.documento.codigo} -> {self.usuario.username}"


class PropuestaMejora(models.Model):
    """Un usuario propone un cambio sobre un documento vigente.

    Queda en revision del aprobador designado. Si se acepta, se sube como nueva
    version del documento; si se rechaza, queda registrada como propuesta no
    aceptada (auditoria).
    """

    ESTADO_PENDIENTE = "PENDIENTE"
    ESTADO_ACEPTADA = "ACEPTADA"
    ESTADO_RECHAZADA = "RECHAZADA"
    ESTADO_RETIRADA = "RETIRADA"
    ESTADO_CHOICES = [
        (ESTADO_PENDIENTE, "Pendiente"),
        (ESTADO_ACEPTADA, "Aceptada"),
        (ESTADO_RECHAZADA, "Rechazada"),
        (ESTADO_RETIRADA, "Retirada"),
    ]

    documento = models.ForeignKey(Documento, on_delete=models.CASCADE, related_name="propuestas")
    autor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="propuestas_mejora",
    )
    titulo = models.CharField(max_length=200)
    descripcion = models.TextField()
    # Adjunto opcional con el cambio propuesto (un PDF/Word/archivo).
    archivo_propuesto = models.FileField(upload_to=propuesta_upload_to, blank=True, null=True)
    archivo_nombre_original = models.CharField(max_length=300, blank=True)

    estado = models.CharField(max_length=12, choices=ESTADO_CHOICES, default=ESTADO_PENDIENTE, db_index=True)
    revisado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="propuestas_revisadas",
    )
    comentario_revision = models.CharField(max_length=600, blank=True)
    fecha = models.DateTimeField(auto_now_add=True)
    fecha_revision = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-fecha"]

    def __str__(self) -> str:
        return f"Mejora {self.documento.codigo}: {self.titulo}"
