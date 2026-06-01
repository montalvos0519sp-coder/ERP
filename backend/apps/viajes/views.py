from rest_framework import permissions, viewsets
from apps.core.models import Empresa
from .models import Viaje
from .serializers import ViajeSerializer


class ViajeViewSet(viewsets.ModelViewSet):
    queryset = Viaje.objects.select_related("cliente", "origen", "destino", "operador", "autotransporte")
    serializer_class = ViajeSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["empresa", "estado", "cliente", "operador"]
    search_fields = ["numero"]
    ordering_fields = ["fecha_salida", "creado"]

    def get_queryset(self):
        u = self.request.user
        if u.is_superuser:
            return super().get_queryset()
        ids = u.empresas.filter(activo=True).values_list("empresa_id", flat=True)
        return super().get_queryset().filter(empresa__in=ids)

    def perform_create(self, serializer):
        serializer.save(creado_por=self.request.user)
