"""Módulo de Viajes (bitácora de traslados) + Carta Porte 3.1.

Un Viaje tiene un itinerario de paradas (origen → intermedias → destino),
mercancías (manuales o de catálogo, con soporte para material peligroso),
determinantes reutilizables, y puede timbrarse como Carta Porte ante el SAT
(ver apps/viajes/services_cartaporte.py). El historial de timbres queda en
TimbreViaje para poder cancelar y volver a timbrar las veces que se necesite.
"""
from django.conf import settings
from django.db import models

from apps.core.models import Empresa


class Determinante(models.Model):
    """Código de destino reutilizable (p. ej. tienda/CEDIS de un cliente) que el
    usuario da de alta y puede asociar a paradas/mercancías de un viaje."""

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="determinantes")
    codigo = models.CharField(max_length=40)
    nombre = models.CharField(max_length=200)
    cliente = models.CharField(max_length=200, blank=True)
    ubicacion = models.ForeignKey(
        "carta_porte.Ubicacion", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="determinantes",
    )
    activo = models.BooleanField(default=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("empresa", "codigo")]
        ordering = ["codigo"]

    def __str__(self) -> str:
        return f"{self.codigo} · {self.nombre}"


class Viaje(models.Model):
    ESTADOS = [
        ("PLANIFICADO", "Planificado"), ("EN_RUTA", "En ruta"),
        ("ENTREGADO", "Entregado"), ("CANCELADO", "Cancelado"),
    ]

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="viajes")
    numero = models.CharField(max_length=40, blank=True, help_text="Consecutivo interno")
    folio_carta = models.CharField(max_length=40, blank=True, help_text="Folio de la carta de traslado (autogenerado)")
    folio_carga = models.CharField(max_length=60, blank=True)
    cliente = models.ForeignKey(
        "facturacion.Cliente", on_delete=models.SET_NULL, blank=True, null=True, related_name="viajes")
    origen = models.ForeignKey(
        "carta_porte.Ubicacion", on_delete=models.PROTECT, blank=True, null=True, related_name="viajes_origen")
    destino = models.ForeignKey(
        "carta_porte.Ubicacion", on_delete=models.PROTECT, blank=True, null=True, related_name="viajes_destino")
    fecha_viaje = models.DateTimeField(blank=True, null=True)
    fecha_llegada = models.DateTimeField(blank=True, null=True)
    unidad = models.ForeignKey(
        "flota.Unidad", on_delete=models.PROTECT, blank=True, null=True, related_name="viajes")
    operador = models.ForeignKey(
        "carta_porte.Operador", on_delete=models.PROTECT, blank=True, null=True, related_name="viajes")
    km_recorridos = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tarifa = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sueldo_operador = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    eco_remolque = models.CharField(max_length=40, blank=True)
    placa_remolque = models.CharField(max_length=40, blank=True)
    estado = models.CharField(max_length=15, choices=ESTADOS, default="PLANIFICADO")
    observaciones = models.TextField(blank=True)

    carta_porte = models.OneToOneField(
        "carta_porte.CartaPorte", on_delete=models.SET_NULL, blank=True, null=True, related_name="viaje")

    creado = models.DateTimeField(auto_now_add=True)
    creado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                   blank=True, null=True, related_name="viajes_creados")

    class Meta:
        unique_together = [("empresa", "numero")]
        ordering = ["-fecha_viaje", "-creado"]

    def __str__(self) -> str:
        return f"{self.folio_carta or self.numero}"

    def save(self, *args, **kwargs):
        # Autogenera consecutivo y folio de carta de traslado por empresa.
        if not self.numero and self.empresa_id:
            ult = (Viaje.objects.filter(empresa_id=self.empresa_id)
                   .exclude(numero="").order_by("-id").values_list("numero", flat=True).first())
            try:
                n = int(str(ult).split("-")[-1]) + 1 if ult else 1
            except (ValueError, TypeError):
                n = (Viaje.objects.filter(empresa_id=self.empresa_id).count() or 0) + 1
            self.numero = str(n)
        if not self.folio_carta and self.numero:
            try:
                self.folio_carta = f"CT-{int(self.numero):05d}"
            except (ValueError, TypeError):
                self.folio_carta = f"CT-{self.numero}"
        super().save(*args, **kwargs)

    @property
    def mismo_origen_destino(self) -> bool:
        return bool(self.origen_id and self.destino_id and self.origen_id == self.destino_id)

    @property
    def kms_totales(self):
        return sum((p.kms or 0) for p in self.paradas.all())


