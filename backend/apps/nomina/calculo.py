"""Calculo basico de nomina.

NOTA: las tablas de ISR/Subsidio cambian cada anio fiscal. Este modulo trae
una tabla 2024 incluida; para 2025+ debe actualizarse. La logica esta
desacoplada para poder reemplazar la tabla sin tocar las vistas.

Para una nomina seria se recomienda integrar con un proveedor especializado
o validar contra el simulador del SAT.
"""
from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from typing import List


D2 = Decimal("0.01")


def _r(x: Decimal) -> Decimal:
    return Decimal(x).quantize(D2, rounding=ROUND_HALF_UP)


# ── Tabla ISR mensual 2024 (DOF 27/dic/2023, articulo 96 LISR) ──────────
# (limite_inferior, limite_superior, cuota_fija, porcentaje)
TABLA_ISR_MENSUAL_2024 = [
    (Decimal("0.01"),       Decimal("746.04"),     Decimal("0.00"),     Decimal("0.0192")),
    (Decimal("746.05"),     Decimal("6332.05"),    Decimal("14.32"),    Decimal("0.0640")),
    (Decimal("6332.06"),    Decimal("11128.01"),   Decimal("371.83"),   Decimal("0.1088")),
    (Decimal("11128.02"),   Decimal("12935.82"),   Decimal("893.63"),   Decimal("0.1600")),
    (Decimal("12935.83"),   Decimal("15487.71"),   Decimal("1182.88"),  Decimal("0.1792")),
    (Decimal("15487.72"),   Decimal("31236.49"),   Decimal("1640.18"),  Decimal("0.2136")),
    (Decimal("31236.50"),   Decimal("49233.00"),   Decimal("5004.12"),  Decimal("0.2352")),
    (Decimal("49233.01"),   Decimal("93993.90"),   Decimal("9236.89"),  Decimal("0.3000")),
    (Decimal("93993.91"),   Decimal("125325.20"),  Decimal("22665.17"), Decimal("0.3200")),
    (Decimal("125325.21"),  Decimal("375975.61"),  Decimal("32691.18"), Decimal("0.3400")),
    (Decimal("375975.62"),  Decimal("99999999.00"), Decimal("117912.32"), Decimal("0.3500")),
]

# Tabla subsidio al empleo mensual 2024
TABLA_SUBSIDIO_MENSUAL_2024 = [
    (Decimal("0.01"),       Decimal("1768.96"),  Decimal("407.02")),
    (Decimal("1768.97"),    Decimal("2653.38"),  Decimal("406.83")),
    (Decimal("2653.39"),    Decimal("3472.84"),  Decimal("406.62")),
    (Decimal("3472.85"),    Decimal("3537.87"),  Decimal("392.77")),
    (Decimal("3537.88"),    Decimal("4446.15"),  Decimal("382.46")),
    (Decimal("4446.16"),    Decimal("4717.18"),  Decimal("354.23")),
    (Decimal("4717.19"),    Decimal("5335.42"),  Decimal("324.87")),
    (Decimal("5335.43"),    Decimal("6224.67"),  Decimal("294.63")),
    (Decimal("6224.68"),    Decimal("7113.90"),  Decimal("253.54")),
    (Decimal("7113.91"),    Decimal("7382.33"),  Decimal("217.61")),
    (Decimal("7382.34"),    Decimal("99999999.00"), Decimal("0.00")),
]


def calcular_isr(base_gravable_mensual: Decimal) -> Decimal:
    """Devuelve ISR mensual sobre la base gravable usando tabla 2024."""
    base = Decimal(base_gravable_mensual)
    if base <= 0:
        return Decimal("0")
    for li, ls, cf, pct in TABLA_ISR_MENSUAL_2024:
        if li <= base <= ls:
            excedente = base - li
            return _r(cf + excedente * pct)
    return _r(base * Decimal("0.35"))


def calcular_subsidio_empleo(base_mensual: Decimal) -> Decimal:
    """Devuelve subsidio mensual al empleo."""
    base = Decimal(base_mensual)
    for li, ls, monto in TABLA_SUBSIDIO_MENSUAL_2024:
        if li <= base <= ls:
            return _r(monto)
    return Decimal("0")


def calcular_imss_obrero(sbc_mensual: Decimal) -> Decimal:
    """IMSS obrero approximation: ~2.775% del SBC mensual."""
    return _r(Decimal(sbc_mensual) * Decimal("0.02775"))


@dataclass
class ConceptoCalculado:
    tipo: str       # P / D / O
    clave_sat: str
    concepto: str
    importe_gravado: Decimal = Decimal("0")
    importe_exento: Decimal = Decimal("0")
    importe: Decimal = Decimal("0")


def calcular_nomina_basica(
    salario_diario: Decimal,
    dias_pagados: Decimal,
    periodicidad: str = "04",
    sbc_mensual: Decimal | None = None,
) -> List[ConceptoCalculado]:
    """Calcula percepciones y deducciones basicas para un periodo.

    Genera:
      P-001 Sueldo
      D-002 ISR (calculado contra tabla mensual proyectada)
      D-001 IMSS Obrero
      O-002 Subsidio al empleo (si aplica)
    """
    sd = Decimal(salario_diario)
    dp = Decimal(dias_pagados)
    sueldo = _r(sd * dp)

    # Factor para mensualizar segun periodicidad (aprox para tabla mensual)
    factor_mes = {
        "01": Decimal("30.4"),   # diario -> mensual
        "02": Decimal("4.348"),  # semanal -> mensual
        "03": Decimal("2.174"),  # catorcenal
        "04": Decimal("2"),       # quincenal -> mensual
        "05": Decimal("1"),       # mensual
        "06": Decimal("0.5"),    # bimestral
    }.get(periodicidad, Decimal("2"))

    base_mensual = sueldo * factor_mes
    isr_mensual = calcular_isr(base_mensual)
    isr_periodo = _r(isr_mensual / factor_mes)

    subsidio_mensual = calcular_subsidio_empleo(base_mensual)
    subsidio_periodo = _r(subsidio_mensual / factor_mes)

    sbc = sbc_mensual if sbc_mensual is not None else sd * Decimal("30.4")
    imss_mensual = calcular_imss_obrero(sbc)
    imss_periodo = _r(imss_mensual / factor_mes)

    conceptos: List[ConceptoCalculado] = []
    conceptos.append(ConceptoCalculado(
        tipo="P", clave_sat="001", concepto="Sueldo",
        importe_gravado=sueldo, importe_exento=Decimal("0"), importe=sueldo,
    ))
    if isr_periodo > 0:
        conceptos.append(ConceptoCalculado(
            tipo="D", clave_sat="002", concepto="ISR", importe=isr_periodo,
        ))
    if imss_periodo > 0:
        conceptos.append(ConceptoCalculado(
            tipo="D", clave_sat="001", concepto="Seguridad social (IMSS)",
            importe=imss_periodo,
        ))
    if subsidio_periodo > 0:
        conceptos.append(ConceptoCalculado(
            tipo="O", clave_sat="002", concepto="Subsidio para el empleo",
            importe=subsidio_periodo,
        ))
    return conceptos
