"""Modelos del complemento Carta Porte 3.1 (SAT).

Estructura SAT: la Carta Porte se compone de:
  - Ubicaciones (al menos una origen y una destino)
  - Mercancias (cada concepto con ClaveProdServCP)
  - Autotransporte (placas, configuracion, permiso SCT)
  - Figuras (operador, propietario, etc.)
"""
from __future__ import annotations

from django.db import models

from apps.core.models import Empresa


class Ubicacion(models.Model):
    """Origen o destino dentro de un viaje de Carta Porte."""

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="cp_ubicaciones")
    nombre = models.CharField(max_length=200)
    rfc = models.CharField(max_length=13, default="XAXX010101000")
    codigo_postal = models.CharField(max_length=10)
    estado = models.CharField(max_length=4)
    municipio = models.CharField(max_length=6, blank=True)
    colonia = models.CharField(max_length=10, blank=True)
    calle = models.CharField(max_length=200, blank=True)
    numero_exterior = models.CharField(max_length=20, blank=True)
    numero_interior = models.CharField(max_length=20, blank=True)
    referencia = models.CharField(max_length=200, blank=True)
    activa = models.BooleanField(default=True)

    class Meta:
        ordering = ["empresa", "nombre"]

    def __str__(self) -> str:
        return f"{self.nombre} · CP{self.codigo_postal}"


class Autotransporte(models.Model):
    """Configuracion vehicular asignable a un viaje CP."""

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="cp_autotransportes")
    placas = models.CharField(max_length=20)
    anio_modelo = models.PositiveIntegerField()
    config_vehicular = models.CharField(max_length=6, help_text="Clave SAT c_ConfigAutotransporte")
    permiso_sct = models.CharField(max_length=10, help_text="Clave SAT c_TipoPermiso")
    numero_permiso = models.CharField(max_length=50)
    aseguradora_resp_civil = models.CharField(max_length=200, blank=True)
    poliza_resp_civil = models.CharField(max_length=80, blank=True)
    aseguradora_med_ambiente = models.CharField(max_length=200, blank=True)
    poliza_med_ambiente = models.CharField(max_length=80, blank=True)
    activa = models.BooleanField(default=True)

    class Meta:
        ordering = ["placas"]
        unique_together = [("empresa", "placas")]

    def __str__(self) -> str:
        return f"{self.placas} · {self.config_vehicular}"


class Operador(models.Model):
    """Figura tipo Operador para Carta Porte."""

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="cp_operadores")
    rfc = models.CharField(max_length=13)
    nombre = models.CharField(max_length=200)
    licencia = models.CharField(max_length=40)
    licencia_vencimiento = models.DateField(null=True, blank=True)
    codigo_postal = models.CharField(max_length=10, blank=True)
    # Vínculo con el empleado de RH (misma persona). Se sincroniza por RFC.
    empleado = models.ForeignKey(
        "rh.Empleado", on_delete=models.SET_NULL, null=True, blank=True, related_name="operadores")
    activo = models.BooleanField(default=True)

    class Meta:
        unique_together = [("empresa", "rfc")]
        ordering = ["nombre"]

    def __str__(self) -> str:
        return f"{self.nombre} · {self.rfc}"


class CartaPorte(models.Model):
    """Complemento Carta Porte 3.1 asociado a un viaje/factura."""

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="cartas_porte")
    folio_interno = models.CharField(max_length=40, blank=True)

    # Datos del traslado
    transp_internacional = models.BooleanField(default=False)
    entrada_salida_merc = models.CharField(max_length=10, blank=True)
    pais_origen_destino = models.CharField(max_length=4, blank=True)
    via_entrada_salida = models.CharField(max_length=4, blank=True)
    total_distancia_rec = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    autotransporte = models.ForeignKey(Autotransporte, on_delete=models.PROTECT, related_name="cartas_porte")
    operador = models.ForeignKey(Operador, on_delete=models.PROTECT, related_name="cartas_porte")

    fecha_traslado = models.DateTimeField()
    notas = models.TextField(blank=True)

    estado = models.CharField(
        max_length=15,
        choices=[("BORRADOR", "Borrador"), ("TIMBRADO", "Timbrado"), ("CANCELADO", "Cancelado")],
        default="BORRADOR",
    )
    folio_fiscal = models.CharField(max_length=64, blank=True)
    xml = models.FileField(upload_to="cartaporte/xml/", blank=True, null=True)
    pdf = models.FileField(upload_to="cartaporte/pdf/", blank=True, null=True)

    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-creado"]

    def __str__(self) -> str:
        return f"CP {self.folio_interno or self.id} · {self.estado}"


class CartaPorteUbicacion(models.Model):
    """Ubicacion (origen/destino) dentro de una carta porte."""

    carta_porte = models.ForeignKey(CartaPorte, on_delete=models.CASCADE, related_name="ubicaciones_cp")
    tipo = models.CharField(max_length=10, choices=[("Origen", "Origen"), ("Destino", "Destino")])
    ubicacion = models.ForeignKey(Ubicacion, on_delete=models.PROTECT)
    id_ubicacion = models.CharField(max_length=10, help_text="OR000001 / DE000001")
    fecha_hora = models.DateTimeField()
    distancia_recorrida = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    orden = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ["carta_porte", "orden"]


class Mercancia(models.Model):
    """Mercancia transportada en una Carta Porte."""

    carta_porte = models.ForeignKey(CartaPorte, on_delete=models.CASCADE, related_name="mercancias")
    bienes_transp = models.CharField(max_length=15, help_text="ClaveProdServCP")
    descripcion = models.CharField(max_length=400)
    cantidad = models.DecimalField(max_digits=12, decimal_places=3, default=1)
    clave_unidad = models.CharField(max_length=6)
    peso_kg = models.DecimalField(max_digits=12, decimal_places=3, default=0)
    valor_mercancia = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    moneda = models.CharField(max_length=3, default="MXN")
    material_peligroso = models.BooleanField(default=False)
    clave_material_peligroso = models.CharField(max_length=10, blank=True)
    embalaje = models.CharField(max_length=10, blank=True)
    descripcion_embalaje = models.CharField(max_length=200, blank=True)
    dimensiones = models.CharField(max_length=80, blank=True)
    fraccion_arancelaria = models.CharField(max_length=15, blank=True)
