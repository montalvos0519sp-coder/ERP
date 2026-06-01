"""Modulo de Liquidaciones de Operador.

Cada liquidacion agrupa los viajes de un operador en un rango de fechas
+ conceptos extra (bonos) y descuentos. Estados: BORRADOR -> APROBADA ->
PAGADA. CANCELADA es terminal.

Estructura compatible con el modulo del proyecto 3rrecycling-next-main.
"""
from __future__ import annotations

from decimal import Decimal

from django.db import models

from apps.core.models import Empresa


class LiquidacionOperador(models.Model):
    ESTADOS = [
        ("BORRADOR",  "Borrador"),
        ("APROBADA",  "Aprobada"),
        ("PAGADA",    "Pagada"),
        ("CANCELADA", "Cancelada"),
    ]

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="liquidaciones")
    operador = models.ForeignKey("carta_porte.Operador", on_delete=models.PROTECT, related_name="liquidaciones")
    folio = models.CharField(max_length=40)
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()

    total_viajes = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    total_extras = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    total_descuentos = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    total_pagar = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))

    estado = models.CharField(max_length=15, choices=ESTADOS, default="BORRADOR")
    fecha_pago = models.DateField(blank=True, null=True)
    observaciones = models.TextField(blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("empresa", "folio")]
        ordering = ["-creado_en"]

    def __str__(self) -> str:
        return f"{self.folio} · {self.operador} · {self.total_pagar}"

    def recalcular(self):
        from django.db.models import Sum
        agg_v = self.conceptos.filter(tipo="VIAJE").aggregate(s=Sum("monto"))
        agg_e = self.conceptos.filter(tipo="EXTRA").aggregate(s=Sum("monto"))
        agg_d = self.conceptos.filter(tipo="DESCUENTO").aggregate(s=Sum("monto"))
        self.total_viajes = agg_v["s"] or Decimal("0")
        self.total_extras = agg_e["s"] or Decimal("0")
        self.total_descuentos = agg_d["s"] or Decimal("0")
        self.total_pagar = self.total_viajes + self.total_extras - self.total_descuentos
        self.save(update_fields=["total_viajes", "total_extras", "total_descuentos", "total_pagar"])


class ConceptoLiquidacion(models.Model):
    TIPO = [("VIAJE", "Viaje"), ("EXTRA", "Bono / extra"), ("DESCUENTO", "Descuento")]

    liquidacion = models.ForeignKey(LiquidacionOperador, on_delete=models.CASCADE, related_name="conceptos")
    tipo = models.CharField(max_length=10, choices=TIPO)
    descripcion = models.CharField(max_length=200)
    monto = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    viaje = models.ForeignKey("viajes.Viaje", on_delete=models.SET_NULL, blank=True, null=True, related_name="liquidacion_conceptos")

    class Meta:
        ordering = ["tipo", "id"]
