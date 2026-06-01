"""Vistas del modulo profesional de Almacen.

Incluye:
- ViewSets con scoping por empresa del usuario.
- Acciones de aprobacion/cancelacion de movimientos que actualizan
  Existencia, Kardex y disparan log en bitacora.
- Calculo idempotente de alertas (bajo stock, caducidad).
- Exportacion a Excel de productos y kardex.
"""
from __future__ import annotations

import io
from datetime import date, datetime, timedelta
from decimal import Decimal

from django.db import transaction
from django.db.models import Q, Sum
from django.http import HttpResponse
from django.utils import timezone

from rest_framework import permissions, status, viewsets
from rest_framework.authentication import SessionAuthentication
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

try:
    from apps.bitacora.utils import log_evento
except Exception:  # pragma: no cover - bitacora opcional
    def log_evento(**kwargs):  # type: ignore
        return None


class QueryStringJWTAuthentication(JWTAuthentication):
    """JWT que acepta el token via ?token= en query string.

    Necesario para endpoints que devuelven imagenes (barcode/QR), porque el
    navegador no agrega Authorization en <img src>. Solo lo usamos en estos
    endpoints concretos, no globalmente.
    """

    def authenticate(self, request):
        result = super().authenticate(request)
        if result:
            return result
        raw_token = request.query_params.get("token")
        if not raw_token:
            return None
        validated = self.get_validated_token(raw_token)
        return self.get_user(validated), validated

from .models import (
    Alerta,
    Almacen,
    CategoriaProducto,
    Existencia,
    Kardex,
    Lote,
    MarcaProducto,
    Movimiento,
    MovimientoDetalle,
    Nivel,
    Producto,
    Rack,
    Serie,
    Transferencia,
    TransferenciaDetalle,
    Ubicacion,
    UnidadMedida,
    Zona,
)
from .serializers import (
    AlertaSerializer,
    AlmacenSerializer,
    CategoriaProductoSerializer,
    ExistenciaSerializer,
    KardexSerializer,
    LoteSerializer,
    MarcaProductoSerializer,
    MovimientoDetalleSerializer,
    MovimientoSerializer,
    NivelSerializer,
    ProductoSerializer,
    RackSerializer,
    SerieSerializer,
    TransferenciaSerializer,
    UbicacionSerializer,
    UnidadMedidaSerializer,
    ZonaSerializer,
)


ZERO = Decimal("0")


# ---------------------------------------------------------------------------
# Base scoped por empresa del usuario
# ---------------------------------------------------------------------------


class _EmpresaScopedAlmacen(viewsets.ModelViewSet):
    """ModelViewSet que filtra el queryset por las empresas del usuario.

    - Superuser ve todo.
    - El resto solo ve registros cuya empresa pertenezca a sus UsuarioEmpresa
      activos.
    - En create rellena automaticamente `empresa` si el cliente no la manda,
      tomandola del perfil del usuario o de su primera empresa activa.
    """

    permission_classes = [permissions.IsAuthenticated]
    empresa_field = "empresa"

    def _empresas_del_usuario(self):
        u = self.request.user
        if u.is_superuser:
            return None
        return list(
            u.empresas.filter(activo=True).values_list("empresa_id", flat=True)
        )

    def _empresa_activa_del_user(self):
        u = self.request.user
        perfil = getattr(u, "perfil", None)
        if perfil and perfil.empresa_activa_id:
            return perfil.empresa_activa_id
        ue = u.empresas.filter(activo=True).first()
        return ue.empresa_id if ue else None

    def get_queryset(self):
        qs = super().get_queryset()
        ids = self._empresas_del_usuario()
        if ids is None:
            return qs
        return qs.filter(**{f"{self.empresa_field}__in": ids})

    def create(self, request, *args, **kwargs):
        data = request.data
        if hasattr(data, "_mutable"):
            data._mutable = True
        if self.empresa_field and not data.get(self.empresa_field):
            empresa_id = self._empresa_activa_del_user()
            if empresa_id:
                data[self.empresa_field] = empresa_id
        return super().create(request, *args, **kwargs)


# ---------------------------------------------------------------------------
# Catalogos basicos
# ---------------------------------------------------------------------------


class CategoriaProductoViewSet(_EmpresaScopedAlmacen):
    queryset = CategoriaProducto.objects.select_related("padre")
    serializer_class = CategoriaProductoSerializer
    filterset_fields = ["empresa", "padre", "activo"]
    search_fields = ["codigo", "nombre"]


class MarcaProductoViewSet(_EmpresaScopedAlmacen):
    queryset = MarcaProducto.objects.all()
    serializer_class = MarcaProductoSerializer
    filterset_fields = ["empresa", "activo"]
    search_fields = ["codigo", "nombre"]


class UnidadMedidaViewSet(_EmpresaScopedAlmacen):
    queryset = UnidadMedida.objects.select_related("unidad_base")
    serializer_class = UnidadMedidaSerializer
    filterset_fields = ["empresa", "tipo", "activo"]
    search_fields = ["codigo", "nombre", "abreviatura"]


# ---------------------------------------------------------------------------
# Producto
# ---------------------------------------------------------------------------


