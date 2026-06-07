"""Views del modulo de Nomina.

Flujo:
  1. Admin captura ConfigNominaEmpresa (PAC + datos patronales).
  2. Crea PeriodoNomina (quincena/semana/mes).
  3. Carga recibos masivamente (uno por empleado activo) via /recibos-masivos.
  4. Calcula automaticamente (ISR, IMSS, subsidio) via /calcular.
  5. Edita conceptos manualmente si necesita.
  6. Cierra el periodo (estatus CALCULADO).
  7. Timbra: POST /cfdi/{id}/timbrar/ -> manda al PAC.
  8. Si el PAC responde OK guarda UUID, XML, sello, pdf_url.
  9. Para cancelar: POST /cfdi/{id}/cancelar/ con motivo SAT.
"""
from __future__ import annotations

import time
from datetime import datetime
from decimal import Decimal

from django.http import HttpResponse
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.rh.models import Empleado

from .calculo import calcular_nomina_basica
from .cfdi import construir_xml_cfdi_nomina
from .models import (
    BitacoraFiscalNomina, CFDINomina, ConceptoNomina, ConfigNominaEmpresa,
    IncidenciaNomina, NominaEmpleado, PeriodoNomina,
)
from .pac_factura_com import (
    FacturaComClient, FacturaComError, construir_payload_factura_com,
    construir_payload_payroll,
)
from .serializers import (
    BitacoraFiscalNominaSerializer, CFDINominaSerializer, ConceptoNominaSerializer,
    ConfigNominaEmpresaSerializer, IncidenciaNominaSerializer,
    NominaEmpleadoSerializer, PeriodoNominaSerializer,
)


def _buscar_registro(obj, employee_uid: str):
    """Busca recursivamente el registro del empleado (por employee_uid) en la
    respuesta de /payroll/{uid}/view."""
    employee_uid = (employee_uid or "").strip()
    encontrado = {}

    def walk(o):
        nonlocal encontrado
        if isinstance(o, dict):
            es_registro = "status_timbre" in o or "uuid" in o or "employee_uid" in o
            match = (o.get("employee_uid") or "").strip() == employee_uid
            if es_registro and (match or not employee_uid):
                encontrado = o
                return True
            for v in o.values():
                if walk(v):
                    return True
        elif isinstance(o, list):
            for v in o:
                if walk(v):
                    return True
        return False

    walk(obj)
    return encontrado


def _esperar_item_nomina(client, batch_uid: str, employee_uid: str, intentos: int = 6, espera: float = 2.0):
    """Consulta /payroll/{uid}/view hasta que el registro alcance un estado
    terminal (uuid timbrado o status_timbre de error)."""
    if not batch_uid:
        return {}
    item = {}
    for i in range(intentos):
        try:
            data = client.ver_nomina(batch_uid)
        except FacturaComError:
            data = {}
        item = _buscar_registro(data, employee_uid)
        estado = (item.get("status_timbre") or "").lower()
        if item.get("uuid") or estado in ("error", "timbrado", "cancelado"):
            return item
        if i < intentos - 1:
            time.sleep(espera)
    return item


class _EmpresaScoped(viewsets.ModelViewSet):
    """Aplica scoping multi-empresa."""

    permission_classes = [permissions.IsAuthenticated]
    empresa_field = "empresa"

    def get_queryset(self):
        qs = super().get_queryset()
        u = self.request.user
        if u.is_superuser:
            return qs
        ids = list(u.empresas.filter(activo=True).values_list("empresa_id", flat=True))
        return qs.filter(**{f"{self.empresa_field}__in": ids})


# ── Configuracion PAC ────────────────────────────────────────────────────
class ConfigNominaEmpresaViewSet(_EmpresaScoped):
    queryset = ConfigNominaEmpresa.objects.all()
    serializer_class = ConfigNominaEmpresaSerializer
    filterset_fields = ["empresa"]


