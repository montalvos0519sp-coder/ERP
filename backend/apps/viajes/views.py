from django.http import HttpResponse
from rest_framework import permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from apps.core.models import Empresa
from .models import (
    CategoriaGastoViaje, Determinante, EvidenciaGastoViaje, GastoViaje,
    MercanciaViaje, ParadaViaje, Viaje,
)
from .serializers import (
    CategoriaGastoViajeSerializer, DeterminanteSerializer, GastoViajeSerializer,
    MercanciaViajeSerializer, ParadaViajeSerializer, ViajeListSerializer, ViajeSerializer,
)


def _empresas_usuario(user):
    if user.is_superuser:
        return Empresa.objects.values_list("id", flat=True)
    return user.empresas.filter(activo=True).values_list("empresa_id", flat=True)


class _Scoped(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return super().get_queryset().filter(empresa__in=_empresas_usuario(self.request.user))

    def _empresa_default(self):
        ids = list(_empresas_usuario(self.request.user))
        return Empresa.objects.filter(id__in=ids).first()


class ViajeViewSet(_Scoped):
    queryset = Viaje.objects.select_related(
        "cliente", "origen", "destino", "operador", "unidad", "carta_porte"
    ).prefetch_related("paradas__ubicacion", "mercancias", "timbres",
                       "gastos__categoria", "gastos__evidencias")
    serializer_class = ViajeSerializer
    filterset_fields = ["empresa", "estado", "cliente", "operador"]
    search_fields = ["numero", "folio_carta", "folio_carga"]
    ordering_fields = ["fecha_viaje", "creado"]

    def get_serializer_class(self):
        if self.action == "list":
            return ViajeListSerializer
        return ViajeSerializer

    def perform_create(self, serializer):
        emp = serializer.validated_data.get("empresa") or self._empresa_default()
        serializer.save(empresa=emp, creado_por=self.request.user)

    def _get_parada(self, viaje, pid):
        return viaje.paradas.filter(pk=pid).first()

    # ── Itinerario (paradas) ────────────────────────────────────────────────
    @action(detail=True, methods=["get", "post"], url_path="paradas")
    def paradas(self, request, pk=None):
        viaje = self.get_object()
        if request.method == "GET":
            paradas = list(viaje.paradas.select_related("ubicacion").all())
            total = len(paradas)
            for p in paradas:
                p._total_paradas = total
            return Response(ParadaViajeSerializer(paradas, many=True).data)
        ser = ParadaViajeSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        orden = (viaje.paradas.count() or 0) + 1
        ser.save(viaje=viaje, orden=orden)
        return Response(ser.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["patch", "delete"], url_path=r"paradas/(?P<pid>\d+)")
    def parada_detalle(self, request, pk=None, pid=None):
        viaje = self.get_object()
        parada = self._get_parada(viaje, pid)
        if not parada:
            return Response({"detail": "Parada no encontrada."}, status=404)
        if request.method == "DELETE":
            parada.delete()
            # Recompacta el orden.
            for i, p in enumerate(viaje.paradas.all(), start=1):
                if p.orden != i:
                    p.orden = i
                    p.save(update_fields=["orden"])
            return Response(status=204)
        ser = ParadaViajeSerializer(parada, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)

    @action(detail=True, methods=["post"], url_path="paradas/reordenar")
    def reordenar_paradas(self, request, pk=None):
        viaje = self.get_object()
        ids = request.data.get("orden") or request.data.get("ids") or []
        for i, pid in enumerate(ids, start=1):
            viaje.paradas.filter(pk=pid).update(orden=i)
        paradas = list(viaje.paradas.select_related("ubicacion").all())
        total = len(paradas)
        for p in paradas:
            p._total_paradas = total
        return Response(ParadaViajeSerializer(paradas, many=True).data)

    # ── Mercancías ──────────────────────────────────────────────────────────
    @action(detail=True, methods=["get", "post"], url_path="mercancias")
    def mercancias(self, request, pk=None):
        viaje = self.get_object()
        if request.method == "GET":
            return Response(MercanciaViajeSerializer(viaje.mercancias.all(), many=True).data)
        ser = MercanciaViajeSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        ser.save(viaje=viaje)
        return Response(ser.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["patch", "delete"], url_path=r"mercancias/(?P<mid>[^/.]+)")
    def mercancia_detalle(self, request, pk=None, mid=None):
        viaje = self.get_object()
        merc = viaje.mercancias.filter(pk=mid).first()
        if not merc:
            return Response({"detail": "Mercancía no encontrada."}, status=404)
        if request.method == "DELETE":
            merc.delete()
            return Response(status=204)
        ser = MercanciaViajeSerializer(merc, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)

    # ── Carta Porte (SAT) ───────────────────────────────────────────────────
    @action(detail=True, methods=["post"], url_path="timbrar")
    def timbrar(self, request, pk=None):
        from .services_cartaporte import timbrar_viaje
        viaje = self.get_object()
        res = timbrar_viaje(viaje)
        if not res.get("ok"):
            return Response({"detail": res.get("error", "No se pudo timbrar.")}, status=400)
        return Response(ViajeSerializer(viaje).data)

    @action(detail=True, methods=["post"], url_path="cancelar")
    def cancelar_cp(self, request, pk=None):
        from .services_cartaporte import cancelar_viaje_cp
        viaje = self.get_object()
        motivo = request.data.get("motivo") or "02"
        res = cancelar_viaje_cp(viaje, motivo)
        if not res.get("ok"):
            return Response({"detail": res.get("error", "No se pudo cancelar.")}, status=400)
        return Response(ViajeSerializer(viaje).data)

    @action(detail=True, methods=["post"], url_path="reactivar")
    def reactivar(self, request, pk=None):
        from .services_cartaporte import timbrar_viaje
        viaje = self.get_object()
        res = timbrar_viaje(viaje, forzar=True)
        if not res.get("ok"):
            return Response({"detail": res.get("error", "No se pudo re-timbrar.")}, status=400)
        return Response(ViajeSerializer(viaje).data)

    @action(detail=True, methods=["get"], url_path="cp-xml")
    def cp_xml(self, request, pk=None):
        viaje = self.get_object()
        cp = viaje.carta_porte
        contenido = None
        if cp and cp.xml:
            contenido = cp.xml.read()
        elif cp and cp.folio_fiscal and cp.estado == "TIMBRADO":
            from apps.facturacion.pac import get_pac_backend
            try:
                contenido = get_pac_backend(viaje.empresa).descargar_xml(cp.folio_fiscal)
            except Exception:
                contenido = None
        if not contenido:
            return Response({"detail": "Sin XML de Carta Porte."}, status=404)
        resp = HttpResponse(contenido, content_type="application/xml")
        resp["Content-Disposition"] = f'attachment; filename="CP-{viaje.folio_carta or viaje.numero}.xml"'
        return resp

    @action(detail=True, methods=["get"], url_path="cp-pdf")
    def cp_pdf(self, request, pk=None):
        """Descarga el PDF oficial del CFDI (Carta Porte) timbrado, desde el PAC."""
        viaje = self.get_object()
        cp = viaje.carta_porte
        if not cp or cp.estado != "TIMBRADO" or not cp.folio_fiscal:
            return Response({"detail": "La Carta Porte no está timbrada."}, status=404)
        from apps.facturacion.pac import get_pac_backend
        try:
            contenido = get_pac_backend(viaje.empresa).descargar_pdf(cp.folio_fiscal)
        except Exception as e:
            return Response({"detail": f"No se pudo obtener el PDF del PAC: {e}"}, status=400)
        if not contenido:
            return Response({"detail": "El PAC no devolvió el PDF."}, status=400)
        resp = HttpResponse(contenido, content_type="application/pdf")
        resp["Content-Disposition"] = f'inline; filename="CP-{viaje.folio_carta or viaje.numero}.pdf"'
        return resp

    # ── PDF / Excel ─────────────────────────────────────────────────────────
    @action(detail=True, methods=["get"], url_path="pdf")
    def pdf(self, request, pk=None):
        from .services_pdf import carta_traslado_pdf
        viaje = self.get_object()
        contenido = carta_traslado_pdf(viaje)
        resp = HttpResponse(contenido, content_type="application/pdf")
        resp["Content-Disposition"] = f'inline; filename="{viaje.folio_carta or viaje.numero}.pdf"'
        return resp

    @action(detail=False, methods=["get"], url_path="export-excel")
    def export_excel(self, request):
        import openpyxl
        from io import BytesIO
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Viajes"
        ws.append(["Folio", "Carga", "Fecha", "Operador", "Unidad", "Origen", "Destino", "Estado", "Carta Porte"])
        for v in self.filter_queryset(self.get_queryset()):
            ws.append([
                v.folio_carta or v.numero, v.folio_carga,
                v.fecha_viaje.strftime("%Y-%m-%d") if v.fecha_viaje else "",
                v.operador.nombre if v.operador else "", v.unidad.numero if v.unidad else "",
                v.origen.nombre if v.origen else "", v.destino.nombre if v.destino else "",
                v.estado, v.carta_porte.estado if v.carta_porte else "",
            ])
        bio = BytesIO(); wb.save(bio); bio.seek(0)
        resp = HttpResponse(
            bio.read(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        resp["Content-Disposition"] = 'attachment; filename="viajes.xlsx"'
        return resp


class DeterminanteViewSet(_Scoped):
    queryset = Determinante.objects.select_related("ubicacion")
    serializer_class = DeterminanteSerializer
    filterset_fields = ["empresa", "activo"]
    search_fields = ["codigo", "nombre", "cliente"]

    def perform_create(self, serializer):
        emp = serializer.validated_data.get("empresa") or self._empresa_default()
        serializer.save(empresa=emp)


class CategoriaGastoViajeViewSet(_Scoped):
    """Catálogo de tipos de gasto de viaje (dar de alta y reutilizar)."""
    queryset = CategoriaGastoViaje.objects.all()
    serializer_class = CategoriaGastoViajeSerializer
    filterset_fields = ["empresa", "activo"]
    search_fields = ["nombre"]

    def perform_create(self, serializer):
        emp = serializer.validated_data.get("empresa") or self._empresa_default()
        nombre = (serializer.validated_data.get("nombre") or "").strip()
        if CategoriaGastoViaje.objects.filter(empresa=emp, nombre__iexact=nombre).exists():
            raise serializers.ValidationError({"nombre": "Ya existe una categoría con ese nombre."})
        serializer.save(empresa=emp)


class GastoViajeViewSet(viewsets.ModelViewSet):
    """Gastos de un viaje, con evidencias (PDF/imágenes)."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = GastoViajeSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    filterset_fields = ["viaje", "categoria"]
    queryset = GastoViaje.objects.select_related("categoria").prefetch_related("evidencias")

    def get_queryset(self):
        return super().get_queryset().filter(viaje__empresa__in=_empresas_usuario(self.request.user))

    def perform_create(self, serializer):
        serializer.save(creado_por=self.request.user)

    @action(detail=True, methods=["post"], url_path="evidencia",
            parser_classes=[MultiPartParser, FormParser])
    def evidencia(self, request, pk=None):
        """Anexa un archivo (PDF o imagen) como evidencia del gasto."""
        gasto = self.get_object()
        archivo = request.FILES.get("archivo")
        if not archivo:
            return Response({"detail": "Falta el archivo."}, status=400)
        ev = EvidenciaGastoViaje.objects.create(
            gasto=gasto, archivo=archivo, nombre=archivo.name,
            mime=getattr(archivo, "content_type", "") or "")
        from .serializers import EvidenciaGastoViajeSerializer
        return Response(EvidenciaGastoViajeSerializer(ev, context={"request": request}).data, status=201)

    @action(detail=True, methods=["delete"], url_path=r"evidencia/(?P<eid>\d+)")
    def eliminar_evidencia(self, request, pk=None, eid=None):
        gasto = self.get_object()
        ev = gasto.evidencias.filter(pk=eid).first()
        if not ev:
            return Response({"detail": "Evidencia no encontrada."}, status=404)
        ev.delete()
        return Response(status=204)
