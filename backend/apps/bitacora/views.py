from rest_framework import permissions, viewsets

from apps.core.permissions import EsStaffEmpresa

from .models import EventoBitacora
from .serializers import EventoBitacoraSerializer


class EventoBitacoraViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = EventoBitacora.objects.select_related("user", "empresa")
    serializer_class = EventoBitacoraSerializer
    permission_classes = [permissions.IsAuthenticated, EsStaffEmpresa]
    filterset_fields = ["user", "empresa", "nivel", "accion"]
    search_fields = ["accion", "descripcion", "ruta"]