class ParadaViaje(models.Model):
    """Parada del itinerario (origen, intermedias, destino). El orden define la
    secuencia y se puede reordenar (drag&drop)."""

    viaje = models.ForeignKey(Viaje, on_delete=models.CASCADE, related_name="paradas")
    orden = models.PositiveIntegerField(default=1)
    ubicacion = models.ForeignKey("carta_porte.Ubicacion", on_delete=models.PROTECT, related_name="paradas_viaje")
    determinante = models.ForeignKey(
        Determinante, on_delete=models.SET_NULL, null=True, blank=True, related_name="paradas")
    fecha_hora = models.DateTimeField(blank=True, null=True)
    kms = models.DecimalField(max_digits=10, decimal_places=3, default=0)
    observaciones = models.TextField(blank=True)

    class Meta:
        ordering = ["orden", "id"]

    def __str__(self) -> str:
        return f"#{self.orden} {self.ubicacion}"

    def codigo_tramo(self, total: int) -> str:
        """OR000001 (primera), DE000001 (última), MD000001 (intermedia)."""
        if self.orden <= 1:
            pre = "OR"
        elif self.orden >= total:
            pre = "DE"
        else:
            pre = "MD"
        return f"{pre}{self.orden:06d}"


class MercanciaViaje(models.Model):
    """Mercancía transportada en el viaje (manual o de catálogo SAT)."""

    viaje = models.ForeignKey(Viaje, on_delete=models.CASCADE, related_name="mercancias")
    parada_origen = models.ForeignKey(
        ParadaViaje, on_delete=models.SET_NULL, null=True, blank=True, related_name="mercancias_origen")
    parada_destino = models.ForeignKey(
        ParadaViaje, on_delete=models.SET_NULL, null=True, blank=True, related_name="mercancias_destino")
    clave_producto = models.CharField(max_length=15, blank=True, help_text="ClaveProdServ / CP SAT")
    descripcion = models.CharField(max_length=400)
    cantidad = models.DecimalField(max_digits=12, decimal_places=2, default=1)
    peso_kg = models.DecimalField(max_digits=12, decimal_places=3, default=0)
    unidad_medida = models.CharField(max_length=6, default="H87")
    # Material peligroso (CP 3.1)
    material_peligroso = models.BooleanField(default=False)
    clave_material_peligroso = models.CharField(max_length=10, blank=True)
    embalaje = models.CharField(max_length=10, blank=True)
    descripcion_embalaje = models.CharField(max_length=200, blank=True)
    notas = models.TextField(blank=True)

    class Meta:
        ordering = ["id"]

    def __str__(self) -> str:
        return self.descripcion


class TimbreViaje(models.Model):
    """Historial de timbres de la Carta Porte del viaje. Permite cancelar y
    volver a timbrar (nuevo UUID) cuantas veces sea necesario."""

    ESTADOS = [("TIMBRADO", "Timbrado"), ("CANCELADO", "Cancelado")]
    viaje = models.ForeignKey(Viaje, on_delete=models.CASCADE, related_name="timbres")
    carta_porte = models.ForeignKey(
        "carta_porte.CartaPorte", on_delete=models.SET_NULL, null=True, blank=True, related_name="timbres_viaje")
    uuid = models.CharField(max_length=64, blank=True)
    estado = models.CharField(max_length=12, choices=ESTADOS, default="TIMBRADO")
    fecha = models.DateTimeField(auto_now_add=True)
    motivo_cancelacion = models.CharField(max_length=20, blank=True)
    log = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-fecha"]

    def __str__(self) -> str:
        return f"{self.uuid or '—'} · {self.estado}"


# ── Gastos de viaje ──────────────────────────────────────────────────────────
class CategoriaGastoViaje(models.Model):
    """Catálogo de tipos de gasto de viaje (casetas, combustible, comidas…).
    El usuario los da de alta y los reutiliza en los gastos de cada viaje."""

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="categorias_gasto_viaje")
    nombre = models.CharField(max_length=120)
    descripcion = models.CharField(max_length=300, blank=True)
    activo = models.BooleanField(default=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("empresa", "nombre")]
        ordering = ["nombre"]

    def __str__(self) -> str:
        return self.nombre


class GastoViaje(models.Model):
    """Gasto registrado en un viaje, con monto y evidencias (PDF/imágenes)."""

    viaje = models.ForeignKey(Viaje, on_delete=models.CASCADE, related_name="gastos")
    categoria = models.ForeignKey(
        CategoriaGastoViaje, on_delete=models.SET_NULL, null=True, blank=True, related_name="gastos")
    descripcion = models.CharField(max_length=300, blank=True)
    monto = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    fecha = models.DateField(null=True, blank=True)
    creado = models.DateTimeField(auto_now_add=True)
    creado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                   null=True, blank=True, related_name="gastos_viaje_creados")

    class Meta:
        ordering = ["-fecha", "-id"]

    def __str__(self) -> str:
        return f"{self.descripcion or (self.categoria and self.categoria.nombre) or 'Gasto'} · ${self.monto}"


def _evidencia_gasto_path(instance, filename):
    return f"viajes/gastos/{instance.gasto_id}/{filename}"


class EvidenciaGastoViaje(models.Model):
    """Archivo de evidencia (PDF o imagen) de un gasto de viaje."""

    gasto = models.ForeignKey(GastoViaje, on_delete=models.CASCADE, related_name="evidencias")
    archivo = models.FileField(upload_to=_evidencia_gasto_path)
    nombre = models.CharField(max_length=255, blank=True)
    mime = models.CharField(max_length=120, blank=True)
    subido = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]

    def __str__(self) -> str:
        return self.nombre or f"Evidencia {self.id}"
