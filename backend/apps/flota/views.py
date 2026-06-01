from rest_framework import permissions, viewsets
from .models import CargaCombustible, Termo, Unidad
from .serializers import CargaCombustibleSerializer, TermoSerializer, UnidadSerializer


class TermoViewSet(viewsets.ModelViewSet):
    queryset = Termo.objects.all()
    serializer_class = TermoSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["empresa", "activo"]
    search_fields = ["numero", "marca", "serie"]

    def get_queryset(self):
        u = self.request.user
        if u.is_superuser:
            return super().get_queryset()
        ids = u.empresas.filter(activo=True).values_list("empresa_id", flat=True)
        return super().get_queryset().filter(empresa__in=ids)


class UnidadViewSet(viewsets.ModelViewSet):
    queryset = Unidad.objects.all()
    serializer_class = UnidadSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["empresa", "activo", "tipo"]
    search_fields = ["numero", "placas", "vin"]

    def get_queryset(self):
        u = self.request.user
        if u.is_superuser:
            return super().get_queryset()
        ids = u.empresas.filter(activo=True).values_list("empresa_id", flat=True)
        return super().get_queryset().filter(empresa__in=ids)


class CargaCombustibleViewSet(viewsets.ModelViewSet):
    queryset = CargaCombustible.objects.select_related("unidad")
    serializer_class = CargaCombustibleSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["unidad"]
