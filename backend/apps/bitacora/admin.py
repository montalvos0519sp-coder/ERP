from django.contrib import admin
from .models import EventoBitacora

@admin.register(EventoBitacora)
class EventoBitacoraAdmin(admin.ModelAdmin):
    list_display = ("fecha", "nivel", "accion", "user", "empresa")
    list_filter = ("nivel", "empresa", "fecha")
    search_fields = ("accion", "descripcion", "user__username")
