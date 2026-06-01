"""Modelos del modulo de Nomina (calculo + CFDI 4.0 + Complemento Nomina 1.2).

Arquitectura:

    ConfigNominaEmpresa --(1:1)-- Empresa
    PeriodoNomina (semanal/quincenal/mensual...)
        +-- NominaEmpleado (un recibo por empleado en el periodo)
              +-- ConceptoNomina (renglones: percepcion/deduccion/otro)
              +-- IncidenciaNomina (incapacidades, faltas, horas extra)
              +-- CFDINomina (resultado del timbrado contra el PAC)

Validaciones SAT criticas:
  - Total neto >= 0
  - Receptor.regimen_fiscal compatible (605 Sueldos por defecto)
  - UsoCFDI = CN01
  - Fecha de emision dentro del rango del periodo
  - Catalogos SAT correctos (no texto libre)
"""
from __future__ import annotations

from decimal import Decimal
from django.conf import settings
from django.db import models

from apps.core.models import Empresa
from apps.rh.models import Empleado


# ──────────────────────────────────────────────────────────────────────────
# Configuracion fiscal por empresa (PAC + datos patronales)
# ──────────────────────────────────────────────────────────────────────────
class ConfigNominaEmpresa(models.Model):
    """Credenciales del PAC + datos patronales necesarios para timbrar.

    Cada Empresa debe llenar esta config antes de poder timbrar nominas.
    """

    PROVEEDOR = [("FACTURA_COM", "Factura.com"), ("OTRO", "Otro PAC")]

    empresa = models.OneToOneField(Empresa, on_delete=models.CASCADE, related_name="config_nomina")

    # ── PAC ────────────────────────────────────────────────────────────────
    proveedor = models.CharField(max_length=20, choices=PROVEEDOR, default="FACTURA_COM")
    pac_api_key = models.CharField(max_length=200, blank=True,
        help_text="F-PLUGIN-API-KEY (o similar) del PAC")
    pac_secret_key = models.CharField(max_length=200, blank=True,
        help_text="F-PLUGIN-SECRET-KEY del PAC")
    pac_endpoint = models.URLField(default="https://sandbox.factura.com",
        help_text="URL base del PAC (sandbox o produccion)")
    pac_sandbox = models.BooleanField(default=True)

    # ── Datos patronales (van en el nodo Nomina/Emisor del CFDI) ─────────
    registro_patronal = models.CharField(max_length=20, blank=True,
        help_text="Numero IMSS de registro patronal")
    rfc_patron_origen = models.CharField(max_length=13, blank=True)
    riesgo_puesto_default = models.CharField(max_length=2, default="1",
        help_text="Clave c_RiesgoPuesto por defecto si el puesto no lo define")
    serie_default = models.CharField(max_length=10, default="N")
    folio_actual = models.PositiveIntegerField(default=1,
        help_text="Folio interno para CFDI de nomina; se incrementa solo")

    # CSD opcionales (subir .cer/.key si el PAC requiere firma local; Factura.com
    # los acepta en su panel y firma server-side asi que es opcional).
    csd_cer_file = models.FileField(upload_to="csd/", blank=True, null=True)
    csd_key_file = models.FileField(upload_to="csd/", blank=True, null=True)
    csd_password = models.CharField(max_length=200, blank=True)

    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Configuracion de nomina (PAC)"
        verbose_name_plural = "Configuracion de nomina (PAC)"

    def __str__(self) -> str:
        amb = "SANDBOX" if self.pac_sandbox else "PROD"
        return f"{self.empresa} · {self.get_proveedor_display()} ({amb})"


# ──────────────────────────────────────────────────────────────────────────
# Periodos de nomina
# ──────────────────────────────────────────────────────────────────────────
class PeriodoNomina(models.Model):
    """Un periodo de nomina (p.ej. quincena del 1-15 Mayo)."""

    TIPO_NOMINA = [("O", "Ordinaria"), ("E", "Extraordinaria")]
    ESTATUS = [
        ("ABIERTO", "Abierto · capturando"),
        ("CALCULADO", "Calculado · listo para timbrar"),
        ("TIMBRADO", "Timbrado"),
        ("CANCELADO", "Cancelado"),
    ]

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="periodos_nomina")
    nombre = models.CharField(max_length=120, help_text="Ej: '1ra quincena Mayo 2026'")
    tipo_nomina = models.CharField(max_length=1, choices=TIPO_NOMINA, default="O")
    periodicidad_pago = models.CharField(max_length=4, default="04",
        help_text="Clave c_PeriodicidadPago: 02 Semanal, 04 Quincenal, 05 Mensual")
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    fecha_pago = models.DateField()
    num_dias_pagados = models.PositiveIntegerField(default=15)
    estatus = models.CharField(max_length=12, choices=ESTATUS, default="ABIERTO")
    descripcion = models.CharField(max_length=300, blank=True)
    creado = models.DateTimeField(auto_now_add=True)
    creado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        blank=True, null=True, related_name="periodos_creados")
    cerrado_en = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["-fecha_pago", "-fecha_inicio"]
        verbose_name = "Periodo de nomina"
        verbose_name_plural = "Periodos de nomina"

    def __str__(self) -> str:
        return f"{self.nombre} · {self.fecha_inicio:%Y-%m-%d}-{self.fecha_fin:%Y-%m-%d}"


