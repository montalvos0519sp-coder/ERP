from django.db import models
from apps.core.models import Empresa


class Proveedor(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="proveedores")
    rfc = models.CharField(max_length=13)
    razon_social = models.CharField(max_length=255)
    nombre_comercial = models.CharField(max_length=255, blank=True)
    email = models.EmailField(blank=True)
    telefono = models.CharField(max_length=30, blank=True)
    # ── Datos bancarios ────────────────────────────────────────────
    banco = models.CharField(max_length=100, blank=True)
    cuenta = models.CharField(max_length=50, blank=True)
    clabe = models.CharField(max_length=20, blank=True)
    # ── Condiciones comerciales ────────────────────────────────────
    dias_credito = models.PositiveIntegerField(default=0, help_text="Días otorgados para pagar")
    saldo_a_favor = models.DecimalField(max_digits=14, decimal_places=2, default=0,
                                        help_text="Monto que el proveedor nos adeuda")
    autorizado = models.BooleanField(default=False, help_text="Validado administrativamente")
    requiere_xml = models.BooleanField(default=False, help_text="Exige subir XML obligatoriamente")
    activo = models.BooleanField(default=True)
    class Meta:
        unique_together = [("empresa", "rfc")]
        ordering = ["razon_social"]
    def __str__(self): return f"{self.rfc} · {self.razon_social}"


class FacturaProveedor(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="facturas_proveedor")
    proveedor = models.ForeignKey(Proveedor, on_delete=models.PROTECT, related_name="facturas")
    folio = models.CharField(max_length=40)
    folio_fiscal = models.CharField(max_length=64, blank=True)
    fecha_emision = models.DateField()
    fecha_vencimiento = models.DateField(blank=True, null=True)
    subtotal = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    iva = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    saldo = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    estado = models.CharField(max_length=15, default="PENDIENTE")
    xml = models.FileField(upload_to="cxp/xml/", blank=True, null=True)
    notas = models.TextField(blank=True)


class PagoProveedor(models.Model):
    factura = models.ForeignKey(FacturaProveedor, on_delete=models.CASCADE, related_name="pagos")
    fecha_pago = models.DateField()
    monto = models.DecimalField(max_digits=14, decimal_places=2)
    forma_pago = models.CharField(max_length=5, default="03")
    referencia = models.CharField(max_length=80, blank=True)
