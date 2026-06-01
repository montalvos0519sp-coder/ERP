from django.contrib import admin

from .models import Cliente, ConceptoFactura, Factura, Pago, ProductoServicio, Serie, DoctoRelacionado


for model in [Cliente, ProductoServicio, Serie, Factura, ConceptoFactura, Pago, DoctoRelacionado]:
    admin.site.register(model)
