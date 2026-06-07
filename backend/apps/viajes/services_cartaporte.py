"""Timbrado de la Carta Porte de un Viaje (CFDI 4.0 Traslado + Complemento CP 3.1).

Payload portado del timbrado de producción de MIGMAR (Factura.com /v4/cfdi40/create):
- Concepto simbólico de $1.00 (la CP es el comprobante del traslado, no del cobro).
- Receptor = cliente del viaje (con UID sincronizado en el PAC).
- CartaPorte 3.1 con IdCCP, Ubicaciones, Mercancias (material peligroso por
  catálogo SAT), Autotransporte y FiguraTransporte.
- Reintentos automáticos ante CP155 (catálogo de material peligroso).
Usa las credenciales del PAC de la empresa (ConfiguracionEmpresa) vía FacturaComBackend.
"""
from __future__ import annotations

import logging
import random
import uuid
from datetime import datetime
from decimal import Decimal

from django.conf import settings
from django.core.files.base import ContentFile
from django.db import transaction

from apps.facturacion.pac import get_pac_backend

logger = logging.getLogger(__name__)

ESTADOS_SAT = {
    "AGUASCALIENTES": "AGU", "BAJA CALIFORNIA": "BCN", "BAJA CALIFORNIA SUR": "BCS",
    "CAMPECHE": "CAM", "CHIAPAS": "CHP", "CHIHUAHUA": "CHH", "CIUDAD DE MEXICO": "CMX",
    "CIUDAD DE MÉXICO": "CMX", "CDMX": "CMX", "COAHUILA": "COA", "COLIMA": "COL",
    "DURANGO": "DUR", "GUANAJUATO": "GUA", "GUERRERO": "GRO", "HIDALGO": "HID",
    "JALISCO": "JAL", "MEXICO": "MEX", "ESTADO DE MEXICO": "MEX", "MÉXICO": "MEX",
    "MICHOACAN": "MIC", "MORELOS": "MOR", "NAYARIT": "NAY", "NUEVO LEON": "NLE",
    "NUEVO LEÓN": "NLE", "OAXACA": "OAX", "PUEBLA": "PUE", "QUERETARO": "QUE",
    "QUERÉTARO": "QUE", "QUINTANA ROO": "ROO", "SAN LUIS POTOSI": "SLP", "SINALOA": "SIN",
    "SONORA": "SON", "TABASCO": "TAB", "TAMAULIPAS": "TAM", "TLAXCALA": "TLA",
    "VERACRUZ": "VER", "YUCATAN": "YUC", "ZACATECAS": "ZAC",
}


def generar_idccp() -> str:
    parte1 = "".join(random.choices("abcdef0123456789", k=5))
    return f"CCC{parte1}{str(uuid.uuid4())[8:]}".upper()


def _estado_clave(val: str) -> str:
    v = str(val or "").upper().split("-")[0].split("|")[0].strip()
    if v and v.isalpha() and len(v) <= 4:
        return v[:3]
    return ESTADOS_SAT.get(v, v[:3])


def _clave_norm(clave) -> str:
    base = str(clave or "").strip().split(".")[0]
    if base.isdigit() and len(base) == 7:
        return "0" + base
    return base


def _domicilio(u) -> dict:
    d = {
        "Calle": u.calle or "CONOCIDO",
        "Estado": _estado_clave(u.estado),
        "Pais": "MEX",
        "CodigoPostal": str(u.codigo_postal or "").strip().zfill(5),
    }
    if u.numero_exterior:
        d["NumeroExterior"] = u.numero_exterior
    if u.numero_interior:
        d["NumeroInterior"] = u.numero_interior
    col = str(u.colonia or "").split("|")[0].strip()
    if col.isdigit() and len(col) <= 4:
        d["Colonia"] = col.zfill(4)
    mun = str(u.municipio or "").split("|")[0].strip()
    if mun.isdigit() and len(mun) == 3:
        d["Municipio"] = mun
    return d


