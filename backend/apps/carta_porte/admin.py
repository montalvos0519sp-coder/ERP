from django.contrib import admin
from .models import Autotransporte, CartaPorte, CartaPorteUbicacion, Mercancia, Operador, Ubicacion

for model in [Ubicacion, Autotransporte, Operador, CartaPorte, CartaPorteUbicacion, Mercancia]:
    admin.site.register(model)