class ProductoViewSet(_EmpresaScopedAlmacen):
    queryset = Producto.objects.select_related(
        "categoria", "marca", "unidad_medida",
    )
    serializer_class = ProductoSerializer
    filterset_fields = ["empresa", "categoria", "marca", "tipo", "activo"]
    search_fields = ["sku", "codigo_interno", "codigo_barras", "nombre"]
    ordering_fields = ["sku", "nombre", "creado_en"]

    def perform_create(self, serializer):
        obj = serializer.save(creado_por=self.request.user, actualizado_por=self.request.user)
        log_evento(
            user=self.request.user, empresa=obj.empresa,
            accion="almacen.producto.crear",
            descripcion=f"Producto creado: {obj.sku} - {obj.nombre}",
            request=self.request,
        )

    def perform_update(self, serializer):
        obj = serializer.save(actualizado_por=self.request.user)
        log_evento(
            user=self.request.user, empresa=obj.empresa,
            accion="almacen.producto.actualizar",
            descripcion=f"Producto actualizado: {obj.sku}",
            request=self.request,
        )

    @action(detail=True, methods=["get"])
    def existencias(self, request, pk=None):
        producto = self.get_object()
        qs = Existencia.objects.filter(producto=producto).select_related(
            "almacen", "ubicacion", "lote",
        )
        return Response(ExistenciaSerializer(qs, many=True).data)

    @action(detail=True, methods=["get"])
    def kardex(self, request, pk=None):
        producto = self.get_object()
        qs = Kardex.objects.filter(producto=producto).select_related("almacen")
        almacen_id = request.query_params.get("almacen")
        if almacen_id:
            qs = qs.filter(almacen_id=almacen_id)
        qs = qs.order_by("fecha", "id")
        return Response(KardexSerializer(qs, many=True).data)

    @action(detail=True, methods=["get"])
    def lotes(self, request, pk=None):
        producto = self.get_object()
        qs = producto.lotes.filter(activo=True).order_by("-creado_en")
        return Response(LoteSerializer(qs, many=True).data)

    @action(detail=True, methods=["get"])
    def series(self, request, pk=None):
        producto = self.get_object()
        qs = producto.series.all().order_by("-creada_en")
        return Response(SerieSerializer(qs, many=True).data)

    @action(
        detail=True, methods=["get"], url_path="barcode",
        authentication_classes=[QueryStringJWTAuthentication, SessionAuthentication],
    )
    def barcode(self, request, pk=None):
        """Devuelve la imagen PNG del codigo de barras/QR del producto.

        Query params:
            simbologia: override del tipo (QR/CODE128/CODE39/EAN13/EAN8/UPCA/ITF).
                        Si no se manda, usa producto.tipo_codigo_barras.
            payload:    override del contenido. Si no se manda, usa
                        codigo_barras > sku > codigo_interno.
            escala:     1..6 (default 1). Aumenta el tamano de la etiqueta.
            texto:      "0" para ocultar el texto bajo el barcode lineal.
        """
        from .barcodes import BarcodeError, generar_codigo_png, payload_para_producto

        producto = self.get_object()
        simbologia = (request.query_params.get("simbologia")
                      or producto.tipo_codigo_barras or "QR").upper()
        if simbologia == "NONE":
            return Response(
                {"detail": "Este producto tiene tipo_codigo_barras=NONE."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        payload = (request.query_params.get("payload")
                   or payload_para_producto(producto))
        try:
            escala = int(request.query_params.get("escala", "1"))
        except ValueError:
            escala = 1
        incluir_texto = request.query_params.get("texto", "1") != "0"

        try:
            png = generar_codigo_png(
                simbologia, payload,
                incluir_texto=incluir_texto, escala=escala,
            )
        except BarcodeError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        resp = HttpResponse(png, content_type="image/png")
        resp["Cache-Control"] = "public, max-age=300"
        resp["Content-Disposition"] = (
            f'inline; filename="barcode_{producto.sku or producto.id}_{simbologia}.png"'
        )
        return resp

    @action(
        detail=False, methods=["get"], url_path="barcode-preview",
        authentication_classes=[QueryStringJWTAuthentication, SessionAuthentication],
    )
    def barcode_preview(self, request):
        """Genera un barcode/QR ad-hoc sin necesidad de un producto persistido.

        Util para preview en el formulario de alta antes de guardar.
        Query: simbologia, payload, escala, texto.
        """
        from .barcodes import BarcodeError, generar_codigo_png

        simbologia = (request.query_params.get("simbologia") or "QR").upper()
        payload = request.query_params.get("payload", "")
        if not payload:
            return Response(
                {"detail": "Falta el parametro 'payload'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            escala = int(request.query_params.get("escala", "1"))
        except ValueError:
            escala = 1
        incluir_texto = request.query_params.get("texto", "1") != "0"

        try:
            png = generar_codigo_png(
                simbologia, payload,
                incluir_texto=incluir_texto, escala=escala,
            )
        except BarcodeError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        resp = HttpResponse(png, content_type="image/png")
        resp["Cache-Control"] = "no-store"
        return resp

    @action(detail=False, methods=["post"])
    def buscar(self, request):
        """Busqueda libre por SKU, codigo de barras, nombre o codigo interno."""
        q = request.data.get("q", "").strip()
        qs = self.get_queryset()
        if q:
            qs = qs.filter(
                Q(sku__icontains=q) | Q(codigo_interno__icontains=q)
                | Q(codigo_barras__icontains=q) | Q(nombre__icontains=q)
            )
        return Response(ProductoSerializer(qs[:50], many=True).data)

    @action(detail=False, methods=["post"])
    def importar(self, request):
        """Importacion simple de productos via JSON.

        Body: { "items": [{ "sku": "...", "nombre": "...", ... }, ...] }
        """
        items = request.data.get("items", [])
        empresa_id = request.data.get("empresa") or self._empresa_activa_del_user()
        if not empresa_id:
            return Response({"detail": "Falta empresa."}, status=400)
        creados, actualizados, errores = 0, 0, []
        for raw in items:
            sku = raw.get("sku")
            if not sku:
                errores.append({"item": raw, "error": "sku requerido"})
                continue
            defaults = {k: v for k, v in raw.items() if k not in ("sku", "empresa")}
            obj, created = Producto.objects.update_or_create(
                empresa_id=empresa_id, sku=sku, defaults=defaults,
            )
            if created:
                creados += 1
            else:
                actualizados += 1
        log_evento(
            user=request.user, empresa_id=empresa_id,
            accion="almacen.producto.importar",
            descripcion=f"Import: {creados} nuevos, {actualizados} actualizados",
            request=request,
        )
        return Response({
            "creados": creados, "actualizados": actualizados, "errores": errores,
        })

    @action(detail=False, methods=["get"], url_path="exportar")
    def exportar(self, request):
        return self._exportar_excel(request)

    @action(detail=False, methods=["get"], url_path="export-excel")
    def export_excel(self, request):
        return self._exportar_excel(request)

    def _exportar_excel(self, request):
        try:
            from openpyxl import Workbook
        except Exception:
            return Response(
                {"detail": "openpyxl no disponible en el servidor."},
                status=500,
            )
        wb = Workbook()
        ws = wb.active
        ws.title = "Productos"
        headers = [
            "SKU", "Codigo interno", "Codigo barras", "Nombre", "Categoria",
            "Marca", "Unidad", "Tipo", "Costo promedio", "Precio venta",
            "Activo",
        ]
        ws.append(headers)
        for p in self.get_queryset():
            ws.append([
                p.sku, p.codigo_interno, p.codigo_barras, p.nombre,
                getattr(p.categoria, "nombre", "") or "",
                getattr(p.marca, "nombre", "") or "",
                getattr(p.unidad_medida, "codigo", "") or "",
                p.tipo,
                float(p.costo_promedio or 0),
                float(p.precio_venta or 0),
                "Si" if p.activo else "No",
            ])
        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        resp = HttpResponse(
            buf.read(),
            content_type=(
                "application/vnd.openxmlformats-officedocument."
                "spreadsheetml.sheet"
            ),
        )
        resp["Content-Disposition"] = 'attachment; filename="productos.xlsx"'
        return resp


# ---------------------------------------------------------------------------
# Jerarquia de almacen
# ---------------------------------------------------------------------------


class AlmacenViewSet(_EmpresaScopedAlmacen):
    queryset = Almacen.objects.select_related("sucursal", "responsable")
    serializer_class = AlmacenSerializer
    filterset_fields = ["empresa", "sucursal", "tipo", "activo"]
    search_fields = ["codigo", "nombre"]

    def perform_create(self, serializer):
        obj = serializer.save()
        log_evento(
            user=self.request.user, empresa=obj.empresa,
            accion="almacen.almacen.crear",
            descripcion=f"Almacen creado: {obj.codigo} - {obj.nombre}",
            request=self.request,
        )

    @action(detail=True, methods=["get"])
    def existencias(self, request, pk=None):
        alm = self.get_object()
        qs = Existencia.objects.filter(almacen=alm).select_related(
            "producto", "ubicacion", "lote",
        )
        return Response(ExistenciaSerializer(qs, many=True).data)

    @action(detail=True, methods=["get"])
    def jerarquia(self, request, pk=None):
        """Devuelve la jerarquia zona/rack/nivel/ubicacion del almacen."""
        alm = self.get_object()
        out = []
        zonas = alm.zonas.prefetch_related("racks__niveles").all()
        ubicaciones_por_almacen = list(alm.ubicaciones.all())
        for z in zonas:
            racks = []
            for r in z.racks.all():
                niveles = [
                    {"id": n.id, "codigo": n.codigo,
                     "altura": float(n.altura), "capacidad_kg": float(n.capacidad_kg)}
                    for n in r.niveles.all()
                ]
                racks.append({
                    "id": r.id, "codigo": r.codigo, "nombre": r.nombre,
                    "niveles": niveles,
                })
            out.append({
                "id": z.id, "codigo": z.codigo, "nombre": z.nombre,
                "tipo": z.tipo, "racks": racks,
            })
        return Response({
            "almacen": AlmacenSerializer(alm).data,
            "zonas": out,
            "ubicaciones": UbicacionSerializer(ubicaciones_por_almacen, many=True).data,
        })


class ZonaViewSet(_EmpresaScopedAlmacen):
    queryset = Zona.objects.select_related("almacen")
    serializer_class = ZonaSerializer
    filterset_fields = ["empresa", "almacen", "tipo", "activo"]
    search_fields = ["codigo", "nombre"]


class RackViewSet(_EmpresaScopedAlmacen):
    queryset = Rack.objects.select_related("zona", "zona__almacen")
    serializer_class = RackSerializer
    filterset_fields = ["empresa", "zona", "activo"]
    search_fields = ["codigo", "nombre"]


class NivelViewSet(_EmpresaScopedAlmacen):
    queryset = Nivel.objects.select_related("rack")
    serializer_class = NivelSerializer
    filterset_fields = ["empresa", "rack", "activo"]
    search_fields = ["codigo"]


class UbicacionViewSet(_EmpresaScopedAlmacen):
    queryset = Ubicacion.objects.select_related(
        "almacen", "zona", "rack", "nivel",
    )
    serializer_class = UbicacionSerializer
    filterset_fields = [
        "empresa", "almacen", "zona", "rack", "nivel",
        "tipo", "activa", "bloqueada",
    ]
    search_fields = ["codigo", "nombre"]

    def create(self, request, *args, **kwargs):
        # Conveniencia: si el cliente solo manda nivel/rack/zona, derivamos los
        # FK padres automaticamente. El usuario crea una ubicacion desde el
        # boton "+ Ubicacion" junto a un nivel y no debe rellenar zona/almacen.
        data = request.data
        if hasattr(data, "_mutable"):
            data._mutable = True
        try:
            nivel_id = data.get("nivel")
            rack_id = data.get("rack")
            zona_id = data.get("zona")
            almacen_id = data.get("almacen")
            if nivel_id and (not rack_id or not zona_id or not almacen_id):
                nv = Nivel.objects.select_related(
                    "rack__zona__almacen",
                ).filter(pk=nivel_id).first()
                if nv:
                    if not rack_id:
                        data["rack"] = nv.rack_id
                    if nv.rack and not zona_id:
                        data["zona"] = nv.rack.zona_id
                    if nv.rack and nv.rack.zona and not almacen_id:
                        data["almacen"] = nv.rack.zona.almacen_id
            elif rack_id and (not zona_id or not almacen_id):
                rk = Rack.objects.select_related("zona__almacen").filter(pk=rack_id).first()
                if rk:
                    if not zona_id:
                        data["zona"] = rk.zona_id
                    if rk.zona and not almacen_id:
                        data["almacen"] = rk.zona.almacen_id
            elif zona_id and not almacen_id:
                zn = Zona.objects.filter(pk=zona_id).first()
                if zn:
                    data["almacen"] = zn.almacen_id
        except Exception:
            # Si la derivacion falla seguimos al super().create() — el serializer
            # devolvera 400 con el detalle del campo faltante.
            pass
        # `tipo` tiene default en el modelo; si el cliente no lo manda lo dejamos
        # en blanco para que el modelo aplique su default.
        return super().create(request, *args, **kwargs)


# ---------------------------------------------------------------------------
# Trazabilidad
# ---------------------------------------------------------------------------


class LoteViewSet(_EmpresaScopedAlmacen):
    queryset = Lote.objects.select_related("producto", "proveedor")
    serializer_class = LoteSerializer
    filterset_fields = ["empresa", "producto", "activo"]
    search_fields = ["numero_lote", "producto__sku"]

    @action(detail=False, methods=["get"], url_path="por_caducar")
    def por_caducar(self, request):
        """Lotes que caducan en los proximos N dias (default 30)."""
        dias = int(request.query_params.get("dias", 30))
        hoy = date.today()
        limite = hoy + timedelta(days=dias)
        qs = self.get_queryset().filter(
            activo=True,
            fecha_caducidad__isnull=False,
            fecha_caducidad__lte=limite,
            fecha_caducidad__gte=hoy,
        ).order_by("fecha_caducidad")
        return Response(LoteSerializer(qs, many=True).data)

    @action(detail=True, methods=["get"])
    def trazabilidad(self, request, pk=None):
        """Devuelve todos los movimientos asociados al lote."""
        lote = self.get_object()
        detalles = (
            MovimientoDetalle.objects
            .filter(lote=lote)
            .select_related("movimiento", "producto")
            .order_by("movimiento__fecha", "id")
        )
        return Response({
            "lote": LoteSerializer(lote).data,
            "movimientos": MovimientoDetalleSerializer(detalles, many=True).data,
            "series": SerieSerializer(lote.series.all(), many=True).data,
        })


class SerieViewSet(_EmpresaScopedAlmacen):
    queryset = Serie.objects.select_related(
        "producto", "lote", "almacen_actual", "ubicacion_actual",
    )
    serializer_class = SerieSerializer
    filterset_fields = ["empresa", "producto", "lote", "estado", "almacen_actual"]
    search_fields = ["numero_serie", "producto__sku"]

    @action(detail=True, methods=["get"])
    def historial(self, request, pk=None):
        serie = self.get_object()
        detalles = (
            MovimientoDetalle.objects
            .filter(serie=serie)
            .select_related("movimiento")
            .order_by("movimiento__fecha", "id")
        )
        return Response({
            "serie": SerieSerializer(serie).data,
            "movimientos": MovimientoDetalleSerializer(detalles, many=True).data,
        })

    @action(detail=False, methods=["post"])
    def buscar(self, request):
        numero = (request.data.get("numero_serie") or "").strip()
        if not numero:
            return Response({"detail": "Falta numero_serie."}, status=400)
        qs = self.get_queryset().filter(numero_serie__icontains=numero)
        return Response(SerieSerializer(qs, many=True).data)


# ---------------------------------------------------------------------------
# Existencias (read-only + acciones de reserva/liberacion)
# ---------------------------------------------------------------------------


class ExistenciaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Existencia.objects.select_related(
        "producto", "almacen", "ubicacion", "lote",
    )
    serializer_class = ExistenciaSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = [
        "empresa", "producto", "almacen", "ubicacion", "lote",
    ]
    search_fields = ["producto__sku", "producto__nombre", "almacen__codigo"]

    def get_queryset(self):
        qs = super().get_queryset()
        u = self.request.user
        if u.is_superuser:
            return qs
        ids = list(u.empresas.filter(activo=True).values_list("empresa_id", flat=True))
        return qs.filter(empresa_id__in=ids)

    @action(detail=False, methods=["get"])
    def resumen(self, request):
        """Resumen agregado por producto a lo largo de todos los almacenes."""
        qs = self.get_queryset()
        almacen_id = request.query_params.get("almacen")
        if almacen_id:
            qs = qs.filter(almacen_id=almacen_id)
        agg = (
            qs.values("producto_id", "producto__sku", "producto__nombre")
            .annotate(
                total=Sum("cantidad"),
                disponible_total=Sum("disponible"),
                comprometido_total=Sum("comprometido"),
                en_transito_total=Sum("en_transito"),
            )
            .order_by("producto__sku")
        )
        return Response(list(agg))

    @action(detail=False, methods=["get"], url_path="por_almacen")
    def por_almacen(self, request):
        qs = self.get_queryset().values(
            "almacen_id", "almacen__codigo", "almacen__nombre",
        ).annotate(total=Sum("cantidad")).order_by("almacen__codigo")
        return Response(list(qs))

    @action(detail=False, methods=["get"])
    def valorizacion(self, request):
        """Calcula la valorizacion del inventario (cantidad * costo_promedio)."""
        rows = []
        gran_total = ZERO
        for e in self.get_queryset():
            valor = (e.cantidad or ZERO) * (e.costo_promedio or e.producto.costo_promedio or ZERO)
            gran_total += valor
            rows.append({
                "producto_id": e.producto_id,
                "producto_sku": e.producto.sku,
                "producto_nombre": e.producto.nombre,
                "almacen_id": e.almacen_id,
                "almacen_nombre": e.almacen.nombre,
                "cantidad": float(e.cantidad or 0),
                "costo_promedio": float(e.costo_promedio or 0),
                "valor": float(valor),
            })
        return Response({"total": float(gran_total), "filas": rows})

    @action(detail=False, methods=["post"])
    def reservar(self, request):
        """Marca una cantidad como comprometida (reservada)."""
        return self._reservar_o_liberar(request, accion="reservar")

    @action(detail=False, methods=["post"])
    def liberar(self, request):
        return self._reservar_o_liberar(request, accion="liberar")

    def _reservar_o_liberar(self, request, accion):
        producto_id = request.data.get("producto")
        almacen_id = request.data.get("almacen")
        cantidad = Decimal(str(request.data.get("cantidad") or "0"))
        if not (producto_id and almacen_id and cantidad > 0):
            return Response({"detail": "producto, almacen y cantidad>0 son requeridos."}, status=400)
        try:
            ex = Existencia.objects.get(
                producto_id=producto_id, almacen_id=almacen_id,
                ubicacion__isnull=True, lote__isnull=True,
            )
        except Existencia.DoesNotExist:
            return Response({"detail": "Sin existencia base para ese producto/almacen."}, status=404)
        if accion == "reservar":
            if (ex.disponible or ZERO) < cantidad:
                return Response({"detail": "Disponible insuficiente."}, status=400)
            ex.disponible = (ex.disponible or ZERO) - cantidad
            ex.comprometido = (ex.comprometido or ZERO) + cantidad
        else:
            ex.disponible = (ex.disponible or ZERO) + cantidad
            ex.comprometido = max(ZERO, (ex.comprometido or ZERO) - cantidad)
        ex.save(update_fields=["disponible", "comprometido", "actualizado"])
        return Response(ExistenciaSerializer(ex).data)


# ---------------------------------------------------------------------------
# Movimientos
# ---------------------------------------------------------------------------


class MovimientoViewSet(_EmpresaScopedAlmacen):
    queryset = Movimiento.objects.select_related(
        "almacen_origen", "almacen_destino", "usuario",
    ).prefetch_related("detalles__producto", "detalles__lote", "detalles__serie")
    serializer_class = MovimientoSerializer
    filterset_fields = [
        "empresa", "tipo", "subtipo", "estado",
        "almacen_origen", "almacen_destino",
    ]
    search_fields = ["folio", "referencia", "documento_origen"]
    ordering_fields = ["fecha", "folio", "creado_en"]

    def perform_create(self, serializer):
        mov = serializer.save(usuario=self.request.user)
        log_evento(
            user=self.request.user, empresa=mov.empresa,
            accion="almacen.mov.crear",
            descripcion=f"Movimiento {mov.tipo}/{mov.subtipo} folio {mov.folio}",
            request=self.request,
        )

    # ---- helpers de saldo / kardex ---------------------------------------

    def _get_or_create_existencia(self, empresa, producto, almacen, ubicacion, lote):
        ex, _ = Existencia.objects.get_or_create(
            producto=producto, almacen=almacen,
            ubicacion=ubicacion, lote=lote,
            defaults={
                "empresa": empresa, "cantidad": ZERO,
                "disponible": ZERO, "comprometido": ZERO, "en_transito": ZERO,
                "costo_promedio": producto.costo_promedio or ZERO,
            },
        )
        return ex

    def _ultimo_saldo(self, producto, almacen):
        last = (
            Kardex.objects.filter(producto=producto, almacen=almacen)
            .order_by("-fecha", "-id").first()
        )
        if not last:
            return ZERO, ZERO, ZERO  # cant, costo_prom, importe
        return (
            last.saldo_cantidad or ZERO,
            last.saldo_costo_promedio or ZERO,
            last.saldo_importe or ZERO,
        )

    @transaction.atomic
    def _confirmar(self, mov: Movimiento, user):
        """Aplica el movimiento sobre existencias y kardex."""
        for det in mov.detalles.all().select_related("producto"):
            producto = det.producto
            cantidad = det.cantidad or ZERO
            costo = det.costo_unitario or producto.costo_promedio or ZERO

            if mov.tipo == "ENTRADA":
                almacen = mov.almacen_destino or mov.almacen_origen
                ex = self._get_or_create_existencia(
                    mov.empresa, producto, almacen, det.ubicacion_destino, det.lote,
                )
                # promedio ponderado
                nueva_cant = (ex.cantidad or ZERO) + cantidad
                if nueva_cant > 0:
                    valor_total = (ex.cantidad or ZERO) * (ex.costo_promedio or ZERO) + cantidad * costo
                    nuevo_costo = valor_total / nueva_cant
                else:
                    nuevo_costo = costo
                ex.cantidad = nueva_cant
                ex.disponible = (ex.disponible or ZERO) + cantidad
                ex.costo_promedio = nuevo_costo
                ex.save()
                entrada_cant, salida_cant = cantidad, ZERO
            elif mov.tipo == "SALIDA":
                almacen = mov.almacen_origen or mov.almacen_destino
                ex = self._get_or_create_existencia(
                    mov.empresa, producto, almacen, det.ubicacion_origen, det.lote,
                )
                if not almacen.permite_negativos and (ex.cantidad or ZERO) < cantidad:
                    raise ValueError(
                        f"Stock insuficiente para {producto.sku} en {almacen.codigo}"
                    )
                ex.cantidad = (ex.cantidad or ZERO) - cantidad
                ex.disponible = max(ZERO, (ex.disponible or ZERO) - cantidad)
                ex.save()
                entrada_cant, salida_cant = ZERO, cantidad
            elif mov.tipo == "TRANSFERENCIA":
                # Salida del origen
                ex_o = self._get_or_create_existencia(
                    mov.empresa, producto, mov.almacen_origen,
                    det.ubicacion_origen, det.lote,
                )
                ex_o.cantidad = (ex_o.cantidad or ZERO) - cantidad
                ex_o.disponible = max(ZERO, (ex_o.disponible or ZERO) - cantidad)
                ex_o.save()
                # Entrada al destino
                ex_d = self._get_or_create_existencia(
                    mov.empresa, producto, mov.almacen_destino,
                    det.ubicacion_destino, det.lote,
                )
                nueva_cant = (ex_d.cantidad or ZERO) + cantidad
                if nueva_cant > 0:
                    valor_total = (ex_d.cantidad or ZERO) * (ex_d.costo_promedio or ZERO) + cantidad * costo
                    ex_d.costo_promedio = valor_total / nueva_cant
                ex_d.cantidad = nueva_cant
                ex_d.disponible = (ex_d.disponible or ZERO) + cantidad
                ex_d.save()
                almacen = mov.almacen_destino  # para el kardex (vista entrada)
                entrada_cant, salida_cant = cantidad, ZERO
            else:  # AJUSTE
                almacen = mov.almacen_destino or mov.almacen_origen
                ex = self._get_or_create_existencia(
                    mov.empresa, producto, almacen, det.ubicacion_destino, det.lote,
                )
                # Tratamos cantidad como diferencia (puede ser negativa)
                delta = cantidad
                ex.cantidad = (ex.cantidad or ZERO) + delta
                if delta >= 0:
                    ex.disponible = (ex.disponible or ZERO) + delta
                else:
                    ex.disponible = max(ZERO, (ex.disponible or ZERO) + delta)
                ex.save()
                entrada_cant = delta if delta > 0 else ZERO
                salida_cant = -delta if delta < 0 else ZERO

            # Actualiza costo "ultimo" y promedio del catalogo cuando hay entrada
            if entrada_cant > 0 and costo > 0:
                producto.costo_ultimo = costo
                producto.costo_promedio = ex.costo_promedio or costo
                producto.save(update_fields=["costo_ultimo", "costo_promedio"])

            # Kardex
            saldo_cant_prev, saldo_costo_prev, saldo_imp_prev = self._ultimo_saldo(
                producto, almacen,
            )
            saldo_cant = saldo_cant_prev + entrada_cant - salida_cant
            if saldo_cant > 0 and entrada_cant > 0:
                nuevo_imp = saldo_imp_prev + entrada_cant * costo
                saldo_costo = nuevo_imp / saldo_cant
            elif saldo_cant > 0:
                saldo_costo = saldo_costo_prev
                nuevo_imp = saldo_costo * saldo_cant
            else:
                saldo_costo = ZERO
                nuevo_imp = ZERO

            Kardex.objects.create(
                empresa=mov.empresa, producto=producto, almacen=almacen,
                movimiento=mov, movimiento_detalle=det,
                fecha=mov.fecha, tipo=mov.tipo, subtipo=mov.subtipo or "",
                folio=mov.folio,
                cantidad_entrada=entrada_cant, cantidad_salida=salida_cant,
                costo_unitario=costo,
                importe_entrada=entrada_cant * costo,
                importe_salida=salida_cant * (saldo_costo_prev or costo),
                saldo_cantidad=saldo_cant,
                saldo_costo_promedio=saldo_costo,
                saldo_importe=nuevo_imp,
                metodo_costeo=producto.metodo_costeo,
                referencia=mov.referencia,
            )

        mov.estado = "APROBADO"
        mov.aprobado_por = user
        mov.aprobado_en = timezone.now()
        mov.save(update_fields=["estado", "aprobado_por", "aprobado_en"])

    @action(detail=True, methods=["post"])
    def aprobar(self, request, pk=None):
        mov = self.get_object()
        if mov.estado != "BORRADOR":
            return Response(
                {"detail": f"Solo se pueden aprobar movimientos en BORRADOR (actual={mov.estado})."},
                status=400,
            )
        try:
            self._confirmar(mov, request.user)
        except ValueError as e:
            return Response({"detail": str(e)}, status=400)
        log_evento(
            user=request.user, empresa=mov.empresa,
            accion="almacen.mov.aprobar",
            descripcion=f"Movimiento {mov.folio} aprobado",
            request=request,
        )
        return Response(MovimientoSerializer(mov).data)

    @action(detail=True, methods=["post"])
    def cancelar(self, request, pk=None):
        mov = self.get_object()
        if mov.estado == "CANCELADO":
            return Response({"detail": "Ya estaba cancelado."}, status=400)
        mov.estado = "CANCELADO"
        mov.cancelado_por = request.user
        mov.cancelado_en = timezone.now()
        mov.save(update_fields=["estado", "cancelado_por", "cancelado_en"])
        log_evento(
            user=request.user, empresa=mov.empresa,
            accion="almacen.mov.cancelar",
            descripcion=f"Movimiento {mov.folio} cancelado",
            request=request,
        )
        return Response(MovimientoSerializer(mov).data)

    def _crear_y_aprobar(self, request, tipo):
        data = dict(request.data)
        data["tipo"] = tipo
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        mov = serializer.save(usuario=request.user)
        if request.data.get("aprobar"):
            try:
                self._confirmar(mov, request.user)
            except ValueError as e:
                return Response({"detail": str(e), "movimiento_id": mov.id}, status=400)
        return Response(MovimientoSerializer(mov).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"])
    def entrada(self, request):
        return self._crear_y_aprobar(request, "ENTRADA")

    @action(detail=False, methods=["post"])
    def salida(self, request):
        return self._crear_y_aprobar(request, "SALIDA")

    @action(detail=False, methods=["post"])
    def ajuste(self, request):
        return self._crear_y_aprobar(request, "AJUSTE")

    @action(detail=True, methods=["get"])
    def imprimir(self, request, pk=None):
        mov = self.get_object()
        data = MovimientoSerializer(mov).data
        data["impreso_en"] = timezone.now().isoformat()
        return Response(data)


class MovimientoDetalleViewSet(viewsets.ModelViewSet):
    queryset = MovimientoDetalle.objects.select_related(
        "movimiento", "producto", "lote", "serie",
    )
    serializer_class = MovimientoDetalleSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["movimiento", "producto", "lote", "serie"]

    def get_queryset(self):
        qs = super().get_queryset()
        u = self.request.user
        if u.is_superuser:
            return qs
        ids = list(u.empresas.filter(activo=True).values_list("empresa_id", flat=True))
        return qs.filter(movimiento__empresa_id__in=ids)


# ---------------------------------------------------------------------------
# Transferencias
# ---------------------------------------------------------------------------


class TransferenciaViewSet(_EmpresaScopedAlmacen):
    queryset = Transferencia.objects.select_related(
        "almacen_origen", "almacen_destino",
    ).prefetch_related("detalles__producto", "detalles__lote")
    serializer_class = TransferenciaSerializer
    filterset_fields = [
        "empresa", "estado", "almacen_origen", "almacen_destino",
    ]
    search_fields = ["folio", "guia", "transportista"]

    def perform_create(self, serializer):
        tr = serializer.save(creada_por=self.request.user)
        log_evento(
            user=self.request.user, empresa=tr.empresa,
            accion="almacen.transferencia.crear",
            descripcion=f"Transferencia {tr.folio} creada",
            request=self.request,
        )

    def _generar_folio(self, empresa, prefijo):
        ts = timezone.now().strftime("%Y%m%d%H%M%S")
        return f"{prefijo}-{empresa.id}-{ts}"

    @transaction.atomic
    @action(detail=True, methods=["post"])
    def enviar(self, request, pk=None):
        tr = self.get_object()
        if tr.estado != "BORRADOR":
            return Response({"detail": "Solo se puede enviar desde BORRADOR."}, status=400)
        if not tr.detalles.exists():
            return Response({"detail": "Transferencia sin detalles."}, status=400)
        mov = Movimiento.objects.create(
            empresa=tr.empresa,
            folio=self._generar_folio(tr.empresa, "TR-OUT"),
            tipo="SALIDA",
            subtipo="TRASPASO",
            fecha=tr.fecha_envio,
            almacen_origen=tr.almacen_origen,
            estado="BORRADOR",
            referencia=f"Transferencia {tr.folio}",
            usuario=request.user,
        )
        for det in tr.detalles.all():
            MovimientoDetalle.objects.create(
                movimiento=mov,
                producto=det.producto,
                cantidad=det.cantidad_enviada,
                costo_unitario=det.costo_unitario,
                lote=det.lote,
                serie=det.serie,
                ubicacion_origen=det.ubicacion_origen,
            )
        try:
            MovimientoViewSet()._confirmar(mov, request.user)  # reusa logica
        except ValueError as e:
            return Response({"detail": str(e)}, status=400)
        tr.estado = "EN_TRANSITO"
        tr.movimiento_salida = mov
        tr.save(update_fields=["estado", "movimiento_salida"])
        log_evento(
            user=request.user, empresa=tr.empresa,
            accion="almacen.transferencia.enviar",
            descripcion=f"Transferencia {tr.folio} enviada",
            request=request,
        )
        return Response(TransferenciaSerializer(tr).data)

    @transaction.atomic
    @action(detail=True, methods=["post"])
    def recibir(self, request, pk=None):
        tr = self.get_object()
        if tr.estado not in ("EN_TRANSITO", "ENVIADA"):
            return Response({"detail": "Solo se reciben transferencias en transito."}, status=400)
        mov = Movimiento.objects.create(
            empresa=tr.empresa,
            folio=self._generar_folio(tr.empresa, "TR-IN"),
            tipo="ENTRADA",
            subtipo="TRASPASO",
            fecha=timezone.now(),
            almacen_destino=tr.almacen_destino,
            estado="BORRADOR",
            referencia=f"Transferencia {tr.folio}",
            usuario=request.user,
        )
        for det in tr.detalles.all():
            cant_recib = det.cantidad_recibida or det.cantidad_enviada
            det.cantidad_recibida = cant_recib
            det.save(update_fields=["cantidad_recibida"])
            MovimientoDetalle.objects.create(
                movimiento=mov,
                producto=det.producto,
                cantidad=cant_recib,
                costo_unitario=det.costo_unitario,
                lote=det.lote,
                serie=det.serie,
                ubicacion_destino=det.ubicacion_destino,
            )
        try:
            MovimientoViewSet()._confirmar(mov, request.user)
        except ValueError as e:
            return Response({"detail": str(e)}, status=400)
        tr.estado = "RECIBIDA"
        tr.fecha_recepcion = timezone.now()
        tr.recibida_por = request.user
        tr.movimiento_entrada = mov
        tr.save(update_fields=[
            "estado", "fecha_recepcion", "recibida_por", "movimiento_entrada",
        ])
        log_evento(
            user=request.user, empresa=tr.empresa,
            accion="almacen.transferencia.recibir",
            descripcion=f"Transferencia {tr.folio} recibida",
            request=request,
        )
        return Response(TransferenciaSerializer(tr).data)

    @action(detail=True, methods=["post"])
    def cancelar(self, request, pk=None):
        tr = self.get_object()
        if tr.estado == "CANCELADA":
            return Response({"detail": "Ya estaba cancelada."}, status=400)
        tr.estado = "CANCELADA"
        tr.save(update_fields=["estado"])
        log_evento(
            user=request.user, empresa=tr.empresa,
            accion="almacen.transferencia.cancelar",
            descripcion=f"Transferencia {tr.folio} cancelada",
            request=request,
        )
        return Response(TransferenciaSerializer(tr).data)


# ---------------------------------------------------------------------------
# Kardex (read-only)
# ---------------------------------------------------------------------------


class KardexViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Kardex.objects.select_related(
        "producto", "almacen", "movimiento",
    )
    serializer_class = KardexSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["empresa", "producto", "almacen", "tipo"]
    ordering_fields = ["fecha", "id"]

    def get_queryset(self):
        qs = super().get_queryset()
        u = self.request.user
        if u.is_superuser:
            return qs
        ids = list(u.empresas.filter(activo=True).values_list("empresa_id", flat=True))
        return qs.filter(empresa_id__in=ids)

    @action(detail=False, methods=["get"], url_path="por_producto")
    def por_producto(self, request):
        producto_id = request.query_params.get("producto")
        almacen_id = request.query_params.get("almacen")
        if not producto_id:
            return Response({"detail": "Falta producto."}, status=400)
        qs = self.get_queryset().filter(producto_id=producto_id)
        if almacen_id:
            qs = qs.filter(almacen_id=almacen_id)
        qs = qs.order_by("fecha", "id")
        return Response(KardexSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"])
    def exportar(self, request):
        return self._exportar_excel(request)

    @action(detail=False, methods=["get"], url_path="export-excel")
    def export_excel(self, request):
        return self._exportar_excel(request)

    def _exportar_excel(self, request):
        try:
            from openpyxl import Workbook
        except Exception:
            return Response(
                {"detail": "openpyxl no disponible en el servidor."},
                status=500,
            )
        wb = Workbook()
        ws = wb.active
        ws.title = "Kardex"
        ws.append([
            "Fecha", "Folio", "Tipo", "Subtipo", "Producto", "Almacen",
            "Entrada", "Salida", "Costo unitario",
            "Saldo cantidad", "Saldo costo promedio", "Saldo importe",
        ])
        for k in self.get_queryset().order_by("fecha", "id"):
            ws.append([
                k.fecha.strftime("%Y-%m-%d %H:%M") if k.fecha else "",
                k.folio, k.tipo, k.subtipo,
                k.producto.sku, k.almacen.codigo,
                float(k.cantidad_entrada or 0),
                float(k.cantidad_salida or 0),
                float(k.costo_unitario or 0),
                float(k.saldo_cantidad or 0),
                float(k.saldo_costo_promedio or 0),
                float(k.saldo_importe or 0),
            ])
        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        resp = HttpResponse(
            buf.read(),
            content_type=(
                "application/vnd.openxmlformats-officedocument."
                "spreadsheetml.sheet"
            ),
        )
        resp["Content-Disposition"] = 'attachment; filename="kardex.xlsx"'
        return resp


# ---------------------------------------------------------------------------
# Alertas
# ---------------------------------------------------------------------------


class AlertaViewSet(_EmpresaScopedAlmacen):
    queryset = Alerta.objects.select_related(
        "producto", "almacen", "lote", "atendida_por",
    )
    serializer_class = AlertaSerializer
    filterset_fields = ["empresa", "tipo", "nivel", "producto", "almacen", "atendida"]
    search_fields = ["mensaje", "producto__sku", "producto__nombre"]

    @action(detail=True, methods=["post"])
    def atender(self, request, pk=None):
        alerta = self.get_object()
        alerta.atendida = True
        alerta.atendida_en = timezone.now()
        alerta.atendida_por = request.user
        alerta.comentario_atencion = request.data.get("comentario", "")
        alerta.save(update_fields=[
            "atendida", "atendida_en", "atendida_por", "comentario_atencion",
        ])
        log_evento(
            user=request.user, empresa=alerta.empresa,
            accion="almacen.alerta.atender",
            descripcion=f"Alerta {alerta.tipo} atendida ({alerta.producto.sku})",
            request=request,
        )
        return Response(AlertaSerializer(alerta).data)

    @action(detail=False, methods=["get"])
    def pendientes(self, request):
        qs = self.get_queryset().filter(atendida=False)
        return Response(AlertaSerializer(qs, many=True).data)

    @action(detail=False, methods=["post"], url_path="generar")
    def generar(self, request):
        """Calcula alertas idempotentemente para la empresa activa."""
        return self._generar(request)

    @action(detail=False, methods=["post"], url_path="calcular")
    def calcular(self, request):
        return self._generar(request)

    def _generar(self, request):
        empresa_id = request.data.get("empresa") or self._empresa_activa_del_user()
        if not empresa_id:
            return Response({"detail": "Falta empresa."}, status=400)
        creadas = 0
        hoy = date.today()
        limite = hoy + timedelta(days=30)

        # Bajo inventario / sin stock / punto de reorden
        productos = Producto.objects.filter(empresa_id=empresa_id, activo=True)
        for p in productos:
            total = Existencia.objects.filter(producto=p).aggregate(t=Sum("cantidad"))["t"] or ZERO
            if total <= 0 and p.inventario_min > 0:
                _, created = Alerta.objects.get_or_create(
                    empresa_id=empresa_id, tipo="SIN_STOCK",
                    producto=p, almacen=None, lote=None, atendida=False,
                    defaults={
                        "nivel": "CRITICA",
                        "mensaje": f"Producto {p.sku} sin existencias.",
                        "cantidad_actual": total,
                        "umbral": p.inventario_min,
                    },
                )
                if created:
                    creadas += 1
            elif p.inventario_min and total < p.inventario_min:
                _, created = Alerta.objects.get_or_create(
                    empresa_id=empresa_id, tipo="BAJO_INVENTARIO",
                    producto=p, almacen=None, lote=None, atendida=False,
                    defaults={
                        "nivel": "ADVERTENCIA",
                        "mensaje": f"{p.sku} por debajo del minimo ({total} < {p.inventario_min}).",
                        "cantidad_actual": total,
                        "umbral": p.inventario_min,
                    },
                )
                if created:
                    creadas += 1
            elif p.punto_reorden and total <= p.punto_reorden:
                _, created = Alerta.objects.get_or_create(
                    empresa_id=empresa_id, tipo="PUNTO_REORDEN",
                    producto=p, almacen=None, lote=None, atendida=False,
                    defaults={
                        "nivel": "ADVERTENCIA",
                        "mensaje": f"{p.sku} en punto de reorden ({total}).",
                        "cantidad_actual": total,
                        "umbral": p.punto_reorden,
                    },
                )
                if created:
                    creadas += 1

            if p.inventario_max and total > p.inventario_max and p.inventario_max > 0:
                _, created = Alerta.objects.get_or_create(
                    empresa_id=empresa_id, tipo="EXCESO",
                    producto=p, almacen=None, lote=None, atendida=False,
                    defaults={
                        "nivel": "INFO",
                        "mensaje": f"{p.sku} excede el maximo ({total} > {p.inventario_max}).",
                        "cantidad_actual": total,
                        "umbral": p.inventario_max,
                    },
                )
                if created:
                    creadas += 1

        # Caducidades proximas
        lotes_qs = Lote.objects.filter(
            empresa_id=empresa_id, activo=True,
            fecha_caducidad__isnull=False,
            fecha_caducidad__gte=hoy,
            fecha_caducidad__lte=limite,
        )
        for lote in lotes_qs:
            dias = (lote.fecha_caducidad - hoy).days
            nivel = "CRITICA" if dias <= 7 else "ADVERTENCIA"
            _, created = Alerta.objects.get_or_create(
                empresa_id=empresa_id, tipo="CADUCIDAD_PROXIMA",
                producto=lote.producto, lote=lote, almacen=None, atendida=False,
                defaults={
                    "nivel": nivel,
                    "mensaje": f"Lote {lote.numero_lote} de {lote.producto.sku} caduca en {dias} dias.",
                    "dias_restantes": dias,
                    "cantidad_actual": lote.cantidad_inicial,
                    "umbral": 30,
                },
            )
            if created:
                creadas += 1

        log_evento(
            user=request.user, empresa_id=empresa_id,
            accion="almacen.alerta.generar",
            descripcion=f"Generadas {creadas} nuevas alertas",
            request=request,
        )
        return Response({"creadas": creadas})


# ---------------------------------------------------------------------------
# Reportes y dashboard
# ---------------------------------------------------------------------------


class ReporteAlmacenViewSet(viewsets.ViewSet):
    """Endpoints de reporte agregados bajo /api/almacen/reportes/."""

    permission_classes = [permissions.IsAuthenticated]

    def _empresas(self, user):
        if user.is_superuser:
            return None
        return list(user.empresas.filter(activo=True).values_list("empresa_id", flat=True))

    @action(detail=False, methods=["get"])
    def existencias(self, request):
        qs = Existencia.objects.select_related("producto", "almacen")
        ids = self._empresas(request.user)
        if ids is not None:
            qs = qs.filter(empresa_id__in=ids)
        return Response(ExistenciaSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"])
    def kardex(self, request):
        qs = Kardex.objects.select_related("producto", "almacen")
        ids = self._empresas(request.user)
        if ids is not None:
            qs = qs.filter(empresa_id__in=ids)
        producto = request.query_params.get("producto")
        if producto:
            qs = qs.filter(producto_id=producto)
        return Response(KardexSerializer(qs.order_by("fecha", "id"), many=True).data)

    @action(detail=False, methods=["get"])
    def valorizacion(self, request):
        qs = Existencia.objects.select_related("producto", "almacen")
        ids = self._empresas(request.user)
        if ids is not None:
            qs = qs.filter(empresa_id__in=ids)
        total = ZERO
        rows = []
        for e in qs:
            valor = (e.cantidad or ZERO) * (e.costo_promedio or e.producto.costo_promedio or ZERO)
            total += valor
            rows.append({
                "producto": e.producto.sku, "nombre": e.producto.nombre,
                "almacen": e.almacen.codigo, "cantidad": float(e.cantidad or 0),
                "costo": float(e.costo_promedio or 0), "valor": float(valor),
            })
        return Response({"total": float(total), "filas": rows})

    @action(detail=False, methods=["get"])
    def movimientos(self, request):
        qs = Movimiento.objects.select_related("almacen_origen", "almacen_destino")
        ids = self._empresas(request.user)
        if ids is not None:
            qs = qs.filter(empresa_id__in=ids)
        fecha_ini = request.query_params.get("desde")
        fecha_fin = request.query_params.get("hasta")
        if fecha_ini:
            qs = qs.filter(fecha__gte=fecha_ini)
        if fecha_fin:
            qs = qs.filter(fecha__lte=fecha_fin)
        return Response(MovimientoSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"])
    def rotacion(self, request):
        """Calcula rotacion (salidas totales / saldo promedio) aproximada."""
        ids = self._empresas(request.user)
        agg = Kardex.objects.values(
            "producto_id", "producto__sku", "producto__nombre",
        ).annotate(
            salidas=Sum("cantidad_salida"),
            entradas=Sum("cantidad_entrada"),
        )
        if ids is not None:
            agg = agg.filter(empresa_id__in=ids)
        return Response(list(agg))

    @action(detail=False, methods=["get"])
    def caducidades(self, request):
        dias = int(request.query_params.get("dias", 30))
        hoy = date.today()
        limite = hoy + timedelta(days=dias)
        qs = Lote.objects.select_related("producto").filter(
            activo=True,
            fecha_caducidad__isnull=False,
            fecha_caducidad__gte=hoy,
            fecha_caducidad__lte=limite,
        )
        ids = self._empresas(request.user)
        if ids is not None:
            qs = qs.filter(empresa_id__in=ids)
        return Response(LoteSerializer(qs.order_by("fecha_caducidad"), many=True).data)


class DashboardAlmacenViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def _empresas(self, user):
        if user.is_superuser:
            return None
        return list(user.empresas.filter(activo=True).values_list("empresa_id", flat=True))

    @action(detail=False, methods=["get"])
    def resumen(self, request):
        ids = self._empresas(request.user)
        prod_qs = Producto.objects.all()
        alm_qs = Almacen.objects.all()
        ex_qs = Existencia.objects.all()
        mov_qs = Movimiento.objects.all()
        alerta_qs = Alerta.objects.all()
        if ids is not None:
            prod_qs = prod_qs.filter(empresa_id__in=ids)
            alm_qs = alm_qs.filter(empresa_id__in=ids)
            ex_qs = ex_qs.filter(empresa_id__in=ids)
            mov_qs = mov_qs.filter(empresa_id__in=ids)
            alerta_qs = alerta_qs.filter(empresa_id__in=ids)

        total_valor = ZERO
        for e in ex_qs.select_related("producto"):
            total_valor += (e.cantidad or ZERO) * (
                e.costo_promedio or e.producto.costo_promedio or ZERO
            )

        return Response({
            "productos": prod_qs.count(),
            "productos_activos": prod_qs.filter(activo=True).count(),
            "almacenes": alm_qs.count(),
            "existencias": ex_qs.count(),
            "movimientos_borrador": mov_qs.filter(estado="BORRADOR").count(),
            "movimientos_aprobados_hoy": mov_qs.filter(
                estado="APROBADO",
                aprobado_en__date=date.today(),
            ).count(),
            "alertas_pendientes": alerta_qs.filter(atendida=False).count(),
            "alertas_criticas": alerta_qs.filter(
                atendida=False, nivel="CRITICA",
            ).count(),
            "valor_inventario": float(total_valor),
        })
