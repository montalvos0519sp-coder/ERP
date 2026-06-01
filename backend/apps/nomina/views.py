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
)
from .serializers import (
    BitacoraFiscalNominaSerializer, CFDINominaSerializer, ConceptoNominaSerializer,
    ConfigNominaEmpresaSerializer, IncidenciaNominaSerializer,
    NominaEmpleadoSerializer, PeriodoNominaSerializer,
)


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
            return Response({"detail": "Falta configurar el PAC."}, status=400)
        if not (config.pac_api_key and config.pac_secret_key):
            return Response({"detail": "PAC sin credenciales (API Key / Secret)."}, status=400)
        if cfdi.estatus == "TIMBRADO":
            return Response({"detail": "Ya esta timbrado.", "uuid": cfdi.uuid}, status=400)

        n = cfdi.nomina_empleado
        client = FacturaComClient.from_config(config)
        payload = construir_payload_factura_com(empresa, config, n, cfdi)
        bitacora_kwargs = dict(cfdi=cfdi, accion="TIMBRAR", usuario=request.user, request_body=payload)
        try:
            resp = client.timbrar_nomina(payload)
        except FacturaComError as e:
            BitacoraFiscalNomina.objects.create(
                exitoso=False, error=str(e), response_body=e.payload or {}, **bitacora_kwargs,
            )
            cfdi.estatus = "ERROR"
            cfdi.error_pac = str(e)
            cfdi.respuesta_pac = e.payload or {}
            cfdi.save(update_fields=["estatus", "error_pac", "respuesta_pac"])
            return Response({"detail": str(e), "pac_payload": e.payload}, status=502)

        # Mapeo (Factura.com puede devolver "UUID" o "data.UUID")
        uuid = resp.get("UUID") or resp.get("uuid") or (resp.get("data") or {}).get("UUID")
        cfdi.uuid = uuid or ""
        cfdi.estatus = "TIMBRADO"
        cfdi.fecha_timbrado = datetime.now()
        cfdi.sello_sat = resp.get("SelloSAT") or (resp.get("data") or {}).get("SelloSAT") or ""
        cfdi.sello_cfdi = resp.get("SelloCFDI") or (resp.get("data") or {}).get("SelloCFDI") or ""
        cfdi.cadena_original = resp.get("CadenaOriginal") or ""
        cfdi.no_certificado_sat = resp.get("NoCertificadoSAT") or ""
        cfdi.xml = resp.get("xml") or resp.get("XML") or ""
        cfdi.pdf_url = resp.get("pdf") or resp.get("PDF") or ""
        cfdi.respuesta_pac = resp
        cfdi.timbrado_por = request.user
        cfdi.save()
        config.folio_actual = (config.folio_actual or 0) + 1
        config.save(update_fields=["folio_actual"])
        BitacoraFiscalNomina.objects.create(
            exitoso=True, response_body=resp, **bitacora_kwargs,
        )
        return Response(CFDINominaSerializer(cfdi).data)

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

        config = ConfigNominaEmpresa.objects.filter(empresa=cfdi.empresa).first()
        client = FacturaComClient.from_config(config)
        try:
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