def _catalogo_material_peligroso(mercancias):
    """Devuelve {clave_norm: '0'|'1'|'0,1'|''} desde SatClaveProdServCP."""
    cat = {}
    try:
        from apps.catalogos_sat.models import SatClaveProdServCP
        claves = {_clave_norm(m.clave_producto) for m in mercancias if m.clave_producto}
        variantes = set()
        for c in claves:
            variantes.update({c, c.lstrip("0") or "0", c.zfill(8)})
        db = {s.clave: (getattr(s, "material_peligroso", "") or "").strip()
              for s in SatClaveProdServCP.objects.filter(clave__in=variantes)}
        for c in claves:
            for v in {c, c.lstrip("0") or "0", c.zfill(8)}:
                if v in db:
                    cat[c] = db[v]
                    break
    except Exception:
        logger.exception("No se pudo leer catálogo material peligroso")
    return cat


def construir_payload_cp(viaje, cliente, cliente_uid: str, serie_cp_id) -> tuple[dict, dict]:
    """Arma el payload Factura.com (CFDI Traslado + CP 3.1). Devuelve (payload, catalogo_mp)."""
    emp = viaje.empresa
    cfg = getattr(emp, "config", None)
    rfc_emisor = (getattr(cfg, "emisor_rfc", "") or getattr(emp, "rfc", "") or "").upper()
    cp_emisor = getattr(cfg, "emisor_cp", "") or ""
    paradas = list(viaje.paradas.select_related("ubicacion").all())

    # ── Ubicaciones: primera = Origen (RFC emisor), resto = Destino (RFC cliente) ──
    ubicaciones = []
    total_distancia = 0.0
    for i, p in enumerate(paradas):
        if i == 0:
            ubicaciones.append({
                "TipoUbicacion": "Origen", "IDUbicacion": "OR000001",
                "RFCRemitenteDestinatario": rfc_emisor,
                "FechaHoraSalidaLlegada": (p.fecha_hora or viaje.fecha_viaje or datetime.now()).strftime("%Y-%m-%dT%H:%M:%S"),
                "Domicilio": _domicilio(p.ubicacion),
            })
        else:
            km = float(p.kms or 0)
            total_distancia += km
            ubicaciones.append({
                "TipoUbicacion": "Destino", "IDUbicacion": f"DE{str(i).zfill(6)}",
                "RFCRemitenteDestinatario": (cliente.rfc or "XAXX010101000").upper(),
                "FechaHoraSalidaLlegada": (p.fecha_hora or viaje.fecha_viaje or datetime.now()).strftime("%Y-%m-%dT%H:%M:%S"),
                "DistanciaRecorrida": f"{km:.2f}",
                "Domicilio": _domicilio(p.ubicacion),
            })

    # ── Mercancías (con material peligroso según catálogo SAT) ──
    mercs = list(viaje.mercancias.all())
    catalogo_mp = _catalogo_material_peligroso(mercs)
    mercancias_list = []
    peso_total = 0.0
    for m in mercs:
        peso = float(m.peso_kg or 0)
        peso_total += peso
        clave = _clave_norm(m.clave_producto)
        item = {
            "BienesTransp": clave,
            "Descripcion": m.descripcion,
            "Cantidad": f"{float(m.cantidad or 1):.2f}",
            "ClaveUnidad": m.unidad_medida or "H87",
            "PesoEnKg": f"{peso:.3f}",
            "Moneda": "MXN",
            "ValorMercancia": "0",
        }
        mp = (catalogo_mp.get(clave) or "").strip()
        if mp == "1":
            item["MaterialPeligroso"] = "Sí"
            if m.clave_material_peligroso:
                item["CveMaterialPeligroso"] = m.clave_material_peligroso
            if m.embalaje:
                item["Embalaje"] = m.embalaje
        elif mp == "0,1" and m.material_peligroso and m.clave_material_peligroso:
            item["MaterialPeligroso"] = "Sí"
            item["CveMaterialPeligroso"] = m.clave_material_peligroso
            if m.embalaje:
                item["Embalaje"] = m.embalaje
        mercancias_list.append(item)

    # ── Autotransporte (unidad de flota) ──
    unidad = viaje.unidad
    placas = str(getattr(unidad, "placas", "") or "").replace("-", "").replace(" ", "").upper()
    autotransporte = {
        "PermSCT": getattr(unidad, "permiso_sct", "") or "",
        "NumPermisoSCT": str(getattr(unidad, "numero_permiso_sct", "") or ""),
        "IdentificacionVehicular": {
            "ConfigVehicular": getattr(unidad, "config_vehicular", "") or "",
            "PlacaVM": placas,
            "AnioModeloVM": str(getattr(unidad, "anio", "") or ""),
            "PesoBrutoVehicular": str(getattr(unidad, "peso_bruto_vehicular", "") or "").replace(",", ""),
        },
        "Seguros": {
            "AseguraRespCivil": str(getattr(unidad, "aseguradora_resp_civil", "") or "").replace("/", " ").strip()[:50].upper(),
            "PolizaRespCivil": str(getattr(unidad, "poliza_resp_civil", "") or "").strip()[:30].upper(),
        },
    }

    # Remolques: obligatorios cuando la configuración vehicular los implica
    # (tractocamión + semirremolque). Se toman de la unidad de flota.
    def _placa(p):
        return str(p or "").replace("-", "").replace(" ", "").upper()
    remolques = []
    if getattr(unidad, "remolque1_subtipo", "") or getattr(unidad, "remolque1_placa", ""):
        remolques.append({"SubTipoRem": unidad.remolque1_subtipo or "", "Placa": _placa(unidad.remolque1_placa)})
    if getattr(unidad, "remolque2_subtipo", "") or getattr(unidad, "remolque2_placa", ""):
        remolques.append({"SubTipoRem": unidad.remolque2_subtipo or "", "Placa": _placa(unidad.remolque2_placa)})
    if remolques:
        autotransporte["Remolques"] = {"Remolque": remolques}

    # ── FiguraTransporte (operador) ──
    op = viaje.operador
    figura = {
        "TipoFigura": "01",
        "RFCFigura": (op.rfc or "").upper(),
        "NombreFigura": (op.nombre or "").upper(),
        "NumLicencia": str(op.licencia or "").strip().upper(),
    }
    # Domicilio de la figura: SAT exige Estado (clave c_Estado) cuando Pais=MEX.
    # El Operador no guarda estado, así que lo derivamos del CP vía catálogo SAT.
    # Si no se puede resolver el estado, se omite el Domicilio (es opcional en CP 3.1).
    if op.codigo_postal:
        cp_op = str(op.codigo_postal).strip().zfill(5)
        estado_op = ""
        try:
            from apps.catalogos_sat.models import SatCodigoPostal
            row = SatCodigoPostal.objects.filter(codigo_postal=cp_op).first()
            if row and row.estado:
                estado_op = _estado_clave(row.estado)
        except Exception:
            logger.exception("No se pudo resolver estado del CP del operador")
        if estado_op:
            figura["Domicilio"] = {"Estado": estado_op, "Pais": "MEX", "CodigoPostal": cp_op}

    # ── Concepto simbólico $1.00 ──
    es_pm = len(str(cliente.rfc or "").strip()) == 12
    subtotal, iva = 1.00, 0.16
    retencion = 0.04 if es_pm else 0.0
    uso_cfdi = cliente.uso_cfdi_default or "S01"
    if (cliente.rfc or "") in ("XEXX010101000", "XAXX010101000") or (cliente.regimen_fiscal or "") in ("616", "605", "629", "630"):
        uso_cfdi = "S01"

    concepto = {
        "ClaveProdServ": "78121603",
        "Cantidad": 1,
        "ClaveUnidad": "E48",
        "Descripcion": "Tarifa de los fletes",
        "ValorUnitario": f"{subtotal:.2f}",
        "Importe": f"{subtotal:.2f}",
        "ObjetoImp": "02",
        "Impuestos": {
            "Traslados": [{
                "Base": f"{subtotal:.2f}", "Impuesto": "002", "TipoFactor": "Tasa",
                "TasaOCuota": "0.160000", "Importe": f"{iva:.2f}",
            }],
        },
    }
    if retencion:
        concepto["Impuestos"]["Retenidos"] = [{
            "Base": f"{subtotal:.2f}", "Impuesto": "002", "TipoFactor": "Tasa",
            "TasaOCuota": "0.040000", "Importe": f"{retencion:.2f}",
        }]

    payload = {
        "Serie": serie_cp_id,
        "TipoDocumento": "factura",
        "LugarExpedicion": cp_emisor,
        "Exportacion": "01",
        "Moneda": "MXN",
        "FormaPago": "99",
        "MetodoPago": "PPD",
        "UsoCFDI": uso_cfdi,
        "Receptor": {
            "UID": cliente_uid,
            "RFC": (cliente.rfc or "").upper(),
            "Nombre": cliente.razon_social,
            "UsoCFDI": uso_cfdi,
            "RegimenFiscalReceptor": cliente.regimen_fiscal or "601",
            "DomicilioFiscalReceptor": cliente.cp_fiscal or cp_emisor,
        },
        "Conceptos": [concepto],
        "CartaPorte": {
            "Version": "3.1",
            "IdCCP": generar_idccp(),
            "TranspInternac": "No",
            "TotalDistRec": f"{total_distancia:.2f}",
            "Ubicaciones": {"Ubicacion": ubicaciones},
            "Mercancias": {
                "PesoBrutoTotal": f"{peso_total:.3f}",
                "UnidadPeso": "KGM",
                "NumTotalMercancias": len(mercancias_list),
                "Mercancia": mercancias_list,
                "Autotransporte": autotransporte,
            },
            "FiguraTransporte": {"TiposFigura": [figura]},
        },
    }
    return payload, catalogo_mp


