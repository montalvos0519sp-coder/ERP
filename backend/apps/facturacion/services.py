"""Orquestacion de timbrado y cancelacion CFDI 4.0.

Construye el payload generico CFDI a partir de la Factura/Pago en BD, lo pasa
al backend PAC configurado para la empresa, persiste el resultado y registra
en la bitacora.
"""
from __future__ import annotations

import logging
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP

from django.core.files.base import ContentFile
from django.db import transaction

from .models import Factura, Pago, Serie
from .pac import get_pac_backend, ResultadoTimbrado

logger = logging.getLogger(__name__)


def _proximo_folio(serie: Serie) -> int:
    """Reserva atomico-mente el siguiente folio de la serie."""
    serie = Serie.objects.select_for_update().get(pk=serie.pk)
    folio = serie.folio_actual
    serie.folio_actual = folio + 1
    serie.save(update_fields=["folio_actual"])
    return folio


def _imp(x) -> str:
    """Formatea un importe CFDI: 2 decimales (patron t_Importe del SAT)."""
    return str(Decimal(str(x)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def _val(x) -> str:
    """Valor unitario: 2 decimales (formato fijo, sin notacion cientifica)."""
    return f"{Decimal(str(x)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP):f}"


def build_payload_factura(factura: Factura) -> dict:
    """Convierte la Factura en BD al payload generico CFDI 4.0."""
    emp = factura.empresa
    cfg = emp.config
    cli = factura.cliente

    def concepto(c):
        base = (c.cantidad * c.precio_unitario) - c.descuento
        traslados = []
        if c.tasa_iva:
            traslados.append({
                "Base": _imp(base), "Impuesto": "002", "TipoFactor": "Tasa",
                "TasaOCuota": f"{c.tasa_iva:.6f}", "Importe": _imp(base * c.tasa_iva),
            })
        retenidos = []
        if c.retencion_iva:
            retenidos.append({
                "Base": _imp(base), "Impuesto": "002", "TipoFactor": "Tasa",
                "TasaOCuota": f"{c.retencion_iva:.6f}", "Importe": _imp(base * c.retencion_iva),
            })
        if c.retencion_isr:
            retenidos.append({
                "Base": _imp(base), "Impuesto": "001", "TipoFactor": "Tasa",
                "TasaOCuota": f"{c.retencion_isr:.6f}", "Importe": _imp(base * c.retencion_isr),
            })
        return {
            "ClaveProdServ": c.clave_prod_serv,
            "Cantidad": str(c.cantidad),
            "ClaveUnidad": c.clave_unidad,
            "Unidad": c.unidad or "",
            "Descripcion": c.descripcion,
            "ValorUnitario": _val(c.precio_unitario),
            "Importe": _imp(c.cantidad * c.precio_unitario),
            "Descuento": _imp(c.descuento),
            "ObjetoImp": c.objeto_imp,
            "Impuestos": {"Traslados": traslados, "Retenidos": retenidos},
        }

    payload = {
        "Receptor": {
            "UID": cli.uid_pac or "",
            "ResidenciaFiscal": "",
        },
        "TipoDocumento": "factura",
        "Conceptos": [concepto(c) for c in factura.conceptos.all()],
        "UsoCFDI": factura.uso_cfdi,
        "Serie": factura.pac_serie_id or factura.serie.pac_serie_id or "",
        "FormaPago": factura.forma_pago,
        "MetodoPago": factura.metodo_pago,
        "Moneda": factura.moneda,
        "TipoCambio": str(factura.tipo_cambio),
        "LugarExpedicion": factura.lugar_expedicion or cfg.emisor_cp,
        "EnviarCorreo": False,
    }
    return payload


def timbrar_factura(factura: Factura) -> ResultadoTimbrado:
    if factura.estado == "TIMBRADA":
        return ResultadoTimbrado(ok=True, folio_fiscal=factura.folio_fiscal, raw={"info": "ya timbrada"})

    factura.recalcular_totales()
    backend = get_pac_backend(factura.empresa)

    # Resolucion automatica de catalogos del PAC (solo Factura.com):
    #  - SerieID en Factura.com a partir del nombre de la serie local.
    #  - UID del receptor: se busca por RFC y si no existe se da de alta.
    if hasattr(backend, "sincronizar_cliente"):
        try:
            if not factura.serie.pac_serie_id:
                sid = backend.resolver_serie_id(factura.serie)
                if sid:
                    factura.serie.pac_serie_id = sid
                    factura.serie.save(update_fields=["pac_serie_id"])
            if not factura.cliente.uid_pac:
                uid = backend.sincronizar_cliente(factura.cliente)
                if uid:
                    factura.cliente.uid_pac = uid
                    factura.cliente.save(update_fields=["uid_pac"])
        except Exception:
            logger.exception("No se pudo sincronizar catalogos del PAC para factura %s", factura.pk)

    payload = build_payload_factura(factura)
    try:
        resultado = backend.timbrar_factura(payload)
    except Exception as e:  # red/SSL/PAC caido: error controlado, nunca 500.
        logger.exception("Fallo timbrado factura %s", factura.pk)
        resultado = ResultadoTimbrado(ok=False, error=f"No se pudo contactar al PAC: {e}")

    with transaction.atomic():
        factura.log_pac = {"request": payload, "response": resultado.raw or {}}
        if resultado.ok:
            factura.estado = "TIMBRADA"
            factura.folio_fiscal = resultado.folio_fiscal
            factura.pac_uid = resultado.pac_uid
            factura.fecha_timbrado = datetime.now()
            if resultado.xml:
                factura.xml.save(
                    f"{factura.serie.letra}-{factura.folio}.xml",
                    ContentFile(resultado.xml.encode("utf-8") if isinstance(resultado.xml, str) else resultado.xml),
                    save=False,
                )
        else:
            factura.estado = "ERROR"
        factura.save()

    # Bitacora.
    from apps.bitacora.utils import log_evento

    log_evento(
        user=factura.creado_por,
        empresa=factura.empresa,
        accion="timbrar_factura",
        descripcion=f"{factura.serie.letra}{factura.folio} → {resultado.folio_fiscal or resultado.error}",
        meta={"ok": resultado.ok, "folio_fiscal": resultado.folio_fiscal},
    )
    return resultado


def cancelar_factura(factura: Factura, motivo: str, sustitucion: str = "") -> ResultadoTimbrado:
    if factura.estado != "TIMBRADA":
        return ResultadoTimbrado(ok=False, error="La factura no esta timbrada.")
    backend = get_pac_backend(factura.empresa)
    res = backend.cancelar(factura.folio_fiscal, motivo, sustitucion)
    if res.ok:
        factura.estado = "CANCELADA"
        factura.motivo_cancelacion = motivo
        factura.folio_sustitucion = sustitucion
        factura.save(update_fields=["estado", "motivo_cancelacion", "folio_sustitucion"])
    return res


def build_payload_pago(pago: Pago) -> dict:
    """Payload genérico del complemento de pago (REP)."""
    return {
        "TipoComprobante": "P",
        "Serie": pago.serie.letra,
        "Folio": pago.folio,
        "FechaPago": pago.fecha_pago.isoformat() if pago.fecha_pago else None,
        "FormaPago": pago.forma_pago,
        "Moneda": pago.moneda,
        "TipoCambio": str(pago.tipo_cambio),
        "Monto": str(pago.monto),
        "NumOperacion": pago.numero_operacion,
        "DoctosRelacionados": [
            {
                "IdDocumento": d.factura.folio_fiscal,
                "Folio": f"{d.factura.serie.letra}{d.factura.folio}",
                "NumParcialidad": d.numero_parcialidad,
                "ImpSaldoAnt": str(d.saldo_anterior),
                "ImpPagado": str(d.importe_pagado),
                "ImpSaldoInsoluto": str(d.saldo_insoluto),
            }
            for d in pago.documentos.select_related("factura__serie").all()
        ],
    }


def timbrar_pago(pago: Pago) -> ResultadoTimbrado:
    if pago.estado == "TIMBRADA":
        return ResultadoTimbrado(ok=True, folio_fiscal=pago.folio_fiscal, raw={"info": "ya timbrado"})

    payload = build_payload_pago(pago)
    backend = get_pac_backend(pago.empresa)
    try:
        resultado = backend.timbrar_pago(payload)
    except Exception as e:  # red/SSL/PAC caido: error controlado, nunca 500.
        logger.exception("Fallo timbrado pago %s", pago.pk)
        resultado = ResultadoTimbrado(ok=False, error=f"No se pudo contactar al PAC: {e}")

    with transaction.atomic():
        pago.log_pac = {"request": payload, "response": resultado.raw or {}}
        if resultado.ok:
            pago.estado = "TIMBRADA"
            pago.folio_fiscal = resultado.folio_fiscal
            pago.pac_uid = resultado.pac_uid
            if resultado.xml:
                pago.xml.save(
                    f"REP-{pago.serie.letra}-{pago.folio}.xml",
                    ContentFile(resultado.xml.encode("utf-8") if isinstance(resultado.xml, str) else resultado.xml),
                    save=False,
                )
        else:
            pago.estado = "ERROR"
        pago.save()

    from apps.bitacora.utils import log_evento

    log_evento(
        user=getattr(pago, "creado_por", None),
        empresa=pago.empresa,
        accion="timbrar_pago",
        descripcion=f"REP {pago.serie.letra}{pago.folio} → {resultado.folio_fiscal or resultado.error}",
        meta={"ok": resultado.ok, "folio_fiscal": resultado.folio_fiscal},
    )
    return resultado
