"""Modelos del catalogo SAT.

Se cargan desde los archivos Excel en /data_catalogos/ via management commands.
Estos catalogos son globales (no tienen FK a Empresa): los comparte todo el ERP.
"""
from __future__ import annotations

from django.db import models


class SatClaveProdServ(models.Model):
    """Clave producto-servicio (catalogo c_ClaveProdServ del SAT)."""

    clave = models.CharField(max_length=15, primary_key=True)
    descripcion = models.CharField(max_length=600)
    incluye_iva = models.CharField(max_length=2, blank=True)  # SI/NO/condicional
    palabras_similares = models.TextField(blank=True)

    class Meta:
        ordering = ["clave"]
        indexes = [models.Index(fields=["descripcion"])]

    def __str__(self) -> str:
        return f"{self.clave} · {self.descripcion[:60]}"


class SatClaveProdServCP(models.Model):
    """Clave producto-servicio especifica para Carta Porte 3.1."""

    clave = models.CharField(max_length=15, primary_key=True)
    descripcion = models.CharField(max_length=600)
    material_peligroso = models.CharField(max_length=10, blank=True)  # 0, 1, 0/1
    embalaje = models.CharField(max_length=10, blank=True)
    descripcion_embalaje = models.CharField(max_length=400, blank=True)

    class Meta:
        ordering = ["clave"]
        indexes = [models.Index(fields=["descripcion"])]

    def __str__(self) -> str:
        return f"{self.clave} · {self.descripcion[:60]}"


class SatClaveUnidad(models.Model):
    """Catalogo c_ClaveUnidad del SAT (unidades de medida)."""

    clave = models.CharField(max_length=6, primary_key=True)
    nombre = models.CharField(max_length=200)
    simbolo = models.CharField(max_length=30, blank=True)
    descripcion = models.CharField(max_length=400, blank=True)

    class Meta:
        ordering = ["clave"]

    def __str__(self) -> str:
        return f"{self.clave} · {self.nombre}"


class SatEstado(models.Model):
    """Catalogo c_Estado del SAT."""

    clave = models.CharField(max_length=4, primary_key=True)
    nombre = models.CharField(max_length=100)
    pais = models.CharField(max_length=4, default="MEX")

    class Meta:
        ordering = ["nombre"]

    def __str__(self) -> str:
        return f"{self.clave} · {self.nombre}"


class SatMunicipio(models.Model):
    """Catalogo c_Municipio del SAT."""

    estado = models.ForeignKey(SatEstado, on_delete=models.CASCADE, related_name="municipios", to_field="clave")
    clave = models.CharField(max_length=6)
    nombre = models.CharField(max_length=200)

    class Meta:
        unique_together = [("estado", "clave")]
        ordering = ["estado", "nombre"]

    def __str__(self) -> str:
        return f"{self.estado_id}-{self.clave} {self.nombre}"


class SatCodigoPostal(models.Model):
    """Catalogo c_CodigoPostal del SAT."""

    codigo_postal = models.CharField(max_length=10, primary_key=True)
    estado = models.CharField(max_length=4, blank=True)
    municipio = models.CharField(max_length=6, blank=True)
    localidad = models.CharField(max_length=4, blank=True)

    class Meta:
        ordering = ["codigo_postal"]

    def __str__(self) -> str:
        return self.codigo_postal


class SatColonia(models.Model):
    """Catalogo c_Colonia del SAT (asentamientos por CP)."""

    codigo_postal = models.CharField(max_length=10, db_index=True)
    clave = models.CharField(max_length=10)
    nombre = models.CharField(max_length=300)

    class Meta:
        unique_together = [("codigo_postal", "clave")]
        ordering = ["codigo_postal", "nombre"]
        indexes = [models.Index(fields=["codigo_postal", "nombre"])]

    def __str__(self) -> str:
        return f"{self.codigo_postal} · {self.nombre}"


# ── Catalogos SAT pequenos cargados manualmente desde la UI ────────────────
class SatRegimenFiscal(models.Model):
    clave = models.CharField(max_length=10, primary_key=True)
    descripcion = models.CharField(max_length=300)
    fisica = models.BooleanField(default=True)
    moral = models.BooleanField(default=True)

    def __str__(self) -> str:
        return f"{self.clave} · {self.descripcion}"


class SatUsoCFDI(models.Model):
    clave = models.CharField(max_length=10, primary_key=True)
    descripcion = models.CharField(max_length=300)
    aplica_fisica = models.BooleanField(default=True)
    aplica_moral = models.BooleanField(default=True)

    def __str__(self) -> str:
        return f"{self.clave} · {self.descripcion}"


class SatFormaPago(models.Model):
    clave = models.CharField(max_length=5, primary_key=True)
    descripcion = models.CharField(max_length=300)

    def __str__(self) -> str:
        return f"{self.clave} · {self.descripcion}"


class SatMetodoPago(models.Model):
    clave = models.CharField(max_length=5, primary_key=True)
    descripcion = models.CharField(max_length=300)

    def __str__(self) -> str:
        return f"{self.clave} · {self.descripcion}"


class SatMoneda(models.Model):
    clave = models.CharField(max_length=5, primary_key=True)
    descripcion = models.CharField(max_length=200)
    decimales = models.PositiveSmallIntegerField(default=2)

    def __str__(self) -> str:
        return f"{self.clave} · {self.descripcion}"