# ── Periodos ────────────────────────────────────────────────────────────
class PeriodoNominaViewSet(_EmpresaScoped):
    queryset = PeriodoNomina.objects.all()
    serializer_class = PeriodoNominaSerializer
    filterset_fields = ["empresa", "estatus", "tipo_nomina"]

    def perform_create(self, serializer):
        serializer.save(creado_por=self.request.user)

    @action(detail=True, methods=["post"], url_path="cargar-empleados")
    def cargar_empleados(self, request, pk=None):
        """Crea un NominaEmpleado por cada empleado activo de la empresa."""
        periodo = self.get_object()
        empleados = Empleado.objects.filter(empresa=periodo.empresa, activo=True)
        creados = 0
        for emp in empleados:
            obj, was_created = NominaEmpleado.objects.get_or_create(
                periodo=periodo, empleado=emp,
                defaults={
                    "dias_pagados": Decimal(periodo.num_dias_pagados),
                    "salario_diario": emp.salario_diario or Decimal("0"),
                    "salario_diario_integrado": emp.salario_diario_integrado or Decimal("0"),
                    "salario_base_cot_apor": emp.salario_base_cotizacion or Decimal("0"),
                },
            )
            if was_created:
                creados += 1
        return Response({"creados": creados, "total": empleados.count()})

    @action(detail=True, methods=["post"])
    def calcular(self, request, pk=None):
        """Aplica el motor de calculo a todos los recibos del periodo."""
        periodo = self.get_object()
        actualizados = 0
        for nomina in periodo.recibos.all():
            # Borra conceptos previos calculados
            nomina.conceptos.filter(clave_local__startswith="AUTO_").delete()
            conceptos = calcular_nomina_basica(
                salario_diario=nomina.salario_diario or Decimal("0"),
                dias_pagados=nomina.dias_pagados or Decimal("0"),
                periodicidad=periodo.periodicidad_pago,
                sbc_mensual=nomina.salario_base_cot_apor or None,
            )
            for c in conceptos:
                ConceptoNomina.objects.create(
                    nomina=nomina, tipo=c.tipo, clave_sat=c.clave_sat,
                    clave_local=f"AUTO_{c.clave_sat}", concepto=c.concepto,
                    importe_gravado=c.importe_gravado, importe_exento=c.importe_exento,
                    importe=c.importe,
                )
            nomina.recalcular()
            actualizados += 1
        periodo.estatus = "CALCULADO"
        periodo.save(update_fields=["estatus"])
        return Response({"actualizados": actualizados})

    @action(detail=True, methods=["post"])
    def cerrar(self, request, pk=None):
        """Marca el periodo como CALCULADO (listo para timbrar)."""
        periodo = self.get_object()
        periodo.estatus = "CALCULADO"
        periodo.cerrado_en = datetime.now()
        periodo.save(update_fields=["estatus", "cerrado_en"])
        return Response(PeriodoNominaSerializer(periodo).data)


# ── Recibo individual ────────────────────────────────────────────────────
class NominaEmpleadoViewSet(viewsets.ModelViewSet):
    queryset = NominaEmpleado.objects.select_related(
        "empleado", "empleado__puesto", "empleado__puesto__departamento",
        "periodo",
    ).prefetch_related("conceptos", "incidencias")
    serializer_class = NominaEmpleadoSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["periodo", "empleado"]

    def get_queryset(self):
        qs = super().get_queryset()
        u = self.request.user
        if u.is_superuser:
            return qs
        ids = list(u.empresas.filter(activo=True).values_list("empresa_id", flat=True))
        return qs.filter(periodo__empresa_id__in=ids)

    @action(detail=True, methods=["post"])
    def recalcular(self, request, pk=None):
        n = self.get_object()
        n.recalcular()
        return Response(NominaEmpleadoSerializer(n).data)

    @action(detail=True, methods=["get"], url_path="xml-preview")
    def xml_preview(self, request, pk=None):
        """Devuelve el XML CFDI sin timbrar (vista previa).

        No requiere configuracion de PAC: si no existe, usa valores por
        defecto (serie "N", folio "1", sin registro patronal). El PAC solo
        es necesario para timbrar / cancelar.
        """
        n = self.get_object()
        empresa = n.periodo.empresa
        config = ConfigNominaEmpresa.objects.filter(empresa=empresa).first()

        # Usa la config si existe; si no, un placeholder en memoria con
        # los defaults razonables solo para construir el XML.
        if config is None:
            config = ConfigNominaEmpresa(
                empresa=empresa,
                serie_default="N",
                folio_actual=1,
                riesgo_puesto_default="1",
            )

        # CFDI borrador (lo necesitamos para serie/folio en el XML; sin
        # PAC todavia no se guarda nada real).
        cfdi, _ = CFDINomina.objects.get_or_create(
            nomina_empleado=n,
            defaults={
                "empresa": empresa,
                "serie": config.serie_default or "N",
                "folio": str(config.folio_actual or 1),
                "estatus": "BORRADOR",
                "creado_por": request.user,
            },
        )
        xml = construir_xml_cfdi_nomina(
            empresa=empresa, config=config, nomina=n, cfdi=cfdi,
        )
        return HttpResponse(xml, content_type="application/xml")


# ── Conceptos / incidencias (granular) ───────────────────────────────────
class ConceptoNominaViewSet(viewsets.ModelViewSet):
    queryset = ConceptoNomina.objects.all()
    serializer_class = ConceptoNominaSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["nomina", "tipo", "clave_sat"]

    def perform_create(self, serializer):
        obj = serializer.save()
        obj.nomina.recalcular()

    def perform_update(self, serializer):
        obj = serializer.save()
        obj.nomina.recalcular()

    def perform_destroy(self, instance):
        n = instance.nomina
        instance.delete()
        n.recalcular()


