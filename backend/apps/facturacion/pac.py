"""Capa de integracion con PAC (Proveedor Autorizado de Certificacion).

Diseno: una clase base `PacBackend` y backends concretos por proveedor.
La empresa elige su PAC desde ConfiguracionEmpresa (pac_proveedor). El backend
se selecciona dinamicamente con `get_pac_backend(empresa)`.

Proveedores soportados:
  - facturacom (Factura.com) -- compatible con la implementacion del proyecto original.
  - manual (sin PAC, util para desarrollo/pruebas; devuelve XMLs simulados).
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Any

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


@dataclass
class ResultadoTimbrado:
    ok: bool
    folio_fiscal: str = ""
    pac_uid: str = ""
    xml: str = ""
    pdf_url: str = ""
    raw: dict | None = None
    error: str = ""


class PacBackend:
    """Interfaz base. Cada PAC implementa estos metodos."""

    def __init__(self, empresa) -> None:
        self.empresa = empresa
        self.config = getattr(empresa, "config", None)

    def timbrar_factura(self, payload: dict) -> ResultadoTimbrado:
        raise NotImplementedError

    def timbrar_pago(self, payload: dict) -> ResultadoTimbrado:
        raise NotImplementedError

    def cancelar(self, folio_fiscal: str, motivo: str, sustitucion: str = "") -> ResultadoTimbrado:
        raise NotImplementedError

    def descargar_xml(self, folio_fiscal: str) -> bytes:
        raise NotImplementedError

    def descargar_pdf(self, folio_fiscal: str) -> bytes:
        raise NotImplementedError


class FacturaComBackend(PacBackend):
    """Factura.com PAC integration (CFDI 4.0)."""

    def _headers(self) -> dict[str, str]:
        c = self.config
        return {
            "F-PLUGIN": c.pac_plugin or "9",
            "F-Api-Key": c.pac_api_key,
            "F-Secret-Key": c.pac_secret_key,
            "Content-Type": "application/json",
        }

    def _base(self) -> str:
        return (self.config.pac_base_url or "https://api.factura.com").rstrip("/")

    def _verify_ssl(self):
        """En sandbox/pruebas no verificamos el certificado SSL: el host de
        pruebas del PAC suele tener una cadena incompleta y en Windows el
        bundle de certifi no trae el intermedio (CERTIFICATE_VERIFY_FAILED).
        En produccion (sandbox apagado) se verifica normalmente."""
        base = (self.config.pac_base_url or "").lower()
        if getattr(self.config, "pac_sandbox", False) or "sandbox" in base:
            try:
                import urllib3
                urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
            except Exception:
                pass
            return False
        return True

    def _post(self, path: str, payload: dict) -> dict:
        url = f"{self._base()}{path}"
        logger.info("PAC POST %s", url)
        try:
            res = requests.post(url, headers=self._headers(), json=payload,
                                timeout=45, verify=self._verify_ssl())
            data = res.json() if res.content else {}
        except Exception as e:
            raise RuntimeError(f"Error de red con PAC: {e}") from e
        return data

    def _get(self, path: str) -> dict:
        url = f"{self._base()}{path}"
        try:
            res = requests.get(url, headers=self._headers(), timeout=45, verify=self._verify_ssl())
            return res.json() if res.content else {}
        except Exception as e:
            raise RuntimeError(f"Error de red con PAC: {e}") from e

    def timbrar_factura(self, payload: dict) -> ResultadoTimbrado:
        data = self._post("/v4/cfdi40/create", payload)
        if data.get("response") == "success":
            res = data.get("data") or data
            return ResultadoTimbrado(
                ok=True,
                folio_fiscal=res.get("UUID") or res.get("uuid", ""),
                pac_uid=res.get("uid", ""),
                xml=res.get("xml", ""),
                pdf_url=res.get("pdf", ""),
                raw=data,
            )
        return ResultadoTimbrado(ok=False, raw=data, error=str(data.get("message") or data))

    def timbrar_pago(self, payload: dict) -> ResultadoTimbrado:
        data = self._post("/v4/cfdi40/payment/create", payload)
        if data.get("response") == "success":
            res = data.get("data") or data
            return ResultadoTimbrado(
                ok=True,
                folio_fiscal=res.get("UUID", ""),
                pac_uid=res.get("uid", ""),
                xml=res.get("xml", ""),
                raw=data,
            )
        return ResultadoTimbrado(ok=False, raw=data, error=str(data.get("message") or data))

    def cancelar(self, folio_fiscal: str, motivo: str, sustitucion: str = "") -> ResultadoTimbrado:
        payload = {"motivo": motivo, "folioSustitucion": sustitucion}
        data = self._post(f"/v4/cfdi40/{folio_fiscal}/cancel", payload)
        ok = data.get("response") == "success"
        return ResultadoTimbrado(ok=ok, raw=data, folio_fiscal=folio_fiscal)

    def _descargar(self, folio_fiscal: str, tipo: str, firma: bytes) -> bytes:
        """Descarga xml/pdf del CFDI. Factura.com devuelve el archivo crudo o un
        JSON con el contenido en base64 (data.Content)."""
        import base64
        url = f"{self._base()}/v4/cfdi40/{folio_fiscal}/{tipo}"
        res = requests.get(url, headers=self._headers(), timeout=45, verify=self._verify_ssl())
        if res.status_code != 200:
            return b""
        if res.content[:len(firma)] == firma:
            return res.content
        try:
            datos = res.json()
        except Exception:
            return res.content
        contenido = (datos.get("data") or {}).get("Content") if isinstance(datos, dict) else None
        if contenido:
            try:
                return base64.b64decode(contenido)
            except Exception:
                return b""
        return b""

    def descargar_xml(self, folio_fiscal: str) -> bytes:
        return self._descargar(folio_fiscal, "xml", b"<?xml")

    def descargar_pdf(self, folio_fiscal: str) -> bytes:
        return self._descargar(folio_fiscal, "pdf", b"%PDF")

    def descargar_xml_pago(self, folio_fiscal: str) -> bytes:
        return self.descargar_xml(folio_fiscal)

    def descargar_pdf_pago(self, folio_fiscal: str) -> bytes:
        return self.descargar_pdf(folio_fiscal)

    # ── Resolucion de catalogos del PAC (series y clientes) ──────────────
    def listar_series(self) -> list[dict]:
        data = self._get("/v4/series")
        return data.get("data") or []

    def resolver_serie_id(self, serie) -> str:
        """Devuelve el SerieID de Factura.com que corresponde a la serie local
        (match por nombre). Devuelve '' si no existe en el PAC."""
        tipos_factura = {"I", "E", "T"}
        objetivo = (serie.letra or "").strip().upper()
        for s in self.listar_series():
            if (s.get("SerieName") or "").strip().upper() != objetivo:
                continue
            stype = (s.get("SerieType") or "").lower()
            if serie.tipo_comprobante in tipos_factura and stype != "factura":
                continue
            return str(s.get("SerieID") or "")
        return ""

    def buscar_cliente_uid(self, rfc: str) -> str:
        rfc = (rfc or "").strip().upper()
        data = self._get("/v1/clients?per_page=100")
        candidatos = [c for c in (data.get("data") or [])
                      if (c.get("RFC") or "").strip().upper() == rfc]
        # Preferimos un cliente con RazonSocial poblada (evita registros vacios).
        for c in candidatos:
            if (c.get("RazonSocial") or "").strip():
                return c.get("UID") or ""
        return candidatos[0].get("UID") if candidatos else ""

    def crear_cliente(self, cliente) -> str:
        """Registra el cliente en Factura.com y devuelve su UID."""
        payload = {
            "nombre": cliente.razon_social,
            "razons": cliente.razon_social,
            "rfc": (cliente.rfc or "").strip().upper(),
            "regimen": cliente.regimen_fiscal or "601",
            "codpos": cliente.cp_fiscal or "",
            "usocfdi": cliente.uso_cfdi_default or "G03",
            "email": cliente.email or "correo@ejemplo.com",
            "pais": cliente.pais or "MEX",
            "calle": cliente.calle or "",
            "numero_exterior": cliente.num_ext or "",
            "colonia": cliente.colonia or "",
        }
        data = self._post("/v1/clients/create", payload)
        uid = ""
        d = data.get("Data") or data.get("data") or {}
        if isinstance(d, dict):
            uid = d.get("UID") or ""
        if not uid:  # algunos responses no traen UID: lo buscamos por RFC.
            uid = self.buscar_cliente_uid(cliente.rfc)
        return uid

    def sincronizar_cliente(self, cliente) -> str:
        """Asegura que el cliente exista en el PAC y devuelve su UID
        (busca por RFC; si no existe, lo crea)."""
        uid = self.buscar_cliente_uid(cliente.rfc)
        if not uid:
            uid = self.crear_cliente(cliente)
        return uid


class ManualBackend(PacBackend):
    """Backend que NO timbra. Util para desarrollo y para empresas sin PAC todavia."""

    def timbrar_factura(self, payload: dict) -> ResultadoTimbrado:
        import uuid
        return ResultadoTimbrado(
            ok=True,
            folio_fiscal=str(uuid.uuid4()).upper(),
            pac_uid="MANUAL",
            xml=f"<!-- CFDI Manual sin timbrar -->\n{json.dumps(payload, default=str, indent=2)}",
            raw={"manual": True, "payload": payload},
        )

    def timbrar_pago(self, payload: dict) -> ResultadoTimbrado:
        return self.timbrar_factura(payload)

    def cancelar(self, folio_fiscal: str, motivo: str, sustitucion: str = "") -> ResultadoTimbrado:
        return ResultadoTimbrado(ok=True, folio_fiscal=folio_fiscal, raw={"manual": True, "motivo": motivo})

    def descargar_xml(self, folio_fiscal: str) -> bytes:
        return b"<!-- CFDI manual -->"

    def descargar_pdf(self, folio_fiscal: str) -> bytes:
        return b""


def get_pac_backend(empresa) -> PacBackend:
    """Devuelve el backend del PAC configurado para la empresa.

    Si no hay config o el PAC es 'manual', usa ManualBackend.
    """
    config = getattr(empresa, "config", None)
    if not config or config.pac_proveedor == "manual":
        return ManualBackend(empresa)
    if config.pac_proveedor == "facturacom":
        return FacturaComBackend(empresa)
    raise ValueError(f"PAC desconocido: {config.pac_proveedor}")