# ── Catalogos especificos de Carta Porte 3.1 ───────────────────────────────
class SatConfigVehicular(models.Model):
    clave = models.CharField(max_length=6, primary_key=True)
    descripcion = models.CharField(max_length=300)
    remolque = models.BooleanField(default=False)
    semirremolque = models.BooleanField(default=False)

    def __str__(self) -> str:
        return f"{self.clave} · {self.descripcion}"


class SatTipoFigura(models.Model):
    """c_FiguraTransporte (operador, propietario, arrendatario, notificado)."""

    clave = models.CharField(max_length=4, primary_key=True)
    descripcion = models.CharField(max_length=200)

    def __str__(self) -> str:
        return f"{self.clave} · {self.descripcion}"


class SatTipoPermiso(models.Model):
    """c_TipoPermiso de SCT."""

    clave = models.CharField(max_length=10, primary_key=True)
    descripcion = models.CharField(max_length=300)

    def __str__(self) -> str:
        return f"{self.clave} · {self.descripcion}"


class SatTipoEmbalaje(models.Model):
    clave = models.CharField(max_length=10, primary_key=True)
    descripcion = models.CharField(max_length=300)

    def __str__(self) -> str:
        return f"{self.clave} · {self.descripcion}"


class SatMaterialPeligroso(models.Model):
    clave = models.CharField(max_length=10, primary_key=True)
    descripcion = models.CharField(max_length=400)
    clase_division = models.CharField(max_length=20, blank=True)

    def __str__(self) -> str:
        return f"{self.clave} · {self.descripcion[:60]}"


class SatSubTipoRem(models.Model):
    """Catalogo c_SubTipoRem del SAT (subtipos de remolques)."""

    clave = models.CharField(max_length=10, primary_key=True)
    descripcion = models.CharField(max_length=300)

    def __str__(self) -> str:
        return f"{self.clave} · {self.descripcion}"


# ── Catalogos SAT especificos de Complemento Nomina 1.2 ────────────────────
class SatTipoContrato(models.Model):
    """c_TipoContrato. Ej: 01 (Indeterminado), 02 (Obra Determinada), etc."""
    clave = models.CharField(max_length=4, primary_key=True)
    descripcion = models.CharField(max_length=200)
    def __str__(self) -> str: return f"{self.clave} · {self.descripcion}"


class SatTipoJornada(models.Model):
    """c_TipoJornada. Ej: 01 Diurna, 02 Nocturna, etc."""
    clave = models.CharField(max_length=4, primary_key=True)
    descripcion = models.CharField(max_length=200)
    def __str__(self) -> str: return f"{self.clave} · {self.descripcion}"


class SatTipoRegimen(models.Model):
    """c_TipoRegimen. Ej: 02 Sueldos, 03 Jubilados, 04 Pensionados, etc."""
    clave = models.CharField(max_length=4, primary_key=True)
    descripcion = models.CharField(max_length=200)
    def __str__(self) -> str: return f"{self.clave} · {self.descripcion}"


class SatRiesgoPuesto(models.Model):
    """c_RiesgoPuesto. 1..5 segun grado de riesgo IMSS."""
    clave = models.CharField(max_length=2, primary_key=True)
    descripcion = models.CharField(max_length=200)
    def __str__(self) -> str: return f"{self.clave} · {self.descripcion}"


class SatPeriodicidadPago(models.Model):
    """c_PeriodicidadPago. Ej: 04 Quincenal, 02 Semanal, 05 Mensual."""
    clave = models.CharField(max_length=4, primary_key=True)
    descripcion = models.CharField(max_length=200)
    def __str__(self) -> str: return f"{self.clave} · {self.descripcion}"


class SatBanco(models.Model):
    """c_Banco. Catalogo de bancos del SAT para nomina."""
    clave = models.CharField(max_length=4, primary_key=True)
    razon_social = models.CharField(max_length=300)
    nombre_corto = models.CharField(max_length=100, blank=True)
    def __str__(self) -> str: return f"{self.clave} · {self.razon_social}"


class SatTipoPercepcion(models.Model):
    """c_TipoPercepcion. Ej: 001 Sueldos, 020 Aguinaldo, 021 Prima vacacional."""
    clave = models.CharField(max_length=4, primary_key=True)
    descripcion = models.CharField(max_length=200)
    es_exento_parcial = models.BooleanField(default=False)
    def __str__(self) -> str: return f"{self.clave} · {self.descripcion}"


class SatTipoDeduccion(models.Model):
    """c_TipoDeduccion. Ej: 001 Seguridad social, 002 ISR, 004 Prestamos."""
    clave = models.CharField(max_length=4, primary_key=True)
    descripcion = models.CharField(max_length=200)
    def __str__(self) -> str: return f"{self.clave} · {self.descripcion}"


class SatTipoOtroPago(models.Model):
    """c_TipoOtroPago. Ej: 002 Subsidio para el empleo, 003 Viaticos."""
    clave = models.CharField(max_length=4, primary_key=True)
    descripcion = models.CharField(max_length=200)
    def __str__(self) -> str: return f"{self.clave} · {self.descripcion}"


class SatTipoNomina(models.Model):
    """c_TipoNomina. O Ordinaria, E Extraordinaria."""
    clave = models.CharField(max_length=2, primary_key=True)
    descripcion = models.CharField(max_length=200)
    def __str__(self) -> str: return f"{self.clave} · {self.descripcion}"


class SatTipoIncapacidad(models.Model):
    """c_TipoIncapacidad. 01 Riesgo trabajo, 02 Enfermedad, 03 Maternidad."""
    clave = models.CharField(max_length=2, primary_key=True)
    descripcion = models.CharField(max_length=200)
    def __str__(self) -> str: return f"{self.clave} · {self.descripcion}"
