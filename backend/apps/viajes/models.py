from django.conf import settings
from django.db import models

from apps.core.models import Empresa


class Viaje(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="viajes")
    numero = models.CharField(max_length=40)
    cliente = models.ForeignKey("facturacion.Cliente", on_delete=models.PROTECT, related_name="viajes")
    origen = models.ForeignKey("carta_porte.Ubicacion", on_delete=models.PROTECT, related_name="viajes_origen")
    destino = models.ForeignKey("carta_porte.Ubicacion", on_delete=models.PROTECT, related_name="viajes_destino")
    fecha_salida = models.DateTimeField()
    fecha_llegada = models.DateTimeField(blank=True, null=True)
    autotransporte = models.ForeignKey("carta_porte.Autotransporte", on_delete=models.PROTECT, blank=True, null=True)
    operador = models.ForeignKey("carta_porte.Operador", on_delete=models.PROTECT, blank=True, null=True)
    km_recorridos = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tarifa = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    estado = models.CharField(
        max_length=15,
        choices=[("PROGRAMADO", "Programado"), ("EN_TRANSITO", "En transito"),
                 ("ENTREGADO", "Entregado"), ("CANCELADO", "Cancelado")],
        default="PROGRAMADO",
    )
    notas = models.TextField(blank=True)
    creado = models.DateTimeField(auto_now_add=True)
    creado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                   blank=True, null=True, related_name="viajes_creados")

    class Meta:
        unique_together = [("empresa", "numero")]
        ordering = ["-fecha_salida"]

    def __str__(self) -> str:
        return f"{self.numero} · {self.cliente.razon_social}"
