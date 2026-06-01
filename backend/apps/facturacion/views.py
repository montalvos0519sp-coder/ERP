from __future__ import annotations

from django.db import transaction
from django.http import FileResponse, HttpResponse
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.models import Empresa

from .models import Cliente, Factura, Pago, ProductoServicio, Serie
from .serializers import (
    ClienteSerializer,
    FacturaSerializer,
    PagoSerializer,
    ProductoServicioSerializer,
    SerieSerializer,
)
from .services import cancelar_factura, timbrar_factura
from .services import _proximo_folio


def _empresas_del_usuario(user):
    if user.is_superuser:
        return Empresa.objects.all().values_list("id", flat=True)
    return user.empresas.filter(activo=True).values_list("empresa_id", flat=True)


class _EmpresaScoped(viewsets.ModelViewSet):
    """Mixin que filtra por empresas a las que el usuario pertenece."""

    permission_classes = [permissions.IsAuthenticated]
    empresa_field = "empresa"

    def get_queryset(self):
        ids = _empresas_del_usuario(self.request.user)
        return super().get_queryset().filter(**{f"{self.empresa_field}__in": ids})


class ClienteViewSet(_EmpresaScoped):
    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer
    filterset_fields = ["empresa", "activo"]
    search_fields = ["rfc", "razon_social", "nombre_comercial"]


class ProductoServicioViewSet(_EmpresaScoped):
    queryset = ProductoServicio.objects.all()
    serializer_class = ProductoServicioSerializer
    filterset_fields = ["empresa", "activo"]
    search_fields = ["descripcion", "clave_prod_serv", "codigo_interno"]


class SerieViewSet(_EmpresaScoped):
    queryset = Serie.objects.all()
    serializer_class = SerieSerializer
    filterset_fields = ["empresa", "tipo_comprobante", "activa"]


class FacturaViewSet(_EmpresaScoped):
    queryset = Factura.objects.select_related("empresa", "serie", "cliente").prefetch_related("conceptos")
    serializer_class = FacturaSerializer
    filterset_fields = ["empresa", "estado", "serie", "cliente", "id"]
    search_fields = ["folio_fiscal", "cliente__rfc", "cliente__razon_social"]
    ordering_fields = ["fecha_emision", "total", "folio"]

    @transaction.atomic
    def perform_create(self, serializer):
        serie = serializer.validated_data["serie"]
        folio = _proximo_folio(serie)
        serializer.save(folio=folio, creado_por=self.request.user)

    @action(detail=True, methods=["post"])
    def timbrar(self, request, pk=None):
        factura = self.get_object()
        res = timbrar_factura(factura)
        if not res.ok:
            return Response({"detail": res.error, "raw": res.raw}, status=status.HTTP_400_BAD_REQUEST)
        return Response(FacturaSerializer(factura).data)

    @action(detail=True, methods=["post"])
    def cancelar(self, request, pk=None):
        factura = self.get_object()
        motivo = request.data.get("motivo", "02")
        sustitucion = request.data.get("folio_sustitucion", "")
        res = cancelar_factura(factura, motivo, sustitucion)
        if not res.ok:
            return Response({"detail": res.error}, status=400)
        return Response(FacturaSerializer(factura).data)

    def _descargar_cfdi(self, factura, tipo):
        """Devuelve (contenido_bytes, content_type) del XML o PDF del CFDI.

        Prioriza el archivo guardado localmente; si no existe (caso comun con
        Factura.com, que entrega el archivo aparte), lo baja del PAC usando el
        UUID y lo cachea en el FileField para futuras descargas."""
        from .pac import get_pac_backend
        from django.core.files.base import ContentFile

        campo = factura.xml if tipo == "xml" else factura.pdf
        ctype = "application/xml" if tipo == "xml" else "application/pdf"
        if campo:
            return campo.open("rb").read(), ctype

        if not factura.folio_fiscal:
            return None, ctype

        backend = get_pac_backend(factura.empresa)
        try:
            if tipo == "xml":
                data = backend.descargar_xml(factura.folio_fiscal)
            else:
                data = backend.descargar_pdf(factura.folio_fiscal)
        except Exception:
            return None, ctype

        # Validacion minima: si el PAC devolvio un JSON de error, no es el archivo.
        if not data or (tipo == "xml" and not data.lstrip().startswith(b"<")) \
                or (tipo == "pdf" and not data.startswith(b"%PDF")):
            return None, ctype

        nombre = f"{factura.serie.letra}-{factura.folio}.{tipo}"
        try:
            campo.save(nombre, ContentFile(data), save=True)
        except Exception:
            pass
        return data, ctype

    @action(detail=True, methods=["get"])
    def xml(self, request, pk=None):
        factura = self.get_object()
        data, ctype = self._descargar_cfdi(factura, "xml")
        if data is None:
            return Response({"detail": "Sin XML disponible (la factura debe estar timbrada)."}, status=404)
        resp = HttpResponse(data, content_type=ctype)
        resp["Content-Disposition"] = f'attachment; filename="{factura.serie.letra}-{factura.folio}.xml"'
        return resp

    @action(detail=True, methods=["get"])
    def pdf(self, request, pk=None):
        factura = self.get_object()
        data, ctype = self._descargar_cfdi(factura, "pdf")
        if data is None:
            return Response({"detail": "Sin PDF disponible (la factura debe estar timbrada)."}, status=404)
        resp = HttpResponse(data, content_type=ctype)
        resp["Content-Disposition"] = f'inline; filename="{factura.serie.letra}-{factura.folio}.pdf"'
        return resp