def _resolver_serie_cp(viaje, backend):
    """ID de la serie de Carta Porte en Factura.com."""
    cfg = getattr(viaje.empresa, "config", None)
    sid = getattr(cfg, "pac_serie_cp_id", "") or getattr(settings, "FACTURA_SERIE_ID_CP", "")
    if sid:
        return sid
    # Auto-resolución: busca una serie cuyo nombre sugiera Carta Porte/Traslado.
    if hasattr(backend, "listar_series"):
        try:
            series = backend.listar_series()
            for s in series:
                nom = (s.get("SerieName") or "").upper()
                if any(k in nom for k in ("CP", "PORTE", "TRASLAD", "CARTA")):
                    return s.get("SerieID") or ""
            if series:
                return series[0].get("SerieID") or ""
        except Exception:
            logger.exception("No se pudo resolver serie CP")
    return ""


def _validar(viaje):
    if not viaje.cliente:
        return "El viaje no tiene cliente asignado (receptor de la Carta Porte)."
    if not (viaje.cliente.rfc and viaje.cliente.regimen_fiscal and viaje.cliente.cp_fiscal):
        return "El cliente requiere RFC, régimen fiscal y CP fiscal."
    if not viaje.operador:
        return "Asigna un operador al viaje."
    if not viaje.unidad:
        return "Asigna una unidad al viaje."
    if viaje.paradas.count() < 2:
        return "El itinerario necesita al menos origen y destino."
    if not viaje.mercancias.exists():
        return "Agrega al menos una mercancía."
    return None


