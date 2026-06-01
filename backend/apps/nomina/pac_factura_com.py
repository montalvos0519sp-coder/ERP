"""Cliente del PAC Factura.com (sandbox + produccion).

Usa la API REST documentada en https://api.factura.com/docs.
Maneja:
  - Timbrado de nomina (POST /v4/cfdi40/create + complemento nomina)
  - Cancelacion (POST /v4/cfdi40/cancel/{uuid})
  - Descarga XML/PDF (GET /v4/cfdi40/xml/{uuid} / /pdf/{uuid})

Credenciales requeridas (cargadas desde ConfigNominaEmpresa):
  - F-PLUGIN-API-KEY       (API key)
  - F-PLUGIN-SECRET-KEY    (secret)
  - F-Api-Key + F-Secret-Key se envian en headers
"""
from __future__ import annotations

import json
import logging
from typing import Any, Dict

import requests


log = logging.getLogger(__name__)


class FacturaComError(Exception):
    """Error generico devuelto por Factura.com."""

    def __init__(self, message: str, status: int = 0, payload: Any = None):
        super().__init__(message)
        self.status = status
        self.payload = payload


class FacturaComClient:
    """Cliente REST minimalista. No depende de SDK externo."""

    def __init__(self, *, api_key: str, secret_key: str, endpoint: str, sandbox: bool = True):
        self.api_key = api_key
        self.secret_key = secret_key
        self.endpoint = (endpoint or "https://sandbox.factura.com").rstrip("/")
        self.sandbox = sandbox

    @classmethod
    def from_config(cls, config) -> "FacturaComClient":
        return cls(
            api_key=config.pac_api_key,
            secret_key=config.pac_secret_key,
            endpoint=config.pac_endpoint,
            sandbox=config.pac_sandbox,
        )

    @property
    def headers(self) -> Dict[str, str]:
        return {
            "F-PLUGIN": "PROFESIONAL-ERP",
            "F-Api-Key": self.api_key,
            "F-Secret-Key": self.secret_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def _post(self, path: str, body: Dict[str, Any]) -> Dict[str, Any]:
        url = f"{self.endpoint}{path}"
        try:
            r = requests.post(url, headers=self.headers, json=body, timeout=60)
        except requests.RequestException as e:
            raise FacturaComError(f"No se pudo conectar al PAC: {e}") from e
        try:
            data = r.json()
        except ValueError:
            data = {"raw": r.text}
        if r.status_code >= 400:
            raise FacturaComError(
                f"PAC respondio {r.status_code}: {data}",
                status=r.status_code,
                payload=data,
            )
        return data

    def _get(self, path: str) -> Dict[str, Any]:
        url = f"{self.endpoint}{path}"
        try:
            r = requests.get(url, headers=self.headers, timeout=60)
        except requests.RequestException as e:
            raise FacturaComError(f"No se pudo conectar al PAC: {e}") from e
        try:
            data = r.json()
        except ValueError:
            data = {"raw": r.text}
        if r.status_code >= 400:
            raise FacturaComError(
                f"PAC respondio {r.status_code}: {data}",
                status=r.status_code,
                payload=data,
            )
        return data

    # ── Operaciones ────────────────────────────────────────────────────
    def timbrar_nomina(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Envia el JSON de la nomina al PAC para que lo timbre.

        payload sigue el esquema oficial de Factura.com (Nomina v4).
        Devuelve {uuid, xml, pdf_url, sello_sat, ...}.
        """
        return self._post("/v4/cfdi40/create", payload)

    def cancelar(self, uuid: str, motivo: str = "02", folio_sustituye: str = "") -> Dict[str, Any]:
        """Cancela un CFDI por UUID. motivo: 01-04 segun catalogo SAT."""
        body = {"motivo": motivo}
        if folio_sustituye:
            body["folioSustituye"] = folio_sustituye
        return self._post(f"/v4/cfdi40/cancel/{uuid}", body)

    def consultar(self, uuid: str) -> Dict[str, Any]:
        return self._get(f"/v4/cfdi40/{uuid}")

    def url_xml(self, uuid: str) -> str:
        return f"{self.endpoint}/v4/cfdi40/xml/{uuid}"

    def url_pdf(self, uuid: str) -> str:
        return f"{self.endpoint}/v4/cfdi40/pdf/{uuid}"


def construir_payload_factura_com(empresa, config, nomina, cfdi) -> Dict[str, Any]:
    """Convierte un NominaEmpleado al formato JSON que espera Factura.com.

    Esta es una simplificacion documentada. El esquema oficial completo
    esta en https://factura.com/api-docs/#nomina.
    """
    emp = nomina.empleado
    periodo = nomina.periodo

    percepciones = []
    deducciones = []
    otros_pagos = []
    for c in nomina.conceptos.all():
        if c.tipo == "P":
            percepciones.append({
                "TipoPercepcion": c.clave_sat,
                "Clave": c.clave_local or c.clave_sat,
                "Concepto": c.concepto,
                "ImporteGravado": str(c.importe_gravado),
                "ImporteExento": str(c.importe_exento),
            })
        elif c.tipo == "D":
            deducciones.append({
                "TipoDeduccion": c.clave_sat,
                "Clave": c.clave_local or c.clave_sat,
                "Concepto": c.concepto,
                "Importe": str(c.importe),
            })
        else:
            otros_pagos.append({
                "TipoOtroPago": c.clave_sat,
                "Clave": c.clave_local or c.clave_sat,
                "Concepto": c.concepto,
                "Importe": str(c.importe),
            })

    return {
        "Receptor": {
            "UID": "",  # Factura.com gestiona empleados por UID; si no, usa los datos.
            "RFC": emp.rfc,
            "Nombre": emp.nombre,
            "CP": emp.codigo_postal_fiscal or "",
            "RegimenFiscalReceptor": emp.regimen_fiscal or "605",
            "UsoCFDI": emp.uso_cfdi or "CN01",
        },
        "TipoDocumento": "nomina",
        "Serie": cfdi.serie or "N",
        "Folio": str(cfdi.folio or ""),
        "FormaPago": "99",
        "MetodoPago": "PUE",
        "Exportacion": "01",
        "LugarExpedicion": getattr(empresa, "cp_fiscal", "") or "00000",
        "Moneda": "MXN",
        "Nomina": {
            "TipoNomina": periodo.tipo_nomina,
            "FechaPago": periodo.fecha_pago.isoformat(),
            "FechaInicialPago": periodo.fecha_inicio.isoformat(),
            "FechaFinalPago": periodo.fecha_fin.isoformat(),
            "NumDiasPagados": str(nomina.dias_pagados),
            "TotalPercepciones": str(nomina.total_percepciones),
            "TotalDeducciones": str(nomina.total_deducciones),
            "TotalOtrosPagos": str(nomina.total_otros_pagos),
            "Emisor": {
                "RegistroPatronal": config.registro_patronal,
                "RfcPatronOrigen": config.rfc_patron_origen,
            },
            "Receptor": {
                "Curp": emp.curp,
                "TipoContrato": emp.tipo_contrato or "01",
                "Sindicalizado": "Si" if emp.sindicalizado else "No",
                "TipoJornada": emp.tipo_jornada or "01",
                "TipoRegimen": emp.tipo_regimen or "02",
                "NumEmpleado": emp.numero_empleado,
                "Departamento": (emp.puesto.departamento.nombre if emp.puesto and emp.puesto.departamento else "")[:100],
                "Puesto": (emp.puesto.nombre if emp.puesto else "")[:100],
                "RiesgoPuesto": emp.riesgo_puesto or config.riesgo_puesto_default or "1",
                "PeriodicidadPago": emp.periodicidad_pago or periodo.periodicidad_pago or "04",
                "Banco": emp.banco_clave or "",
                "CuentaBancaria": emp.cuenta_bancaria or "",
                "SalarioBaseCotApor": str(nomina.salario_base_cot_apor or emp.salario_base_cotizacion or 0),
                "SalarioDiarioIntegrado": str(nomina.salario_diario_integrado or emp.salario_diario_integrado or 0),
                "ClaveEntFed": emp.clave_entidad_federativa or "",
                "NumSeguridadSocial": emp.nss,
                "FechaInicioRelLaboral": emp.fecha_ingreso.isoformat() if emp.fecha_ingreso else "",
            },
            "Percepciones": percepciones,
            "Deducciones": deducciones,
            "OtrosPagos": otros_pagos,
        },
    }