class PagoViewSet(_EmpresaScoped):
    queryset = Pago.objects.select_related("empresa", "serie").prefetch_related("documentos__factura__serie")
    serializer_class = PagoSerializer
    filterset_fields = ["empresa", "estado", "serie"]

    @transaction.atomic
    def perform_create(self, serializer):
        serie = serializer.validated_data["serie"]
        serializer.save(folio=_proximo_folio(serie))

    @action(detail=True, methods=["post"])
    def timbrar(self, request, pk=None):
        from .services import timbrar_pago
        pago = self.get_object()
        res = timbrar_pago(pago)
        if not res.ok:
            return Response({"detail": res.error, "raw": res.raw}, status=status.HTTP_400_BAD_REQUEST)
        return Response(PagoSerializer(pago).data)

    def _descargar_rep(self, pago, tipo):
        """Devuelve (bytes, content_type) del XML/PDF del complemento de pago.

        Igual que en facturas: usa el archivo local si existe; si no, lo baja del
        PAC por UUID y lo cachea."""
        from .pac import get_pac_backend
        from django.core.files.base import ContentFile

        campo = pago.xml if tipo == "xml" else pago.pdf
        ctype = "application/xml" if tipo == "xml" else "application/pdf"
        if campo:
            return campo.open("rb").read(), ctype
        if not pago.folio_fiscal:
            return None, ctype
        backend = get_pac_backend(pago.empresa)
        try:
            data = (backend.descargar_xml(pago.folio_fiscal) if tipo == "xml"
                    else backend.descargar_pdf(pago.folio_fiscal))
        except Exception:
            return None, ctype
        if not data or (tipo == "xml" and not data.lstrip().startswith(b"<")) \
                or (tipo == "pdf" and not data.startswith(b"%PDF")):
            return None, ctype
        try:
            campo.save(f"REP-{pago.serie.letra}-{pago.folio}.{tipo}", ContentFile(data), save=True)
        except Exception:
            pass
        return data, ctype

    @action(detail=True, methods=["get"])
    def xml(self, request, pk=None):
        pago = self.get_object()
        data, ctype = self._descargar_rep(pago, "xml")
        if data is None:
            return Response({"detail": "Sin XML disponible (el REP debe estar timbrado)."}, status=404)
        resp = HttpResponse(data, content_type=ctype)
        resp["Content-Disposition"] = f'attachment; filename="REP-{pago.serie.letra}-{pago.folio}.xml"'
        return resp

    @action(detail=True, methods=["get"])
    def pdf(self, request, pk=None):
        pago = self.get_object()
        data, ctype = self._descargar_rep(pago, "pdf")
        if data is None:
            return Response({"detail": "Sin PDF disponible (el REP debe estar timbrado)."}, status=404)
        resp = HttpResponse(data, content_type=ctype)
        resp["Content-Disposition"] = f'inline; filename="REP-{pago.serie.letra}-{pago.folio}.pdf"'
        return resp


