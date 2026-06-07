from __future__ import annotations

from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.models import Empresa

from .models import Autotransporte, CartaPorte, Mercancia, Operador, Ubicacion
from .serializers import (
    AutotransporteSerializer,
    CartaPorteSerializer,
    MercanciaSerializer,
    OperadorSerializer,
    UbicacionSerializer,
)


def _empresas_del_usuario(user):
    if user.is_superuser:
        return Empresa.objects.all().values_list("id", flat=True)
    return user.empresas.filter(activo=True).values_list("empresa_id", flat=True)


class _EmpresaScoped(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        ids = _empresas_del_usuario(self.request.user)
        return super().get_queryset().filter(empresa__in=ids)


class UbicacionViewSet(_EmpresaScoped):
    queryset = Ubicacion.objects.all()
    serializer_class = UbicacionSerializer
    filterset_fields = ["empresa", "estado", "activa"]
    search_fields = ["nombre", "codigo_postal", "calle"]


class AutotransporteViewSet(_EmpresaScoped):
    queryset = Autotransporte.objects.all()
    serializer_class = AutotransporteSerializer
    filterset_fields = ["empresa", "activa"]
    search_fields = ["placas"]


class OperadorViewSet(_EmpresaScoped):
    queryset = Operador.objects.all()
    serializer_class = OperadorSerializer
    filterset_fields = ["empresa", "activo"]
    search_fields = ["nombre", "rfc"]

    def perform_create(self, serializer):
        op = serializer.save()
        from .sync_rh import asegurar_empleado_de_operador
        asegurar_empleado_de_operador(op)

    def perform_update(self, serializer):
        op = serializer.save()
        from .sync_rh import asegurar_empleado_de_operador
        asegurar_empleado_de_operador(op)

    @action(detail=True, methods=["patch"], url_path="licencia")
    def licencia(self, request, pk=None):
        """Actualiza la licencia federal del operador (refleja en Viajes).

        Acepta tanto las llaves del frontend migrado (`numero`,
        `fecha_vencimiento`) como las internas (`numero_licencia`,
        `licencia_vencimiento`)."""
        op = self.get_object()
        d = request.data
        num = d.get("numero", d.get("numero_licencia"))
        venc = d.get("fecha_vencimiento", d.get("licencia_vencimiento"))
        rfc = d.get("rfc")
        campos = []
        if num is not None:
            op.licencia = str(num).strip()
            campos.append("licencia")
        if venc is not None:
            op.licencia_vencimiento = venc or None
            campos.append("licencia_vencimiento")
        if rfc is not None:
            nuevo_rfc = str(rfc).strip().upper()
            if nuevo_rfc and nuevo_rfc != op.rfc:
                # No permitir duplicar RFC dentro de la empresa.
                if Operador.objects.filter(empresa=op.empresa, rfc=nuevo_rfc).exclude(pk=op.pk).exists():
                    return Response({"detail": f"Ya existe otro operador con el RFC {nuevo_rfc}."}, status=400)
                op.rfc = nuevo_rfc
                campos.append("rfc")
        if campos:
            op.save(update_fields=campos)
            # Mantener sincronizado el empleado de RH vinculado.
            from .sync_rh import asegurar_empleado_de_operador
            empleado = asegurar_empleado_de_operador(op)
            if "rfc" in campos and empleado and empleado.rfc != op.rfc:
                empleado.rfc = op.rfc
                empleado.save(update_fields=["rfc"])
        return Response(OperadorSerializer(op).data)


class CartaPorteViewSet(_EmpresaScoped):
    queryset = CartaPorte.objects.select_related("autotransporte", "operador").prefetch_related(
        "ubicaciones_cp", "mercancias"
    )
    serializer_class = CartaPorteSerializer
    filterset_fields = ["empresa", "estado"]
    search_fields = ["folio_fiscal", "folio_interno"]
