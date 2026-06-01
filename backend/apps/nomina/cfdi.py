"""Generador de XML CFDI 4.0 + Complemento Nomina 1.2.

Esta es una implementacion de referencia. El XML final lo firma y timbra el
PAC (Factura.com o similar). Aqui solo construimos la estructura SAT.
"""
from __future__ import annotations

from decimal import Decimal
from datetime import datetime
from xml.etree import ElementTree as ET
from xml.etree.ElementTree import Element, SubElement


NS_CFDI = "http://www.sat.gob.mx/cfd/4"
NS_NOMINA = "http://www.sat.gob.mx/nomina12"
NS_XSI = "http://www.w3.org/2001/XMLSchema-instance"


def _f(d) -> str:
    """Formatea Decimal a 2 decimales sin notacion cientifica."""
    return f"{Decimal(d):.2f}"


def construir_xml_cfdi_nomina(
    *,
    empresa,
    config,
    nomina,
    cfdi,
    incluir_sello: bool = False,
) -> str:
    """Construye el XML del CFDI 4.0 con complemento Nomina 1.2 (sin sellar).

    El sellado y timbrado los hace el PAC.
    """
    emp = nomina.empleado
    periodo = nomina.periodo

    # Subtotales del CFDI
    subtotal = nomina.total_percepciones + nomina.total_otros_pagos
    descuento = nomina.total_deducciones

    # ── <Comprobante> ──────────────────────────────────────────────────
    root = Element("cfdi:Comprobante", {
        "xmlns:cfdi": NS_CFDI,
        "xmlns:nomina12": NS_NOMINA,
        "xmlns:xsi": NS_XSI,
        "xsi:schemaLocation": (
            "http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd "
            "http://www.sat.gob.mx/nomina12 http://www.sat.gob.mx/sitio_internet/cfd/nomina/nomina12.xsd"
        ),
        "Version": "4.0",
        "Serie": cfdi.serie or "N",
        "Folio": str(cfdi.folio or ""),
        "Fecha": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        "FormaPago": "99",
        "SubTotal": _f(subtotal),
        "Descuento": _f(descuento),
        "Moneda": "MXN",
        "Total": _f(nomina.total_neto),
        "TipoDeComprobante": "N",
        "MetodoPago": "PUE",
        "LugarExpedicion": getattr(empresa, "cp_fiscal", "") or "00000",
        "Exportacion": "01",
    })

    # ── <Emisor> ──────────────────────────────────────────────────────
    SubElement(root, "cfdi:Emisor", {
        "Rfc": empresa.rfc or "",
        "Nombre": getattr(empresa, "razon_social", "") or getattr(empresa, "nombre_comercial", "") or "",
        "RegimenFiscal": getattr(empresa, "regimen_fiscal", "") or "601",
    })

    # ── <Receptor> ────────────────────────────────────────────────────
    SubElement(root, "cfdi:Receptor", {
        "Rfc": emp.rfc or "XAXX010101000",
        "Nombre": emp.nombre or "",
        "DomicilioFiscalReceptor": emp.codigo_postal_fiscal or "00000",
        "RegimenFiscalReceptor": emp.regimen_fiscal or "605",
        "UsoCFDI": emp.uso_cfdi or "CN01",
    })

    # ── <Conceptos> (un solo concepto fijo de nomina) ────────────────
    conceptos = SubElement(root, "cfdi:Conceptos")
    SubElement(conceptos, "cfdi:Concepto", {
        "ClaveProdServ": "84111505",
        "Cantidad": "1",
        "ClaveUnidad": "ACT",
        "Descripcion": "Pago de nomina",
        "ValorUnitario": _f(subtotal),
        "Importe": _f(subtotal),
        "Descuento": _f(descuento),
        "ObjetoImp": "01",
    })

    # ── <Complemento><nomina12:Nomina> ───────────────────────────────
    complemento = SubElement(root, "cfdi:Complemento")
    nomina_node = SubElement(complemento, "nomina12:Nomina", {
        "Version": "1.2",
        "TipoNomina": periodo.tipo_nomina,
        "FechaPago": periodo.fecha_pago.isoformat(),
        "FechaInicialPago": periodo.fecha_inicio.isoformat(),
        "FechaFinalPago": periodo.fecha_fin.isoformat(),
        "NumDiasPagados": _f(nomina.dias_pagados),
        "TotalPercepciones": _f(nomina.total_percepciones),
        "TotalDeducciones": _f(nomina.total_deducciones),
        "TotalOtrosPagos": _f(nomina.total_otros_pagos),
    })

    # Emisor patronal
    SubElement(nomina_node, "nomina12:Emisor", {
        "RegistroPatronal": config.registro_patronal or "",
        "RfcPatronOrigen": config.rfc_patron_origen or "",
    } if (config.registro_patronal or config.rfc_patron_origen) else {})

    # Receptor (empleado)
    receptor_attrs = {
        "Curp": emp.curp or "",
        "TipoContrato": emp.tipo_contrato or "01",
        "Sindicalizado": "Si" if emp.sindicalizado else "No",
        "TipoJornada": emp.tipo_jornada or "01",
        "TipoRegimen": emp.tipo_regimen or "02",
        "NumEmpleado": emp.numero_empleado or "",
        "Departamento": getattr(emp.puesto.departamento, "nombre", "")[:100] if emp.puesto and emp.puesto.departamento else "",
        "Puesto": emp.puesto.nombre[:100] if emp.puesto else "",
        "RiesgoPuesto": emp.riesgo_puesto or config.riesgo_puesto_default or "1",
        "PeriodicidadPago": emp.periodicidad_pago or periodo.periodicidad_pago or "04",
        "SalarioBaseCotApor": _f(nomina.salario_base_cot_apor or emp.salario_base_cotizacion or 0),
        "SalarioDiarioIntegrado": _f(nomina.salario_diario_integrado or emp.salario_diario_integrado or 0),
        "ClaveEntFed": emp.clave_entidad_federativa or "",
        "NumSeguridadSocial": emp.nss or "",
        "FechaInicioRelLaboral": emp.fecha_ingreso.isoformat() if emp.fecha_ingreso else "",
        "Antigüedad": f"P{max(1, (periodo.fecha_pago - emp.fecha_ingreso).days // 7)}W" if emp.fecha_ingreso else "",
    }
    if emp.banco_clave:
        receptor_attrs["Banco"] = emp.banco_clave
    if emp.cuenta_bancaria:
        receptor_attrs["CuentaBancaria"] = emp.cuenta_bancaria
    # Limpiar vacios para evitar atributos en blanco
    receptor_attrs = {k: v for k, v in receptor_attrs.items() if v not in ("", None)}
    SubElement(nomina_node, "nomina12:Receptor", receptor_attrs)

    # Percepciones
    percepciones = [c for c in nomina.conceptos.all() if c.tipo == "P"]
    if percepciones:
        total_gravado = sum((c.importe_gravado for c in percepciones), Decimal("0"))
        total_exento = sum((c.importe_exento for c in percepciones), Decimal("0"))
        per_node = SubElement(nomina_node, "nomina12:Percepciones", {
            "TotalSueldos": _f(sum((c.importe for c in percepciones if c.clave_sat == "001"), Decimal("0"))),
            "TotalGravado": _f(total_gravado),
            "TotalExento": _f(total_exento),
        })
        for c in percepciones:
            SubElement(per_node, "nomina12:Percepcion", {
                "TipoPercepcion": c.clave_sat,
                "Clave": c.clave_local or c.clave_sat,
                "Concepto": c.concepto[:100],
                "ImporteGravado": _f(c.importe_gravado),
                "ImporteExento": _f(c.importe_exento),
            })

    # Deducciones
    deducciones = [c for c in nomina.conceptos.all() if c.tipo == "D"]
    if deducciones:
        total_otras = sum((c.importe for c in deducciones if c.clave_sat != "002"), Decimal("0"))
        total_isr = sum((c.importe for c in deducciones if c.clave_sat == "002"), Decimal("0"))
        ded_node = SubElement(nomina_node, "nomina12:Deducciones", {
            "TotalOtrasDeducciones": _f(total_otras),
            "TotalImpuestosRetenidos": _f(total_isr),
        })
        for c in deducciones:
            SubElement(ded_node, "nomina12:Deduccion", {
                "TipoDeduccion": c.clave_sat,
                "Clave": c.clave_local or c.clave_sat,
                "Concepto": c.concepto[:100],
                "Importe": _f(c.importe),
            })

    # Otros pagos
    otros = [c for c in nomina.conceptos.all() if c.tipo == "O"]
    if otros:
        otros_node = SubElement(nomina_node, "nomina12:OtrosPagos")
        for c in otros:
            otro = SubElement(otros_node, "nomina12:OtroPago", {
                "TipoOtroPago": c.clave_sat,
                "Clave": c.clave_local or c.clave_sat,
                "Concepto": c.concepto[:100],
                "Importe": _f(c.importe),
            })
            # Subsidio al empleo (clave 002) requiere nodo SubsidioAlEmpleo
            if c.clave_sat == "002":
                SubElement(otro, "nomina12:SubsidioAlEmpleo", {
                    "SubsidioCausado": _f(c.importe),
                })

    return ET.tostring(root, encoding="unicode")
