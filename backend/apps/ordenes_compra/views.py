from rest_framework import permissions, viewsets
from .models import OrdenCompra, PartidaOC
from .serializers import OrdenCompraSerializer, PartidaOCSerializer


class OrdenCompraViewSet(viewsets.ModelViewSet):
    queryset = OrdenCompra.objects.select_related("proveedor").prefetch_related("partidas")
    serializer_class = OrdenCompraSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["empresa", "proveedor", "estado"]
    search_fields = ["folio"]

    def perform_create(self, serializer):
        serializer.save(creado_por=self.request.user)


class PartidaOCViewSet(viewsets.ModelViewSet):
    queryset = PartidaOC.objects.select_related("orden", "producto")
    serializer_class = PartidaOCSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["orden"]
