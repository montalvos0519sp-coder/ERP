from django.contrib import admin

from .models import AccionModulo, AsignacionModulo, Modulo, ModuloEmpresa


@admin.register(Modulo)
class ModuloAdmin(admin.ModelAdmin):
    list_display = ("codigo", "nombre", "categoria", "orden", "activo_globalmente", "es_core")
    list_filter = ("categoria", "activo_globalmente", "es_core")
    search_fields = ("codigo", "nombre")


@admin.register(AccionModulo)
class AccionModuloAdmin(admin.ModelAdmin):
    list_display = ("modulo", "codigo")


@admin.register(ModuloEmpresa)
class ModuloEmpresaAdmin(admin.ModelAdmin):
    list_display = ("empresa", "modulo", "activo")
    list_filter = ("empresa", "activo")


@admin.register(AsignacionModulo)
class AsignacionModuloAdmin(admin.ModelAdmin):
    list_display = ("user", "empresa", "modulo", "activo")
    list_filter = ("empresa", "activo")
