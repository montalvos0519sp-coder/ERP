from django.contrib import admin

from .models import (
    AccesoDocumento, Documento, FlujoAprobacion, PasoAprobacion, PasoFlujo,
    PropuestaMejora, SolicitudAprobacion, TipoDocumento, VersionDocumento,
)


@admin.register(TipoDocumento)
class TipoDocumentoAdmin(admin.ModelAdmin):
    list_display = ("codigo", "nombre", "categoria", "empresa", "activo")
    list_filter = ("categoria", "activo", "empresa")
    search_fields = ("codigo", "nombre")


class PasoFlujoInline(admin.TabularInline):
    model = PasoFlujo
    extra = 1


@admin.register(FlujoAprobacion)
class FlujoAprobacionAdmin(admin.ModelAdmin):
    list_display = ("nombre", "empresa", "tipo_documento", "modo", "min_aprobaciones", "activo", "es_default")
    list_filter = ("modo", "activo", "es_default", "empresa")
    inlines = [PasoFlujoInline]


@admin.register(Documento)
class DocumentoAdmin(admin.ModelAdmin):
    list_display = ("codigo", "titulo", "version", "estado", "empresa", "tipo", "creado_por", "actualizado")
    list_filter = ("estado", "tipo", "empresa")
    search_fields = ("codigo", "titulo", "palabras_clave", "etiquetas")


@admin.register(VersionDocumento)
class VersionDocumentoAdmin(admin.ModelAdmin):
    list_display = ("documento", "version", "fecha_aprobacion", "aprobado_por")


@admin.register(SolicitudAprobacion)
class SolicitudAprobacionAdmin(admin.ModelAdmin):
    list_display = ("documento", "flujo", "estado", "enviada_por", "fecha_envio")
    list_filter = ("estado",)


@admin.register(PasoAprobacion)
class PasoAprobacionAdmin(admin.ModelAdmin):
    list_display = ("solicitud", "orden", "aprobador", "estado", "decidido_en")
    list_filter = ("estado",)


@admin.register(AccesoDocumento)
class AccesoDocumentoAdmin(admin.ModelAdmin):
    list_display = ("documento", "usuario", "puede_ver", "puede_descargar", "puede_proponer_mejora")


@admin.register(PropuestaMejora)
class PropuestaMejoraAdmin(admin.ModelAdmin):
    list_display = ("titulo", "documento", "autor", "estado", "fecha")
    list_filter = ("estado",)