# ──────────────────────────────────────────────────────────────────────────
# Recibo de nomina por empleado en el periodo
# ──────────────────────────────────────────────────────────────────────────
class NominaEmpleado(models.Model):
    """Recibo de nomina de un empleado dentro de un periodo.

    Equivale a 1 CFDI cuando se timbra. La suma de sus conceptos forma
    Total Percepciones - Total Deducciones + Total Otros Pagos = Neto.
    """

    periodo = models.ForeignKey(PeriodoNomina, on_delete=models.CASCADE, related_name="recibos")
    empleado = models.ForeignKey(Empleado, on_delete=models.PROTECT, related_name="recibos_nomina")

    # Datos del recibo
    dias_pagados = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0"))
    salario_diario = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    salario_diario_integrado = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"),
        help_text="SDI: salario diario integrado (incluye prestaciones)")
    salario_base_cot_apor = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"),
        help_text="SBC: salario base de cotizacion para IMSS")

    # Totales calculados
    total_percepciones = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    total_deducciones = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    total_otros_pagos = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    total_neto = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    total_gravado = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    total_exento = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))

    observaciones = models.TextField(blank=True)
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [("periodo", "empleado")]
        ordering = ["empleado__nombre"]
        verbose_name = "Recibo de nomina"
        verbose_name_plural = "Recibos de nomina"

    def __str__(self) -> str:
        return f"{self.empleado} · {self.periodo.nombre}"

    def recalcular(self):
        """Suma percepciones / deducciones / otros y actualiza totales + neto."""
        per = self.conceptos.filter(tipo="P").aggregate(
            t=models.Sum("importe"), g=models.Sum("importe_gravado"), e=models.Sum("importe_exento"))
        ded = self.conceptos.filter(tipo="D").aggregate(t=models.Sum("importe"))
        otr = self.conceptos.filter(tipo="O").aggregate(t=models.Sum("importe"))
        self.total_percepciones = per["t"] or Decimal("0")
        self.total_gravado = per["g"] or Decimal("0")
        self.total_exento = per["e"] or Decimal("0")
        self.total_deducciones = ded["t"] or Decimal("0")
        self.total_otros_pagos = otr["t"] or Decimal("0")
        self.total_neto = self.total_percepciones - self.total_deducciones + self.total_otros_pagos
        self.save(update_fields=[
            "total_percepciones", "total_gravado", "total_exento",
            "total_deducciones", "total_otros_pagos", "total_neto",
        ])


class ConceptoNomina(models.Model):
    """Renglon del recibo: percepcion, deduccion u otro pago."""

    TIPO = [("P", "Percepcion"), ("D", "Deduccion"), ("O", "Otro pago")]

    nomina = models.ForeignKey(NominaEmpleado, on_delete=models.CASCADE, related_name="conceptos")
    tipo = models.CharField(max_length=1, choices=TIPO)
    clave_sat = models.CharField(max_length=4,
        help_text="c_TipoPercepcion / c_TipoDeduccion / c_TipoOtroPago")
    clave_local = models.CharField(max_length=20, blank=True,
        help_text="Clave interna de la empresa para este concepto")
    concepto = models.CharField(max_length=200)
    importe_gravado = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    importe_exento = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    importe = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))

    class Meta:
        ordering = ["tipo", "clave_sat"]

    def save(self, *args, **kwargs):
        # Para percepciones, importe = gravado + exento si se capturaron separados.
        if self.tipo == "P" and (self.importe_gravado or self.importe_exento) and not self.importe:
            self.importe = (self.importe_gravado or Decimal("0")) + (self.importe_exento or Decimal("0"))
        super().save(*args, **kwargs)


