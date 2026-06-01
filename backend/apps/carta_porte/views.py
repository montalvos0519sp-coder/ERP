from __future__ import annotations

from rest_framework import permissions, viewsets

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


class CartaPorteViewSet(_EmpresaScoped):
    queryset = CartaPorte.objects.select_related("autotransporte", "operador").prefetch_related(
        "ubicaciones_cp", "mercancias"
    )
    serializer_class = CartaPorteSerializer
    filterset_fields = ["empresa", "estado"]
    search_fields = ["folio_fiscal", "folio_interno"]
