"""Modelos de facturacion CFDI 4.0.

Todo el modulo es multi-empresa: cada factura, serie, cliente y producto
pertenece a una Empresa especifica (FK obligatoria). El emisor y PAC se
toman de ConfiguracionEmpresa.
"""
from __future__ import annotations

from django.conf import settings
from django.db import models

from apps.core.models import Empresa


class Cliente(models.Model):
    """Cliente receptor de CFDI. Configurable 100% desde la UI."""

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="clientes")
    rfc = models.CharField(max_length=13)
    razon_social = models.CharField(max_length=255)
    nombre_comercial = models.CharField(max_length=255, blank=True)
    regimen_fiscal = models.CharField(max_length=10, blank=True)
    cp_fiscal = models.CharField(max_length=10, blank=True)
    uso_cfdi_default = models.CharField(max_length=10, blank=True, default="G03")
    email = models.EmailField(blank=True)
    telefono = models.CharField(max_length=30, blank=True)
    direccion = models.CharField(max_length=300, blank=True)
    # ── Domicilio fiscal desglosado (autocompletado por CP del catálogo SAT) ──
    calle = models.CharField(max_length=200, blank=True)
    num_ext = models.CharField(max_length=20, blank=True)
    num_int = models.CharField(max_length=20, blank=True)
    colonia = models.CharField(max_length=200, blank=True)
    municipio = models.CharField(max_length=200, blank=True)
    estado = models.CharField(max_length=100, blank=True)
    pais = models.CharField(max_length=10, blank=True, default="MEX")
    # UID asignado por el PAC (cuando se sincroniza).
    uid_pac = models.CharField(max_length=50, blank=True)
    activo = models.BooleanField(default=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("empresa", "rfc")]
        ordering = ["razon_social"]

    def __str__(self) -> str:
        return f"{self.rfc} · {self.razon_social}"


class ProductoServicio(models.Model):
    """Catalogo interno de productos/servicios de la empresa para facturar."""

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="productos")
    codigo_interno = models.CharField(max_length=40, blank=True)
    descripcion = models.CharField(max_length=300)
    clave_prod_serv = models.CharField(max_length=15)
    clave_unidad = models.CharField(max_length=6)
    unidad_descripcion = models.CharField(max_length=80, blank=True)
    precio_unitario = models.DecimalField(max_digits=14, decimal_places=4, default=0)
    objeto_imp = models.CharField(max_length=4, default="02",
                                  help_text="01=No objeto, 02=Si objeto, 03=Si objeto y no obligado")
    tasa_iva = models.DecimalField(max_digits=6, decimal_places=4, default=0.16)
    aplica_retencion_isr = models.BooleanField(default=False)
    aplica_retencion_iva = models.BooleanField(default=False)
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ["descripcion"]
        unique_together = [("empresa", "codigo_interno")]

    def __str__(self) -> str:
        return f"{self.descripcion} · {self.clave_prod_serv}"


class Serie(models.Model):
    """Serie/folio de CFDI por empresa. Mapea letra -> id en el PAC."""

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="series")
    letra = models.CharField(max_length=10)
    descripcion = models.CharField(max_length=120, blank=True)
    tipo_comprobante = models.CharField(
        max_length=2,
        choices=[("I", "Ingreso"), ("E", "Egreso"), ("T", "Traslado"),
                 ("N", "Nomina"), ("P", "Pago")],
        default="I",
    )
    requiere_carta_porte = models.BooleanField(default=False)
    pac_serie_id = models.CharField(max_length=40, blank=True,
                                    help_text="ID de la serie en el PAC (Factura.com)")
    folio_actual = models.PositiveIntegerField(default=1)
    activa = models.BooleanField(default=True)

    class Meta:
        unique_together = [("empresa", "letra")]
        ordering = ["empresa", "letra"]

    def __str__(self) -> str:
        return f"{self.letra} · {self.empresa.nombre_comercial}"


ESTADOS_FACTURA = [
    ("BORRADOR", "Borrador"),
    ("TIMBRADA", "Timbrada"),
    ("CANCELADA", "Cancelada"),
    ("ERROR", "Error al timbrar"),
]