class IncidenciaNomina(models.Model):
    """Incapacidades, faltas, horas extra que afectan el calculo."""

    TIPO = [
        ("INCAP", "Incapacidad"),
        ("FALTA", "Falta"),
        ("HE_DOBLE", "Hora extra doble"),
        ("HE_TRIPLE", "Hora extra triple"),
        ("VAC", "Vacaciones"),
    ]
    TIPO_INCAP_SAT = [
        ("01", "Riesgo de trabajo"),
        ("02", "Enfermedad general"),
        ("03", "Maternidad"),
    ]

    nomina = models.ForeignKey(NominaEmpleado, on_delete=models.CASCADE, related_name="incidencias")
    tipo = models.CharField(max_length=10, choices=TIPO)
    tipo_incapacidad_sat = models.CharField(max_length=2, choices=TIPO_INCAP_SAT, blank=True)
    dias = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0"))
    horas = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("0"))
    importe = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    motivo = models.CharField(max_length=200, blank=True)


# ──────────────────────────────────────────────────────────────────────────
# CFDI Nomina (resultado del timbrado)
# ──────────────────────────────────────────────────────────────────────────
class CFDINomina(models.Model):
    """CFDI 4.0 con complemento Nomina 1.2 generado para un recibo."""

    ESTATUS = [
        ("BORRADOR", "Borrador"),
        ("TIMBRADO", "Timbrado · vigente"),
        ("CANCELADO", "Cancelado"),
        ("ERROR", "Error al timbrar"),
    ]
    MOTIVOS_CANC = [
        ("01", "01 · Comprobante con errores con relacion"),
        ("02", "02 · Comprobante con errores sin relacion"),
        ("03", "03 · No se llevo a cabo la operacion"),
        ("04", "04 · Operacion nominativa relacionada en factura global"),
    ]

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="cfdi_nomina")
    nomina_empleado = models.OneToOneField(NominaEmpleado, on_delete=models.PROTECT, related_name="cfdi_obj")

    # Identificadores
    serie = models.CharField(max_length=10, default="N")
    folio = models.CharField(max_length=20, blank=True)
    uuid = models.CharField(max_length=40, blank=True, db_index=True)

    # Sello SAT y trazabilidad
    fecha_timbrado = models.DateTimeField(blank=True, null=True)
    sello_sat = models.TextField(blank=True)
    sello_cfdi = models.TextField(blank=True)
    cadena_original = models.TextField(blank=True)
    no_certificado_sat = models.CharField(max_length=40, blank=True)

    # Archivos
    xml = models.TextField(blank=True, help_text="XML completo timbrado por el PAC")
    pdf_url = models.URLField(blank=True)
    qr_url = models.URLField(blank=True)

    # Estado
    estatus = models.CharField(max_length=12, choices=ESTATUS, default="BORRADOR")
    motivo_cancelacion = models.CharField(max_length=2, choices=MOTIVOS_CANC, blank=True)
    folio_sustituye = models.CharField(max_length=40, blank=True,
        help_text="UUID del CFDI que sustituye (motivo 01)")
    error_pac = models.TextField(blank=True)
    respuesta_pac = models.JSONField(default=dict, blank=True)

    creado = models.DateTimeField(auto_now_add=True)
    creado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        blank=True, null=True, related_name="cfdi_nomina_creados")
    timbrado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        blank=True, null=True, related_name="cfdi_nomina_timbrados")
    cancelado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        blank=True, null=True, related_name="cfdi_nomina_cancelados")
    fecha_cancelacion = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["-creado"]
        verbose_name = "CFDI de nomina"
        verbose_name_plural = "CFDI de nomina"

    def __str__(self) -> str:
        return f"CFDI {self.serie}-{self.folio} · {self.uuid or 'sin UUID'} · {self.estatus}"


# ──────────────────────────────────────────────────────────────────────────
# Bitacora fiscal (auditoria de timbrados / cancelaciones)
# ──────────────────────────────────────────────────────────────────────────
class BitacoraFiscalNomina(models.Model):
    """Registra cada llamada al PAC para auditoria."""

    ACCION = [
        ("TIMBRAR", "Timbrar"),
        ("CANCELAR", "Cancelar"),
        ("CONSULTAR", "Consultar"),
        ("DESCARGAR", "Descargar"),
    ]

    cfdi = models.ForeignKey(CFDINomina, on_delete=models.CASCADE, related_name="bitacora")
    accion = models.CharField(max_length=12, choices=ACCION)
    exitoso = models.BooleanField(default=True)
    request_body = models.JSONField(default=dict, blank=True)
    response_body = models.JSONField(default=dict, blank=True)
    error = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        blank=True, null=True, related_name="bitacora_nomina")

    class Meta:
        ordering = ["-timestamp"]
        verbose_name = "Bitacora fiscal nomina"
        verbose_name_plural = "Bitacora fiscal nomina"