def _sync_carta_porte(viaje):
    """Crea/actualiza el registro carta_porte.CartaPorte para guardar estado/UUID/XML."""
    from apps.carta_porte.models import Autotransporte, CartaPorte
    emp = viaje.empresa
    unidad = viaje.unidad
    auto, _ = Autotransporte.objects.get_or_create(
        empresa=emp, placas=unidad.placas or f"UNIDAD-{unidad.id}",
        defaults={
            "anio_modelo": unidad.anio or datetime.now().year,
            "config_vehicular": unidad.config_vehicular or "",
            "permiso_sct": unidad.permiso_sct or "",
            "numero_permiso": unidad.numero_permiso_sct or "",
            "aseguradora_resp_civil": unidad.aseguradora_resp_civil or "",
            "poliza_resp_civil": unidad.poliza_resp_civil or "",
        },
    )
    cp = viaje.carta_porte
    if cp is None:
        cp = CartaPorte.objects.create(
            empresa=emp, folio_interno=viaje.folio_carta or viaje.numero,
            autotransporte=auto, operador=viaje.operador,
            fecha_traslado=viaje.fecha_viaje or datetime.now(),
            total_distancia_rec=viaje.kms_totales or 0,
        )
        viaje.carta_porte = cp
        viaje.save(update_fields=["carta_porte"])
    return cp


def _es_cp155(raw) -> bool:
    msg = (raw or {}).get("message") if isinstance(raw, dict) else None
    if isinstance(msg, dict):
        return "CP155" in str(msg.get("message", ""))
    return "CP155" in str(msg or "")


