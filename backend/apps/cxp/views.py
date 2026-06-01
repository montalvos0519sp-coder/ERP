from rest_framework import permissions, viewsets
from .models import FacturaProveedor, PagoProveedor, Proveedor
from .serializers import FacturaProveedorSerializer, PagoProveedorSerializer, ProveedorSerializer

class ProveedorViewSet(viewsets.ModelViewSet):
    queryset = Proveedor.objects.all()
    serializer_class = ProveedorSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["empresa", "activo"]
    search_fields = ["rfc", "razon_social"]

class FacturaProveedorViewSet(viewsets.ModelViewSet):
    queryset = FacturaProveedor.objects.select_related("proveedor")
    serializer_class = FacturaProveedorSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["empresa", "proveedor", "estado"]

class PagoProveedorViewSet(viewsets.ModelViewSet):
    queryset = PagoProveedor.objects.select_related("factura")
    serializer_class = PagoProveedorSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["factura"]
