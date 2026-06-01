from django.db import models
from django.conf import settings
from apps.core.models import Empresa


class OrdenCompra(models.Model):
    ESTADOS = [
        ("BORRADOR", "Borrador"), ("APROBADA", "Aprobada"),
        ("PARCIAL", "Recibida parcial"), ("CERRADA", "Cerrada"), ("CANCELADA", "Cancelada"),
    ]
    TIPO_MANTENIMIENTO = [
        ("CORRECTIVO", "Correctivo"),
        ("PREVENTIVO", "Preventivo (Motor)"),
        ("THERMO", "Mantenimiento Thermo"),
    ]
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="ordenes_compra")
    proveedor = models.ForeignKey("cxp.Proveedor", on_delete=models.PROTECT, related_name="ordenes")
    folio = models.CharField(max_length=40)
    fecha = models.DateField()
    fecha_entrega = models.DateField(blank=True, null=True)
    subtotal = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    iva = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    estado = models.CharField(max_length=15, choices=ESTADOS, default="BORRADOR")
    notas = models.TextField(blank=True)
    # ── Asignación a flota (mantenimiento) ─────────────────────────
    # Una OC puede ser para una Unidad (motor), un Termo (thermo) o un insumo
    # general de almacén (sin unidad específica).
    unidad = models.ForeignKey(
        "flota.Unidad", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="ordenes_compra", verbose_name="Unidad",
    )
    termo = models.ForeignKey(
        "flota.Termo", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="ordenes_compra", verbose_name="Thermo",
    )
    tipo_mantenimiento = models.CharField(
        max_length=20, choices=TIPO_MANTENIMIENTO, blank=True, null=True,
    )
    es_insumo = models.BooleanField(
        default=False, verbose_name="¿Es insumo general (sin unidad)?",
    )
    creado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True)
    class Meta:
        unique_together = [("empresa", "folio")]


class PartidaOC(models.Model):
    orden = models.ForeignKey(OrdenCompra, on_delete=models.CASCADE, related_name="partidas")
    producto = models.ForeignKey("almacen.Producto", on_delete=models.PROTECT)
    descripcion = models.CharField(max_length=300)
    cantidad = models.DecimalField(max_digits=12, decimal_places=4)
    precio_unitario = models.DecimalField(max_digits=12, decimal_places=4)
    importe = models.DecimalField(max_digits=14, decimal_places=2)
    recibido = models.DecimalField(max_digits=12, decimal_places=4, default=0)