class IncidenciaNominaViewSet(viewsets.ModelViewSet):
    queryset = IncidenciaNomina.objects.all()
    serializer_class = IncidenciaNominaSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["nomina", "tipo"]


# ── CFDI Nomina (timbrar / cancelar / descargar) ────────────────────────
class CFDINominaViewSet(viewsets.ModelViewSet):
    queryset = CFDINomina.objects.select_related(
        "empresa", "nomina_empleado", "nomina_empleado__empleado",
        "nomina_empleado__periodo",
    )
    serializer_class = CFDINominaSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["empresa", "estatus", "nomina_empleado__periodo"]
    search_fields = ["uuid", "folio", "nomina_empleado__empleado__nombre"]

    def get_queryset(self):
        qs = super().get_queryset()
        u = self.request.user
        if u.is_superuser:
            return qs
        ids = list(u.empresas.filter(activo=True).values_list("empresa_id", flat=True))
        return qs.filter(empresa__in=ids)

    @action(detail=True, methods=["post"])
    def timbrar(self, request, pk=None):
        cfdi = self.get_object()
        empresa = cfdi.empresa
        config = ConfigNominaEmpresa.objects.filter(empresa=empresa).first()
        if not config:
            return Response({"detail": "Falta configurar los datos patronales de nómina."}, status=400)
        if cfdi.estatus == "TIMBRADO":
            return Response({"detail": "Ya esta timbrado.", "uuid": cfdi.uuid}, status=400)

        # Credenciales del PAC: las MISMAS que usan CP y facturas (config de empresa).
        client = FacturaComClient.from_empresa(empresa)
        if client is None:
            return Response({"detail": "PAC sin credenciales. Captúralas en Configuración de empresa."}, status=400)
        n = cfdi.nomina_empleado
        emisor_cp = getattr(getattr(empresa, "config", None), "emisor_cp", "") or ""

        # Factura.com timbra nómina por su API de payroll: grupo → empleado →
        # /payroll/create (asíncrono) → se consulta el UUID resultante.
        try:
            grupo = client.grupo_uid(getattr(empresa, "razon_social", "") or "Nómina ERP")
            emp_uid = client.sincronizar_empleado_payroll(
                n.empleado, grupo, fallback_cp=emisor_cp, patronal=config.registro_patronal or "",
            )
            if not emp_uid:
                return Response({"detail": "No se pudo registrar al empleado en el PAC (revisa RFC, CURP y NSS del empleado)."}, status=400)
            payload = construir_payload_payroll(
                empresa, config, n, grupo, emp_uid,
                serie_name=client.serie_nomina_name(config.serie_default or "NOM"),
            )
        except FacturaComError as e:
            return Response({"detail": f"No se pudo preparar la nómina en el PAC: {e}", "pac_payload": e.payload}, status=502)

        bitacora_kwargs = dict(cfdi=cfdi, accion="TIMBRAR", usuario=request.user, request_body=payload)
        try:
            resp = client.crear_nomina(payload)
        except FacturaComError as e:
            BitacoraFiscalNomina.objects.create(
                exitoso=False, error=str(e), response_body=e.payload or {}, **bitacora_kwargs,
            )
            cfdi.estatus = "ERROR"
            cfdi.error_pac = str(e)
            cfdi.respuesta_pac = e.payload or {}
            cfdi.save(update_fields=["estatus", "error_pac", "respuesta_pac"])
            return Response({"detail": str(e), "pac_payload": e.payload}, status=502)

        if (resp.get("response") or "").lower() == "error":
            msg = resp.get("message") or "Error del PAC al timbrar la nómina."
            BitacoraFiscalNomina.objects.create(exitoso=False, error=msg, response_body=resp, **bitacora_kwargs)
            cfdi.estatus = "ERROR"
            cfdi.error_pac = msg
            cfdi.respuesta_pac = resp
            cfdi.save(update_fields=["estatus", "error_pac", "respuesta_pac"])
            return Response({"detail": msg, "pac_payload": resp}, status=502)

        batch_uid = resp.get("uid") or resp.get("UID") or ""
        # La nómina se encola: consultamos el resultado para obtener el UUID.
        item = _esperar_item_nomina(client, batch_uid, emp_uid) or {}
        item_uid = item.get("uid") or item.get("UID") or ""
        status_timbre = (item.get("status_timbre") or "").lower()
        status_msg = item.get("status_message") or ""
        cfdi.uuid = item.get("uuid") or item.get("UUID") or ""
        cfdi.folio = str(item.get("folio") or cfdi.folio or "")
        cfdi.serie = item.get("serie") or cfdi.serie
        cfdi.respuesta_pac = {"create": resp, "item": item, "batch_uid": batch_uid, "payroll_item_uid": item_uid}

        if cfdi.uuid:
            cfdi.estatus = "TIMBRADO"
            cfdi.fecha_timbrado = datetime.now()
            cfdi.error_pac = ""
            cfdi.timbrado_por = request.user
            cfdi.save()
            config.folio_actual = (config.folio_actual or 0) + 1
            config.save(update_fields=["folio_actual"])
            BitacoraFiscalNomina.objects.create(exitoso=True, response_body={"create": resp, "item": item}, **bitacora_kwargs)
            return Response(CFDINominaSerializer(cfdi).data)

        if status_timbre == "error":
            cfdi.estatus = "ERROR"
            cfdi.error_pac = status_msg or "El PAC rechazó el timbrado de la nómina."
            cfdi.save(update_fields=["estatus", "error_pac", "serie", "folio", "respuesta_pac"])
            BitacoraFiscalNomina.objects.create(exitoso=False, error=cfdi.error_pac, response_body={"create": resp, "item": item}, **bitacora_kwargs)
            return Response({"detail": cfdi.error_pac, "pac_payload": item}, status=502)

        # Aún en cola: se timbrará en breve.
        cfdi.estatus = "EN_PROCESO"
        cfdi.save(update_fields=["estatus", "serie", "folio", "respuesta_pac"])
        BitacoraFiscalNomina.objects.create(exitoso=True, response_body={"create": resp, "item": item}, **bitacora_kwargs)
        return Response({
            "detail": "La nómina se envió a timbrado y está en proceso. Refresca en unos segundos.",
            "estatus": "EN_PROCESO", "uid": batch_uid,
            **CFDINominaSerializer(cfdi).data,
        })

    @action(detail=True, methods=["post"])
    def cancelar(self, request, pk=None):
        cfdi = self.get_object()
        if cfdi.estatus != "TIMBRADO" or not cfdi.uuid:
            return Response({"detail": "Solo se cancelan CFDIs timbrados."}, status=400)
        motivo = request.data.get("motivo", "02")
        sustituye = request.data.get("folio_sustituye", "")
        if motivo not in ("01", "02", "03", "04"):
            return Response({"detail": "Motivo invalido."}, status=400)
        if motivo == "01" and not sustituye:
            return Response({"detail": "Motivo 01 requiere folio_sustituye (UUID)."}, status=400)

        client = FacturaComClient.from_empresa(cfdi.empresa)
        if client is None:
            return Response({"detail": "PAC sin credenciales. Captúralas en Configuración de empresa."}, status=400)
        item_uid = (cfdi.respuesta_pac or {}).get("payroll_item_uid") or ""
        try:
            if item_uid:
                resp = client.cancelar_nomina(item_uid, motivo=motivo, folio_sustituto=sustituye)
            else:
                resp = client.cancelar(cfdi.uuid, motivo=motivo, folio_sustituye=sustituye)
        except FacturaComError as e:
            BitacoraFiscalNomina.objects.create(
                cfdi=cfdi, accion="CANCELAR", usuario=request.user,
                exitoso=False, error=str(e), response_body=e.payload or {},
            )
            return Response({"detail": str(e)}, status=502)

        cfdi.estatus = "CANCELADO"
        cfdi.motivo_cancelacion = motivo
        cfdi.folio_sustituye = sustituye
        cfdi.cancelado_por = request.user
        cfdi.fecha_cancelacion = datetime.now()
        cfdi.respuesta_pac = {**(cfdi.respuesta_pac or {}), "cancel": resp}
        cfdi.save()
        BitacoraFiscalNomina.objects.create(
            cfdi=cfdi, accion="CANCELAR", usuario=request.user,
            exitoso=True, response_body=resp,
        )
        return Response(CFDINominaSerializer(cfdi).data)

    @action(detail=True, methods=["get"], url_path="xml")
    def descargar_xml(self, request, pk=None):
        cfdi = self.get_object()
        if not cfdi.xml:
            return Response({"detail": "Sin XML disponible."}, status=404)
        resp = HttpResponse(cfdi.xml, content_type="application/xml")
        resp["Content-Disposition"] = f"attachment; filename=CFDI_{cfdi.uuid or cfdi.id}.xml"
        return resp

    @action(detail=True, methods=["get"], url_path="pdf-url")
    def pdf_url(self, request, pk=None):
        cfdi = self.get_object()
        if not cfdi.pdf_url:
            return Response({"detail": "Sin PDF (timbra primero)."}, status=404)
        return Response({"url": cfdi.pdf_url})


class BitacoraFiscalNominaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = BitacoraFiscalNomina.objects.all()
    serializer_class = BitacoraFiscalNominaSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["cfdi", "accion", "exitoso"]
