"""Modelos de flota.

`Unidad` es el catalogo completo de vehiculos con TODOS los campos que el SAT
requiere para timbrar Carta Porte 3.1, ademas de los datos operativos y de
documentacion para gestion interna.
"""
from django.db import models

from apps.core.models import Empresa


class Termo(models.Model):
    """Equipo de refrigeracion (termo). Puede ir fijo a una unidad o ser un
    equipo separado que se asigna por viaje/servicio."""
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="termos")
    numero = models.CharField(max_length=40, help_text="Numero economico del termo")
    marca = models.CharField(max_length=80, blank=True)
    modelo = models.CharField(max_length=80, blank=True)
    serie = models.CharField(max_length=80, blank=True)
    horas_actual = models.DecimalField(max_digits=12, decimal_places=2, default=0,
                                       help_text="Horometro actual del termo")
    # ── Mantenimiento preventivo (por horas) ───────────────────────
    intervalo_horas_preventivo = models.DecimalField(
        max_digits=12, decimal_places=2, default=1200,
        help_text="Horas entre servicios preventivos",
    )
    horas_ultimo_servicio = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text="Horometro al momento del ultimo servicio (base)",
    )
    fecha_ultimo_servicio = models.DateField(null=True, blank=True)
    activo = models.BooleanField(default=True)
    notas = models.CharField(max_length=300, blank=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("empresa", "numero")]
        ordering = ["empresa", "numero"]

    def __str__(self) -> str:
        return f"{self.numero}{' · ' + self.marca if self.marca else ''}"


