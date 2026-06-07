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

    def __init__(self, *, api_key: str, secret_key: str, endpoint: str, sandbox: bool = True, plugin: str = "9"):
        self.api_key = api_key
        self.secret_key = secret_key
        self.sandbox = sandbox
        self.plugin = plugin or "9"
        self.endpoint = self._normalizar_endpoint(endpoint, sandbox)

    @staticmethod
    def _normalizar_endpoint(endpoint: str, sandbox: bool) -> str:
        """La API REST de Factura.com vive bajo /api en sandbox
        (https://sandbox.factura.com/api) y bajo https://api.factura.com en
        produccion. Normaliza para evitar 404 por base mal configurada."""
        ep = (endpoint or "").rstrip("/")
        if not ep:
            ep = "https://sandbox.factura.com/api" if sandbox else "https://api.factura.com"
        if "sandbox.factura.com" in ep and not ep.endswith("/api"):
            ep = ep + "/api"
        return ep

    @classmethod
    def from_config(cls, config) -> "FacturaComClient":
        return cls(
            api_key=config.pac_api_key,
            secret_key=config.pac_secret_key,
            endpoint=config.pac_endpoint,
            sandbox=config.pac_sandbox,
        )

    @classmethod
    def from_empresa(cls, empresa) -> "FacturaComClient | None":
        """Usa las MISMAS credenciales del PAC que CP y facturas
        (core.ConfiguracionEmpresa, en /admin/configuracion/)."""
        cfg = getattr(empresa, "config", None)
        if cfg is None:
            from apps.core.models import ConfiguracionEmpresa
            cfg = ConfiguracionEmpresa.objects.filter(empresa=empresa).first()
        if not cfg or not (cfg.pac_api_key and cfg.pac_secret_key):
            return None
        return cls(
            api_key=cfg.pac_api_key,
            secret_key=cfg.pac_secret_key,
            endpoint=cfg.pac_base_url,
            sandbox=cfg.pac_sandbox,
            plugin=getattr(cfg, "pac_plugin", "9"),
        )

    @property
    def headers(self) -> Dict[str, str]:
        return {
            "F-PLUGIN": self.plugin,
            "F-Api-Key": self.api_key,
            "F-Secret-Key": self.secret_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def _verify_ssl(self):
        """En sandbox/pruebas no verificamos el certificado SSL: el host de
        pruebas del PAC suele tener una cadena incompleta y en Windows el
        bundle de certifi no trae el intermedio (CERTIFICATE_VERIFY_FAILED).
        En produccion se verifica normalmente."""
        if self.sandbox or "sandbox" in self.endpoint.lower():
            try:
                import urllib3
                urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
            except Exception:
                pass
            return False
        return True

    def _post(self, path: str, body: Dict[str, Any]) -> Dict[str, Any]:
        url = f"{self.endpoint}{path}"
        try:
            r = requests.post(url, headers=self.headers, json=body, timeout=60, verify=self._verify_ssl())
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
            r = requests.get(url, headers=self.headers, timeout=60, verify=self._verify_ssl())
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

    # ── Catalogos del PAC (series y receptores) ──────────────────────────
    def listar_series(self) -> list:
        try:
            data = self._get("/v4/series")
        except FacturaComError:
            return []
        return data.get("data") or []

    def resolver_serie_id(self, letra: str = "") -> str:
        """SerieID de Factura.com de la serie de NÓMINA.

        Prioriza por tipo de serie (SerieType == 'nomina'); el match por nombre
        es engañoso (p.ej. 'N' en Factura.com es nota_credito)."""
        series = self.listar_series()
        for s in series:
            if (s.get("SerieType") or "").strip().lower() == "nomina":
                return str(s.get("SerieID") or "")
        # Fallback: match exacto por nombre solo si se pidió uno.
        objetivo = (letra or "").strip().upper()
        if objetivo:
            for s in series:
                if (s.get("SerieName") or "").strip().upper() == objetivo:
                    return str(s.get("SerieID") or "")
        return ""

    def buscar_cliente_uid(self, rfc: str) -> str:
        rfc = (rfc or "").strip().upper()
        try:
            data = self._get("/v1/clients?per_page=100")
        except FacturaComError:
            return ""
        candidatos = [c for c in (data.get("data") or [])
                      if (c.get("RFC") or "").strip().upper() == rfc]
        for c in candidatos:
            if (c.get("RazonSocial") or "").strip():
                return c.get("UID") or ""
        return candidatos[0].get("UID") if candidatos else ""

    def _datos_receptor(self, emp, fallback_cp: str = "") -> Dict[str, Any]:
        return {
            "nombre": emp.nombre,
            "razons": emp.nombre,
            "rfc": (emp.rfc or "").strip().upper(),
            "regimen": emp.regimen_fiscal or "605",
            "codpos": emp.codigo_postal_fiscal or fallback_cp or "",
            "usocfdi": emp.uso_cfdi or "CN01",
            "email": getattr(emp, "email", "") or "correo@ejemplo.com",
            "pais": "MEX",
        }

    def crear_receptor_empleado(self, emp, fallback_cp: str = "") -> str:
        """Registra al empleado como receptor (cliente) en Factura.com."""
        try:
            data = self._post("/v1/clients/create", self._datos_receptor(emp, fallback_cp))
        except FacturaComError:
            return self.buscar_cliente_uid(emp.rfc)
        d = data.get("Data") or data.get("data") or {}
        uid = d.get("UID") if isinstance(d, dict) else ""
        return uid or self.buscar_cliente_uid(emp.rfc)

    def actualizar_receptor(self, uid: str, emp, fallback_cp: str = "") -> None:
        """Best-effort: actualiza datos fiscales del receptor (p.ej. CP)."""
        if not uid:
            return
        try:
            self._post(f"/v1/clients/{uid}/update", self._datos_receptor(emp, fallback_cp))
        except FacturaComError:
            pass

    def sincronizar_empleado(self, emp, fallback_cp: str = "") -> str:
        """Asegura que el empleado exista como receptor (con CP) y devuelve su UID."""
        uid = self.buscar_cliente_uid(emp.rfc)
        if not uid:
            uid = self.crear_receptor_empleado(emp, fallback_cp)
        else:
            # Mantiene el receptor al día (CP, régimen, uso) para evitar
            # rechazos por datos fiscales incompletos.
            self.actualizar_receptor(uid, emp, fallback_cp)
        return uid

    # ── Nómina (API de payroll de Factura.com) ───────────────────────────
    # Flujo: grupo de empleados → empleado → /payroll/create (async) → view.
    def grupo_uid(self, nombre: str = "Nómina ERP") -> str:
        nombre = (nombre or "Nómina ERP").strip()
        try:
            data = self._get("/payroll/employee/group/list")
        except FacturaComError:
            data = {}
        for g in (data.get("data") or []):
            if (g.get("nombre") or "").strip().lower() == nombre.lower():
                return g.get("uid") or ""
        resp = self._post("/payroll/employee/group/create", {"grupo": nombre})
        return resp.get("uid") or ""

    def buscar_empleado_payroll(self, rfc: str) -> str:
        rfc = (rfc or "").strip().upper()
        try:
            data = self._get("/payroll/employee/list")
        except FacturaComError:
            return ""
        for e in (data.get("data") or data.get("Data") or []):
            if (e.get("rfc") or e.get("RFC") or "").strip().upper() == rfc:
                return e.get("uid") or e.get("UID") or ""
        return ""

    def serie_nomina_name(self, default: str = "NOM") -> str:
        """Nombre de la serie de tipo 'nomina' configurada en Factura.com."""
        for s in self.listar_series():
            if (s.get("SerieType") or "").strip().lower() == "nomina":
                return s.get("SerieName") or default
        return default

    def crear_empleado_payroll(self, emp, grupo_uid: str, fallback_cp: str = "", patronal: str = "") -> str:
        partes = (emp.nombre or "").strip().split()
        nombre = partes[0] if partes else (emp.nombre or "Empleado")
        paterno = (getattr(emp, "apellido", "") or (partes[1] if len(partes) > 1 else "") or "N/A")
        body = {
            "grupo": grupo_uid,
            "no_empleado": emp.numero_empleado or str(emp.id),
            "nombre": nombre,
            "paterno": paterno,
            "materno": "",
            "metodo_pago": "99",
            "periodo": _periodo_pac(emp.periodicidad_pago),
            "regimen": emp.tipo_regimen or "02",
            "puesto": (emp.puesto.nombre if emp.puesto else "Empleado")[:100],
            "departamento": (emp.puesto.departamento.nombre if emp.puesto and emp.puesto.departamento else "General")[:100],
            "curp": emp.curp or "",
            "imss": emp.nss or "",
            "rfc": (emp.rfc or "").strip().upper(),
            "calle": "Sin calle",
            "colonia": "Centro",
            "no_ext": "0",
            "cp": emp.codigo_postal_fiscal or fallback_cp or "",
            "municipio": "N/A",
            "estado": emp.clave_entidad_federativa or "NLE",
            "tipo_contrato": emp.tipo_contrato or "01",
            "asimilados": "0",
            "patronal": patronal or "",
            "sindicalizado": "Sí" if emp.sindicalizado else "No",
            "entidad_emite": emp.clave_entidad_federativa or "NLE",
            "tipo_jornada": emp.tipo_jornada or "01",
            "riesgo": emp.riesgo_puesto or "1",
            "salario": str(emp.salario_diario or 0),
            "cuota_diaria": str(emp.salario_base_cotizacion or emp.salario_diario or 0),
            "inicio": emp.fecha_ingreso.isoformat() if emp.fecha_ingreso else "",
        }
        if emp.banco_clave:
            body["banco"] = emp.banco_clave
        if emp.clabe_interbancaria or emp.cuenta_bancaria:
            body["clabe"] = emp.clabe_interbancaria or emp.cuenta_bancaria
        data = self._post("/payroll/employee/create", body)
        d = data.get("data") or data.get("Data") or data
        if isinstance(d, dict):
            return d.get("uid") or d.get("UID") or ""
        return ""

    def sincronizar_empleado_payroll(self, emp, grupo_uid: str, fallback_cp: str = "", patronal: str = "") -> str:
        uid = self.buscar_empleado_payroll(emp.rfc)
        if not uid:
            uid = self.crear_empleado_payroll(emp, grupo_uid, fallback_cp, patronal=patronal)
        return uid

    def crear_nomina(self, body: Dict[str, Any]) -> Dict[str, Any]:
        return self._post("/payroll/create", body)

    def ver_nomina(self, uid: str) -> Dict[str, Any]:
        return self._get(f"/payroll/{uid}/view")

    def cancelar_nomina(self, uid: str, motivo: str = "02", folio_sustituto: str = "") -> Dict[str, Any]:
        body = {"motivo": motivo}
        if folio_sustituto:
            body["folioSustituto"] = folio_sustituto
        return self._post(f"/payroll/{uid}/item/cancel", body)


def _periodo_pac(periodicidad: str) -> str:
    """Mapea la periodicidad SAT al código de 'periodo' de Factura.com (01-05)."""
    p = (periodicidad or "").strip()
    return p if p in {"01", "02", "03", "04", "05"} else "04"


def construir_payload_payroll(empresa, config, nomina, grupo_uid: str, empleado_uid: str,
                              serie_name: str = "NOM", concepto: str = "") -> Dict[str, Any]:
    """Arma el cuerpo de POST /payroll/create para UN recibo (1 registro)."""
    emp = nomina.empleado
    periodo = nomina.periodo

    percepciones, deducciones = [], []
    for c in nomina.conceptos.all():
        if c.tipo == "P":
            percepciones.append({
                "tipo": c.clave_sat,
                "clave": c.clave_local or c.clave_sat,
                "descripcion": c.concepto,
                "exento": str(c.importe_exento or 0),
                "gravado": str(c.importe_gravado or 0),
            })
        elif c.tipo == "D":
            deducciones.append({
                "tipo": c.clave_sat,
                "clave": c.clave_local or c.clave_sat,
                "importe": str(c.importe or 0),
                "descripcion": c.concepto,
            })
    desc = concepto or (config.serie_default and f"Nómina {periodo.nombre}") or f"Nómina {periodo.nombre}"
    return {
        "grupo": grupo_uid,
        "fecha_pago": periodo.fecha_pago.isoformat(),
        "num_dias": str(nomina.dias_pagados or periodo.num_dias_pagados or 1),
        "inicial": periodo.fecha_inicio.isoformat(),
        "final": periodo.fecha_fin.isoformat(),
        "tipo_nomina": periodo.tipo_nomina or "O",
        "descripcion": desc[:100],
        "serie": serie_name or "NOM",
        "concepto": (desc or "Nómina")[:100],
        "identificador": f"REC-{nomina.id}",
        "version_cfdi": "4.0",
        "registros": [{
            "data": {
                "id": empleado_uid,
                "nombre": emp.nombre,
                "puesto": (emp.puesto.nombre if emp.puesto else "Empleado")[:100],
                "salario": str(emp.salario_diario) if emp.salario_diario else None,
                "dias": float(nomina.dias_pagados or 0),
            },
            "percepciones": percepciones,
            "deducciones": deducciones,
        }],
    }


def construir_payload_factura_com(empresa, config, nomina, cfdi, uid: str = "", serie_id: str = "") -> Dict[str, Any]:
    """Convierte un NominaEmpleado al formato JSON que espera Factura.com
    (POST /v4/cfdi40/create con complemento de Nomina 1.2).

    `uid`: UID del empleado-receptor en Factura.com (obligatorio para el PAC).
    `serie_id`: SerieID de Factura.com (si se resolvio).
    """
    emp = nomina.empleado
    periodo = nomina.periodo

    def _d(x):
        return f"{float(x or 0):.2f}"

    # Concepto unico del CFDI de nomina (ClaveProdServ 84111505 / ClaveUnidad ACT).
    percep = float(nomina.total_percepciones or 0)
    otros = float(nomina.total_otros_pagos or 0)
    deducc = float(nomina.total_deducciones or 0)
    total_concepto = percep + otros
    conceptos_cfdi = [{
        "ClaveProdServ": "84111505",
        "Cantidad": "1",
        "ClaveUnidad": "ACT",
        "Unidad": "Actividad",
        "Descripcion": "Pago de nómina",
        "ValorUnitario": _d(total_concepto),
        "Importe": _d(total_concepto),
        "Descuento": _d(deducc),
        "ObjetoImp": "01",
    }]

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

    lugar = (getattr(getattr(empresa, "config", None), "emisor_cp", "") or
             getattr(empresa, "cp_fiscal", "") or emp.codigo_postal_fiscal or "00000")

    payload = {
        "Receptor": {
            "UID": uid or "",
            "ResidenciaFiscal": "",
        },
        "TipoDocumento": "factura",
        "Conceptos": conceptos_cfdi,
        "UsoCFDI": emp.uso_cfdi or "CN01",
        "Serie": serie_id or cfdi.serie or "N",
        "FormaPago": "99",
        "MetodoPago": "PUE",
        "Exportacion": "01",
        "LugarExpedicion": lugar,
        "Moneda": "MXN",
        "EnviarCorreo": False,
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
    if not otros_pagos:
        payload["Nomina"].pop("OtrosPagos", None)
    return payload
