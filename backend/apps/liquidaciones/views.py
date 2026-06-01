"""Vistas de Liquidaciones de Operador.

Compatibles con el frontend del proyecto 3rrecycling-next-main:
  - GET    /api/liquidaciones/liquidaciones/                (list + filtros)
  - POST   /api/liquidaciones/liquidaciones/                (create + folio + viajes)
  - GET    /api/liquidaciones/liquidaciones/{id}/           (detalle con conceptos)
  - PATCH  /api/liquidaciones/liquidaciones/{id}/           (estado, fecha_pago, obs)
  - DELETE /api/liquidaciones/liquidaciones/{id}/
  - GET    /api/liquidaciones/liquidaciones/{id}/pdf/       (PDF descarga)
  - GET    /api/liquidaciones/liquidaciones/export-excel/   (Excel filtrado)
  - GET    /api/liquidaciones/viajes-pendientes/?operador_id&fecha_inicio&fecha_fin
  - POST   /api/liquidaciones/liquidaciones/{id}/conceptos/ (agregar concepto)
  - PATCH  /api/liquidaciones/conceptos/{id}/
  - DELETE /api/liquidaciones/conceptos/{id}/
"""
from __future__ import annotations

import io
from datetime import date
from decimal import Decimal

from django.db.models import Q, Sum
from django.http import FileResponse, HttpResponse
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.viajes.models import Viaje

from .models import ConceptoLiquidacion, LiquidacionOperador
from .serializers import ConceptoLiquidacionSerializer, LiquidacionOperadorSerializer


def _siguiente_folio(empresa_id: int) -> str:
    """Devuelve el siguiente folio LIQ-NNNN para la empresa."""
    ult = (
        LiquidacionOperador.objects.filter(empresa_id=empresa_id, folio__startswith="LIQ-")
        .order_by("-id").values_list("folio", flat=True).first()
    )
    n = 1
    if ult:
        try:
            n = int(ult.split("-")[-1]) + 1
        except (ValueError, IndexError):
            n = LiquidacionOperador.objects.filter(empresa_id=empresa_id).count() + 1
    return f"LIQ-{n:04d}"


def _sueldo_operador(viaje: Viaje) -> Decimal:
    """Devuelve el sueldo a pagar al operador por este viaje.

    Por defecto: 10% de la tarifa. Se puede sobreescribir agregando un campo
    `sueldo_operador` al modelo Viaje en el futuro.
    """
    sueldo = getattr(viaje, "sueldo_operador", None)
    if sueldo is not None:
        return Decimal(sueldo)
    return (viaje.tarifa or Decimal("0")) * Decimal("0.10")


def _empresas_user(user):
    if user.is_superuser:
        return None
    return list(user.empresas.filter(activo=True).values_list("empresa_id", flat=True))