class Factura(models.Model):
    """CFDI 4.0 emitido (ingreso/egreso/traslado/pago)."""

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="facturas")
    serie = models.ForeignKey(Serie, on_delete=models.PROTECT, related_name="facturas")
    folio = models.PositiveIntegerField()
    cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT, related_name="facturas")
    fecha_emision = models.DateTimeField(auto_now_add=True)
    fecha_timbrado = models.DateTimeField(blank=True, null=True)

    tipo_comprobante = models.CharField(max_length=2, default="I")
    moneda = models.CharField(max_length=3, default="MXN")
    tipo_cambio = models.DecimalField(max_digits=10, decimal_places=4, default=1)
    forma_pago = models.CharField(max_length=5, default="99")
    metodo_pago = models.CharField(max_length=5, default="PUE")
    uso_cfdi = models.CharField(max_length=10, default="G03")
    lugar_expedicion = models.CharField(max_length=10, blank=True)
    condiciones_pago = models.CharField(max_length=200, blank=True)

    # CFDI relacionados (notas de crédito, sustituciones). tipo_relacion 01 =
    # Nota de crédito de los documentos relacionados, 04 = Sustitución, etc.
    tipo_relacion = models.CharField(max_length=2, blank=True)
    factura_relacionada = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="notas_credito",
    )

    subtotal = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    descuento = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    iva_trasladado = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    iva_retenido = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    isr_retenido = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    # Resultado del PAC
    estado = models.CharField(max_length=15, choices=ESTADOS_FACTURA, default="BORRADOR")
    folio_fiscal = models.CharField(max_length=64, blank=True, help_text="UUID SAT")
    pac_uid = models.CharField(max_length=64, blank=True)
    pac_serie_id = models.CharField(max_length=40, blank=True)
    xml = models.FileField(upload_to="facturas/xml/", blank=True, null=True)
    pdf = models.FileField(upload_to="facturas/pdf/", blank=True, null=True)
    motivo_cancelacion = models.CharField(max_length=10, blank=True)
    folio_sustitucion = models.CharField(max_length=64, blank=True)
    log_pac = models.JSONField(default=dict, blank=True)

    creado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                   blank=True, null=True, related_name="facturas_creadas")
    actualizado = models.DateTimeField(auto_now=True)

    # Carta Porte (opcional, se llena cuando aplica)
    carta_porte = models.OneToOneField(
        "carta_porte.CartaPorte",
        on_delete=models.SET_NULL, blank=True, null=True,
        related_name="factura",
    )

    class Meta:
        unique_together = [("empresa", "serie", "folio")]
        ordering = ["-fecha_emision"]

    def __str__(self) -> str:
        return f"{self.serie.letra}{self.folio} · {self.cliente.rfc} · {self.estado}"

    def recalcular_totales(self) -> None:
        from decimal import Decimal

        subtotal = Decimal("0")
        iva_t = Decimal("0")
        iva_r = Decimal("0")
        isr_r = Decimal("0")
        for c in self.conceptos.all():
            base = (c.cantidad * c.precio_unitario) - c.descuento
            subtotal += base
            if c.tasa_iva:
                iva_t += base * c.tasa_iva
            if c.retencion_iva:
                iva_r += base * c.retencion_iva
            if c.retencion_isr:
                isr_r += base * c.retencion_isr
        self.subtotal = subtotal
        self.iva_trasladado = iva_t
        self.iva_retenido = iva_r
        self.isr_retenido = isr_r
        self.total = subtotal + iva_t - iva_r - isr_r - self.descuento
        self.save(update_fields=["subtotal", "iva_trasladado", "iva_retenido",
                                 "isr_retenido", "total"])


class ConceptoFactura(models.Model):
    factura = models.ForeignKey(Factura, on_delete=models.CASCADE, related_name="conceptos")
    descripcion = models.CharField(max_length=400)
    clave_prod_serv = models.CharField(max_length=15)
    clave_unidad = models.CharField(max_length=6)
    unidad = models.CharField(max_length=40, blank=True)
    cantidad = models.DecimalField(max_digits=14, decimal_places=4, default=1)
    precio_unitario = models.DecimalField(max_digits=14, decimal_places=4, default=0)
    descuento = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    objeto_imp = models.CharField(max_length=4, default="02")
    tasa_iva = models.DecimalField(max_digits=6, decimal_places=4, default=0.16)
    retencion_iva = models.DecimalField(max_digits=6, decimal_places=4, default=0)
    retencion_isr = models.DecimalField(max_digits=6, decimal_places=4, default=0)
    no_identificacion = models.CharField(max_length=100, blank=True)


class Pago(models.Model):
    """Complemento de pago (REP) para CFDI con metodo PPD."""

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="pagos")
    serie = models.ForeignKey(Serie, on_delete=models.PROTECT, related_name="pagos")
    folio = models.PositiveIntegerField()
    fecha_pago = models.DateTimeField()
    forma_pago = models.CharField(max_length=5)
    moneda = models.CharField(max_length=3, default="MXN")
    tipo_cambio = models.DecimalField(max_digits=10, decimal_places=4, default=1)
    monto = models.DecimalField(max_digits=14, decimal_places=2)
    numero_operacion = models.CharField(max_length=80, blank=True)
    cuenta_ordenante = models.CharField(max_length=50, blank=True)
    banco_ordenante = models.CharField(max_length=50, blank=True)
    cuenta_beneficiario = models.CharField(max_length=50, blank=True)
    estado = models.CharField(max_length=15, choices=ESTADOS_FACTURA, default="BORRADOR")
    folio_fiscal = models.CharField(max_length=64, blank=True)
    pac_uid = models.CharField(max_length=64, blank=True)
    xml = models.FileField(upload_to="pagos/xml/", blank=True, null=True)
    pdf = models.FileField(upload_to="pagos/pdf/", blank=True, null=True)
    log_pac = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-fecha_pago"]

    def __str__(self) -> str:
        return f"REP {self.serie.letra}{self.folio} · ${self.monto}"


class DoctoRelacionado(models.Model):
    """Factura PPD relacionada en un complemento de pago."""

    pago = models.ForeignKey(Pago, on_delete=models.CASCADE, related_name="documentos")
    factura = models.ForeignKey(Factura, on_delete=models.PROTECT, related_name="pagos_recibidos")
    numero_parcialidad = models.PositiveIntegerField(default=1)
    saldo_anterior = models.DecimalField(max_digits=14, decimal_places=2)
    importe_pagado = models.DecimalField(max_digits=14, decimal_places=2)
    saldo_insoluto = models.DecimalField(max_digits=14, decimal_places=2)