def timbrar_viaje(viaje, forzar: bool = False) -> dict:
    err = _validar(viaje)
    if err:
        return {"ok": False, "error": err}
    cp = _sync_carta_porte(viaje)
    if cp.estado == "TIMBRADO" and not forzar:
        return {"ok": True, "uuid": cp.folio_fiscal, "info": "ya timbrada"}

    backend = get_pac_backend(viaje.empresa)
    cliente = viaje.cliente
    # UID del receptor en el PAC.
    cliente_uid = getattr(cliente, "uid_pac", "") or ""
    if not cliente_uid and hasattr(backend, "sincronizar_cliente"):
        try:
            cliente_uid = backend.sincronizar_cliente(cliente) or ""
            if cliente_uid:
                cliente.uid_pac = cliente_uid
                cliente.save(update_fields=["uid_pac"])
        except Exception:
            logger.exception("No se pudo sincronizar cliente en PAC")
    serie_cp_id = _resolver_serie_cp(viaje, backend)
    if not serie_cp_id:
        return {"ok": False, "error": "No hay serie de Carta Porte configurada. Define FACTURA_SERIE_ID_CP o el ID de serie CP en la configuración del PAC."}

    payload, catalogo_mp = construir_payload_cp(viaje, cliente, cliente_uid, serie_cp_id)

    from apps.facturacion.pac import ResultadoTimbrado

    def _post(p):
        try:
            return backend.timbrar_factura(p)
        except Exception as e:
            logger.exception("Fallo timbrado carta porte viaje %s", viaje.pk)
            return ResultadoTimbrado(ok=False, error=f"No se pudo contactar al PAC: {e}")

    res = _post(payload)

    # Reintento CP155: fuerza MaterialPeligroso="No" en claves '0,1' sin atributo;
    # si persiste, remueve todos los atributos MP de las mercancías.
    if not res.ok and _es_cp155(res.raw):
        for it in payload["CartaPorte"]["Mercancias"]["Mercancia"]:
            cl = str(it.get("BienesTransp") or "").strip()
            if (catalogo_mp.get(cl) or "").strip() == "0,1" and "MaterialPeligroso" not in it:
                it["MaterialPeligroso"] = "No"
        r2 = _post(payload)
        if r2.ok:
            res = r2
        elif _es_cp155(r2.raw):
            for it in payload["CartaPorte"]["Mercancias"]["Mercancia"]:
                for k in ("MaterialPeligroso", "CveMaterialPeligroso", "Embalaje", "DescripEmbalaje"):
                    it.pop(k, None)
            res = _post(payload)

    with transaction.atomic():
        if res.ok:
            from .models import TimbreViaje
            cp.estado = "TIMBRADO"
            cp.folio_fiscal = res.folio_fiscal
            if res.xml:
                cp.xml.save(
                    f"CP-{viaje.folio_carta or viaje.numero}-{(res.folio_fiscal or '')[:8]}.xml",
                    ContentFile(res.xml.encode("utf-8") if isinstance(res.xml, str) else res.xml),
                    save=False,
                )
            cp.save()
            TimbreViaje.objects.create(viaje=viaje, carta_porte=cp, uuid=res.folio_fiscal,
                                       estado="TIMBRADO", log={"response": res.raw or {}})
            if viaje.estado == "PLANIFICADO":
                viaje.estado = "EN_RUTA"
                viaje.save(update_fields=["estado"])
            return {"ok": True, "uuid": res.folio_fiscal}
        return {"ok": False, "error": res.error or "El PAC rechazó el timbrado.", "raw": res.raw}


def cancelar_viaje_cp(viaje, motivo: str = "02") -> dict:
    from .models import TimbreViaje
    cp = viaje.carta_porte
    if not cp or cp.estado != "TIMBRADO" or not cp.folio_fiscal:
        return {"ok": False, "error": "El viaje no tiene una Carta Porte timbrada vigente."}
    backend = get_pac_backend(viaje.empresa)
    try:
        res = backend.cancelar(cp.folio_fiscal, motivo)
    except Exception as e:
        logger.exception("Fallo cancelación carta porte viaje %s", viaje.pk)
        return {"ok": False, "error": f"No se pudo contactar al PAC: {e}"}
    if not res.ok:
        return {"ok": False, "error": res.error or "El PAC rechazó la cancelación.", "raw": res.raw}
    TimbreViaje.objects.filter(viaje=viaje, uuid=cp.folio_fiscal, estado="TIMBRADO").update(
        estado="CANCELADO", motivo_cancelacion=motivo)
    cp.estado = "CANCELADO"
    cp.save(update_fields=["estado"])
    return {"ok": True}