class LiquidacionOperadorViewSet(viewsets.ModelViewSet):
    queryset = LiquidacionOperador.objects.select_related("operador", "empresa").prefetch_related("conceptos__viaje")
    serializer_class = LiquidacionOperadorSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["empresa", "operador", "estado"]
    search_fields = ["folio", "operador__nombre", "operador__rfc"]

    def get_queryset(self):
        qs = super().get_queryset()
        u = self.request.user
        empresas = _empresas_user(u)
        if empresas is not None:
            qs = qs.filter(empresa_id__in=empresas)
        # Filtros propios
        p = self.request.query_params
        if p.get("fecha_desde"):
            qs = qs.filter(fecha_inicio__gte=p["fecha_desde"])
        if p.get("fecha_hasta"):
            qs = qs.filter(fecha_fin__lte=p["fecha_hasta"])
        if p.get("origen_id"):
            qs = qs.filter(conceptos__viaje__origen_id=p["origen_id"]).distinct()
        if p.get("destino_id"):
            qs = qs.filter(conceptos__viaje__destino_id=p["destino_id"]).distinct()
        return qs

    # ── Crear con folio + viajes auto ─────────────────────────────────
    def create(self, request, *args, **kwargs):
        operador_id = request.data.get("operador_id") or request.data.get("operador")
        fecha_inicio = request.data.get("fecha_inicio")
        fecha_fin = request.data.get("fecha_fin")
        observaciones = request.data.get("observaciones") or ""
        empresa_id = request.data.get("empresa")

        if not operador_id or not fecha_inicio or not fecha_fin:
            return Response({"detail": "operador, fecha_inicio y fecha_fin son obligatorios."}, status=400)

        # Inferir empresa del operador si no se mando
        from apps.carta_porte.models import Operador
        try:
            operador = Operador.objects.get(pk=operador_id)
        except Operador.DoesNotExist:
            return Response({"detail": "Operador no encontrado."}, status=404)
        if not empresa_id:
            empresa_id = operador.empresa_id

        folio = _siguiente_folio(empresa_id)
        liq = LiquidacionOperador.objects.create(
            empresa_id=empresa_id, operador=operador,
            folio=folio, fecha_inicio=fecha_inicio, fecha_fin=fecha_fin,
            observaciones=observaciones, estado="BORRADOR",
        )

        # Cargar viajes pendientes del operador en el rango → conceptos VIAJE
        viajes = (
            Viaje.objects.filter(
                operador=operador,
                fecha_salida__date__gte=fecha_inicio,
                fecha_salida__date__lte=fecha_fin,
                estado__in=["ENTREGADO", "EN_TRANSITO"],
            )
            .exclude(liquidacion_conceptos__liquidacion__empresa_id=empresa_id)
            .select_related("origen", "destino")
        )
        for v in viajes:
            ConceptoLiquidacion.objects.create(
                liquidacion=liq, tipo="VIAJE",
                descripcion=f"Viaje {v.numero}: {v.origen.nombre_lugar if hasattr(v.origen, 'nombre_lugar') else v.origen} → {v.destino.nombre_lugar if hasattr(v.destino, 'nombre_lugar') else v.destino}",
                monto=_sueldo_operador(v),
                viaje=v,
            )
        liq.recalcular()
        return Response(LiquidacionOperadorSerializer(liq).data, status=201)

    # ── Agregar concepto manual (extra/descuento) ─────────────────────
    @action(detail=True, methods=["post"], url_path="conceptos")
    def agregar_concepto(self, request, pk=None):
        liq = self.get_object()
        if liq.estado in ("PAGADA", "CANCELADA"):
            return Response({"detail": "No se pueden agregar conceptos a una liquidacion bloqueada."}, status=400)
        ser = ConceptoLiquidacionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        ser.save(liquidacion=liq)
        liq.recalcular()
        return Response(LiquidacionOperadorSerializer(liq).data, status=201)

    # ── PDF descarga ──────────────────────────────────────────────────
    @action(detail=True, methods=["get"], url_path="pdf")
    def descargar_pdf(self, request, pk=None):
        liq = self.get_object()
        buf = io.BytesIO()
        try:
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import letter
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.units import cm
            from reportlab.platypus import (
                SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
            )
        except ImportError:
            return Response({"detail": "reportlab no instalado."}, status=500)

        doc = SimpleDocTemplate(buf, pagesize=letter, topMargin=1.5 * cm, bottomMargin=1.5 * cm)
        styles = getSampleStyleSheet()
        title = ParagraphStyle("T", parent=styles["Heading1"], textColor=colors.HexColor("#047857"))
        elems = []
        elems.append(Paragraph(f"Liquidacion {liq.folio}", title))
        elems.append(Paragraph(f"<b>Operador:</b> {liq.operador}", styles["Normal"]))
        elems.append(Paragraph(
            f"<b>Periodo:</b> {liq.fecha_inicio} a {liq.fecha_fin} &nbsp; <b>Estado:</b> {liq.get_estado_display()}",
            styles["Normal"],
        ))
        if liq.fecha_pago:
            elems.append(Paragraph(f"<b>Fecha de pago:</b> {liq.fecha_pago}", styles["Normal"]))
        elems.append(Spacer(1, 0.4 * cm))

        rows = [["Tipo", "Descripcion", "Viaje", "Monto"]]
        for c in liq.conceptos.all():
            signo = "-" if c.tipo == "DESCUENTO" else ""
            rows.append([
                {"VIAJE": "Viaje", "EXTRA": "Bono", "DESCUENTO": "Deduccion"}.get(c.tipo, c.tipo),
                c.descripcion,
                (c.viaje.numero if c.viaje_id else "—"),
                f"{signo}${c.monto:,.2f}",
            ])
        rows.append(["", "", "TOTAL", f"${liq.total_pagar:,.2f}"])
        tbl = Table(rows, colWidths=[2.5 * cm, 9 * cm, 3 * cm, 3 * cm])
        tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#D1FAE5")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#065F46")),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ALIGN", (3, 0), (3, -1), "RIGHT"),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#CBD5E1")),
            ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#10B981")),
            ("TEXTCOLOR", (0, -1), (-1, -1), colors.white),
            ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ]))
        elems.append(tbl)
        if liq.observaciones:
            elems.append(Spacer(1, 0.5 * cm))
            elems.append(Paragraph(f"<b>Observaciones:</b> {liq.observaciones}", styles["Normal"]))
        doc.build(elems)
        buf.seek(0)
        resp = HttpResponse(buf.getvalue(), content_type="application/pdf")
        resp["Content-Disposition"] = f'inline; filename="Liquidacion_{liq.folio}.pdf"'
        return resp

    # ── Excel export ──────────────────────────────────────────────────
    @action(detail=False, methods=["get"], url_path="export-excel")
    def export_excel(self, request):
        try:
            from openpyxl import Workbook
        except ImportError:
            return Response({"detail": "openpyxl no instalado."}, status=500)
        qs = self.get_queryset()
        wb = Workbook()
        ws = wb.active
        ws.title = "Liquidaciones"
        headers = ["Folio", "Operador", "Inicio", "Fin", "Estado", "Fecha Pago",
                   "Viajes", "Extras", "Descuentos", "Total"]
        ws.append(headers)
        for l in qs:
            ws.append([
                l.folio, l.operador.nombre, l.fecha_inicio, l.fecha_fin,
                l.get_estado_display(), l.fecha_pago or "",
                float(l.total_viajes), float(l.total_extras),
                float(l.total_descuentos), float(l.total_pagar),
            ])
        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        resp = HttpResponse(
            buf.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        resp["Content-Disposition"] = f'attachment; filename="liquidaciones_{date.today()}.xlsx"'
        return resp


class ConceptoLiquidacionViewSet(viewsets.ModelViewSet):
    queryset = ConceptoLiquidacion.objects.select_related("liquidacion", "viaje")
    serializer_class = ConceptoLiquidacionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["liquidacion", "tipo"]
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        qs = super().get_queryset()
        u = self.request.user
        empresas = _empresas_user(u)
        if empresas is not None:
            qs = qs.filter(liquidacion__empresa_id__in=empresas)
        return qs

    def perform_update(self, serializer):
        obj = serializer.save()
        obj.liquidacion.recalcular()

    def perform_destroy(self, instance):
        liq = instance.liquidacion
        instance.delete()
        liq.recalcular()


# ── Viajes pendientes de liquidar ────────────────────────────────────
class ViajesPendientesView(viewsets.ViewSet):
    """Endpoint utilitario: viajes del operador en rango, aun no incluidos
    en ninguna liquidacion. Lo usa el form de nueva liquidacion como preview.
    """

    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        operador_id = request.query_params.get("operador_id")
        fecha_inicio = request.query_params.get("fecha_inicio")
        fecha_fin = request.query_params.get("fecha_fin")
        if not operador_id or not fecha_inicio or not fecha_fin:
            return Response({"results": [], "detail": "Faltan parametros."})
        qs = (
            Viaje.objects.filter(
                operador_id=operador_id,
                fecha_salida__date__gte=fecha_inicio,
                fecha_salida__date__lte=fecha_fin,
                estado__in=["ENTREGADO", "EN_TRANSITO"],
            )
            .exclude(liquidacion_conceptos__isnull=False)
            .select_related("origen", "destino")[:200]
        )
        results = []
        for v in qs:
            results.append({
                "id": v.id,
                "id_viaje": v.numero,
                "folio_carga": v.numero,
                "fecha_viaje": v.fecha_salida.date().isoformat() if v.fecha_salida else "",
                "origen": getattr(v.origen, "nombre_lugar", str(v.origen)) if v.origen_id else "",
                "destino": getattr(v.destino, "nombre_lugar", str(v.destino)) if v.destino_id else "",
                "sueldo_operador": str(_sueldo_operador(v)),
                "estado": v.estado,
            })
        return Response({"results": results})
