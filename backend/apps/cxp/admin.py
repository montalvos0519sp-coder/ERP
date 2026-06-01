from django.contrib import admin
from .models import FacturaProveedor, PagoProveedor, Proveedor
for m in [Proveedor, FacturaProveedor, PagoProveedor]:
    admin.site.register(m)