class Unidad(models.Model):
    """Vehiculo del catalogo. Sirve para flota interna Y para timbrar CP 3.1."""

    TIPO_COMBUSTIBLE_CHOICES = [
        ("DIESEL", "Diesel"),
        ("GASOLINA", "Gasolina"),
        ("GAS_LP", "Gas LP"),
        ("GAS_NATURAL", "Gas natural"),
        ("HIBRIDO", "Hibrido"),
        ("ELECTRICO", "Electrico"),
        ("OTRO", "Otro"),
    ]

    # ── Identificacion ─────────────────────────────────────────────
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="unidades")
    numero = models.CharField(max_length=40, help_text="Numero economico interno")
    placas = models.CharField(max_length=20, blank=True)
    vin = models.CharField(max_length=40, blank=True, help_text="NIV / VIN del vehiculo")
    marca = models.CharField(max_length=80, blank=True)
    modelo = models.CharField(max_length=80, blank=True)
    anio = models.PositiveIntegerField(blank=True, null=True, help_text="Anio modelo")
    color = models.CharField(max_length=40, blank=True)
    tipo = models.CharField(max_length=40, blank=True, help_text="Tractor, caja seca, plataforma, etc.")

    # ── Carta Porte 3.1 obligatorios ──────────────────────────────
    config_vehicular = models.CharField(
        max_length=10, blank=True,
        help_text="Clave SAT c_ConfigAutotransporte (ej. C2, T3S2, T3S3)",
    )
    peso_bruto_vehicular = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        help_text="Peso Bruto Vehicular en toneladas (PBV)",
    )
    permiso_sct = models.CharField(
        max_length=10, blank=True,
        help_text="Clave SAT c_TipoPermiso (TPAF01-13)",
    )
    numero_permiso_sct = models.CharField(max_length=50, blank=True)

    # Seguros — Responsabilidad civil (obligatorio CP)
    aseguradora_resp_civil = models.CharField(max_length=200, blank=True)
    poliza_resp_civil = models.CharField(max_length=80, blank=True)

    # Seguros — Medio ambiente (obligatorio si transporta material peligroso)
    aseguradora_med_ambiente = models.CharField(max_length=200, blank=True)
    poliza_med_ambiente = models.CharField(max_length=80, blank=True)

    # Seguros — Carga (opcional)
    aseguradora_carga = models.CharField(max_length=200, blank=True)
    poliza_carga = models.CharField(max_length=80, blank=True)
    prima_seguro_carga = models.DecimalField(max_digits=12, decimal_places=2, default=0, blank=True, null=True)

    # ── Remolques (hasta 2 segun SAT) ─────────────────────────────
    remolque1_subtipo = models.CharField(
        max_length=10, blank=True,
        help_text="Clave SAT c_SubTipoRem para el primer remolque",
    )
    remolque1_placa = models.CharField(max_length=20, blank=True)
    remolque2_subtipo = models.CharField(max_length=10, blank=True)
    remolque2_placa = models.CharField(max_length=20, blank=True)

    # ── Capacidades operativas ────────────────────────────────────
    capacidad_carga_kg = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        help_text="Capacidad de carga util en kg",
    )
    capacidad_combustible_litros = models.DecimalField(
        max_digits=8, decimal_places=2, default=0,
    )
    tipo_combustible = models.CharField(
        max_length=15, choices=TIPO_COMBUSTIBLE_CHOICES, default="DIESEL",
    )
    rendimiento_promedio_kml = models.DecimalField(
        max_digits=6, decimal_places=2, default=0,
        help_text="km/L promedio historico para deteccion de anomalias",
    )

    # ── Operativo ─────────────────────────────────────────────────
    km_actual = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    # ── Mantenimiento preventivo (por km) ─────────────────────────
    intervalo_km_preventivo = models.DecimalField(
        max_digits=12, decimal_places=2, default=10000,
        help_text="Km entre servicios preventivos de motor",
    )
    km_ultimo_servicio = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text="Odometro al momento del ultimo servicio (base)",
    )
    fecha_ultimo_servicio = models.DateField(null=True, blank=True)
    fecha_adquisicion = models.DateField(blank=True, null=True)
    valor_factura = models.DecimalField(max_digits=14, decimal_places=2, default=0, blank=True, null=True)
    proveedor_compra = models.CharField(max_length=200, blank=True)
    notas = models.TextField(blank=True)

    # ── Documentacion / vigencias (para alertas) ──────────────────
    fecha_tarjeta_circulacion = models.DateField(blank=True, null=True)
    fecha_verificacion_vence = models.DateField(blank=True, null=True)
    fecha_seguro_vence = models.DateField(blank=True, null=True)
    fecha_revista_vence = models.DateField(
        blank=True, null=True,
        help_text="Vigencia de la revista mecanica federal",
    )

    # ── Termo (equipo de refrigeracion) ───────────────────────────
    termo_fijo = models.BooleanField(
        default=False,
        help_text="El termo va fijo/asignado permanentemente a esta unidad.",
    )
    termo = models.ForeignKey(
        Termo, on_delete=models.SET_NULL, null=True, blank=True, related_name="unidades",
        help_text="Termo asignado a la unidad (cuando es fijo).",
    )

    # ── Status ────────────────────────────────────────────────────
    activo = models.BooleanField(default=True)
    fecha_baja = models.DateField(blank=True, null=True)
    motivo_baja = models.CharField(max_length=200, blank=True)

    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [("empresa", "numero")]
        ordering = ["empresa", "numero"]

    def __str__(self) -> str:
        return f"{self.numero} · {self.placas or 'sin placas'}"

    # ── Helpers ───────────────────────────────────────────────────
    @property
    def cp_ready(self) -> bool:
        """True si la unidad tiene todos los campos obligatorios para CP 3.1."""
        return all([
            self.placas,
            self.anio,
            self.config_vehicular,
            self.peso_bruto_vehicular,
            self.permiso_sct,
            self.numero_permiso_sct,
            self.aseguradora_resp_civil,
            self.poliza_resp_civil,
        ])

    @property
    def cp_campos_faltantes(self) -> list[str]:
        """Lista de campos requeridos por CP 3.1 que aun no estan capturados."""
        faltantes = []
        chequeos = {
            "placas": self.placas,
            "anio": self.anio,
            "config_vehicular": self.config_vehicular,
            "peso_bruto_vehicular": self.peso_bruto_vehicular,
            "permiso_sct": self.permiso_sct,
            "numero_permiso_sct": self.numero_permiso_sct,
            "aseguradora_resp_civil": self.aseguradora_resp_civil,
            "poliza_resp_civil": self.poliza_resp_civil,
        }
        return [k for k, v in chequeos.items() if not v]


class CargaCombustible(models.Model):
    unidad = models.ForeignKey(Unidad, on_delete=models.CASCADE, related_name="cargas")
    fecha = models.DateTimeField()
    litros = models.DecimalField(max_digits=10, decimal_places=3)
    precio_litro = models.DecimalField(max_digits=10, decimal_places=4)
    importe = models.DecimalField(max_digits=12, decimal_places=2)
    km_actual = models.DecimalField(max_digits=12, decimal_places=2)
    rendimiento_kml = models.DecimalField(
        max_digits=8, decimal_places=3, default=0, blank=True,
        help_text="Rendimiento calculado al momento de la carga (km/L)",
    )
    estacion = models.CharField(max_length=120, blank=True)
    folio = models.CharField(max_length=40, blank=True)
    ticket_foto = models.ImageField(upload_to="flota/tickets/", blank=True, null=True)
    notas = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ["-fecha"]