class ReportesViewSet(viewsets.ViewSet):
    """Reportes y concentrado de facturación (ingresos, notas de crédito,
    complementos de pago) alineado al SAT."""
    permission_classes = [permissions.IsAuthenticated]

    def _facturas(self, request):
        ids = _empresas_del_usuario(request.user)
        qs = Factura.objects.filter(empresa_id__in=ids)
        emp = request.query_params.get("empresa")
        if emp:
            qs = qs.filter(empresa_id=emp)
        desde = request.query_params.get("desde")
        hasta = request.query_params.get("hasta")
        if desde:
            qs = qs.filter(fecha_emision__date__gte=desde)
        if hasta:
            qs = qs.filter(fecha_emision__date__lte=hasta)
        return qs

    def _pagos(self, request):
        ids = _empresas_del_usuario(request.user)
        qs = Pago.objects.filter(empresa_id__in=ids)
        emp = request.query_params.get("empresa")
        if emp:
            qs = qs.filter(empresa_id=emp)
        desde = request.query_params.get("desde")
        hasta = request.query_params.get("hasta")
        if desde:
            qs = qs.filter(fecha_pago__date__gte=desde)
        if hasta:
            qs = qs.filter(fecha_pago__date__lte=hasta)
        return qs

    @action(detail=False, methods=["get"])
    def concentrado(self, request):
        from django.db.models import Count, Sum
        from django.db.models.functions import TruncMonth

        def f(v):
            return float(v or 0)

        fac = self._facturas(request)
        # Vigentes = todo lo que no está cancelado/borrador/error (cuenta fiscalmente).
        vig = fac.exclude(estado__in=["CANCELADA", "BORRADOR", "ERROR"])
        ing = vig.filter(tipo_comprobante="I").aggregate(
            n=Count("id"), sub=Sum("subtotal"), tot=Sum("total"),
            ivat=Sum("iva_trasladado"), ivar=Sum("iva_retenido"), isr=Sum("isr_retenido"))
        egr = vig.filter(tipo_comprobante="E").aggregate(n=Count("id"), tot=Sum("total"))
        tras = vig.filter(tipo_comprobante="T").aggregate(n=Count("id"))
        pag = self._pagos(request).exclude(
            estado__in=["CANCELADA", "BORRADOR", "ERROR"]).aggregate(n=Count("id"), monto=Sum("monto"))

        por_estado = {row["estado"]: row["c"] for row in fac.values("estado").annotate(c=Count("id"))}

        meses: dict[str, dict] = {}
        for row in (vig.annotate(m=TruncMonth("fecha_emision"))
                    .values("m", "tipo_comprobante").annotate(t=Sum("total"))):
            key = row["m"].strftime("%Y-%m") if row["m"] else "?"
            meses.setdefault(key, {"mes": key, "ingresos": 0.0, "egresos": 0.0})
            if row["tipo_comprobante"] == "I":
                meses[key]["ingresos"] += f(row["t"])
            elif row["tipo_comprobante"] == "E":
                meses[key]["egresos"] += f(row["t"])
        por_mes = sorted(meses.values(), key=lambda x: x["mes"])

        return Response({
            "facturas": {"count": ing["n"] or 0, "subtotal": f(ing["sub"]), "total": f(ing["tot"]),
                         "iva_trasladado": f(ing["ivat"]), "iva_retenido": f(ing["ivar"]), "isr_retenido": f(ing["isr"])},
            "notas_credito": {"count": egr["n"] or 0, "total": f(egr["tot"])},
            "traslados": {"count": tras["n"] or 0},
            "pagos": {"count": pag["n"] or 0, "monto": f(pag["monto"])},
            "cancelados": fac.filter(estado="CANCELADA").count(),
            "neto": f(ing["tot"]) - f(egr["tot"]),
            "por_estado": por_estado,
            "por_mes": por_mes,
        })

    @action(detail=False, methods=["get"])
    def detalle(self, request):
        tipo = request.query_params.get("tipo", "I")
        if tipo == "P":
            rows = [{
                "id": p.id, "folio": f"{p.serie.letra}{p.folio}", "fecha": p.fecha_pago,
                "monto": float(p.monto), "forma_pago": p.forma_pago, "estado": p.estado,
                "folio_fiscal": p.folio_fiscal, "docs": p.documentos.count(),
            } for p in self._pagos(request).select_related("serie")]
            return Response(rows)
        rows = [{
            "id": fa.id, "folio": f"{fa.serie.letra}{fa.folio}", "fecha": fa.fecha_emision,
            "cliente": fa.cliente.razon_social, "rfc": fa.cliente.rfc,
            "subtotal": float(fa.subtotal), "total": float(fa.total),
            "estado": fa.estado, "folio_fiscal": fa.folio_fiscal,
        } for fa in self._facturas(request).filter(tipo_comprobante=tipo).select_related("serie", "cliente")]
        return Response(rows)
