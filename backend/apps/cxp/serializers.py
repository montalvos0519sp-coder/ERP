from rest_framework import serializers
from .models import FacturaProveedor, PagoProveedor, Proveedor

class ProveedorSerializer(serializers.ModelSerializer):
    class Meta: model = Proveedor; fields = "__all__"

class FacturaProveedorSerializer(serializers.ModelSerializer):
    proveedor_nombre = serializers.CharField(source="proveedor.razon_social", read_only=True)
    class Meta: model = FacturaProveedor; fields = "__all__"

class PagoProveedorSerializer(serializers.ModelSerializer):
    class Meta: model = PagoProveedor; fields = "__all__"
