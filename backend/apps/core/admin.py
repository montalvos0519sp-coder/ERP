from django.contrib import admin

from .models import (
    CertificadoCSD,
    ConfiguracionEmpresa,
    Empresa,
    PerfilUsuario,
    Sucursal,
    UsuarioEmpresa,
)


@admin.register(Empresa)
class EmpresaAdmin(admin.ModelAdmin):
    list_display = ("nombre_comercial", "rfc", "activa", "creada")
    search_fields = ("nombre_comercial", "rfc", "razon_social")


@admin.register(Sucursal)
class SucursalAdmin(admin.ModelAdmin):
    list_display = ("empresa", "codigo", "nombre", "activa")
    list_filter = ("empresa",)


@admin.register(PerfilUsuario)
class PerfilUsuarioAdmin(admin.ModelAdmin):
    list_display = ("user", "empresa_activa", "tema")


@admin.register(UsuarioEmpresa)
class UsuarioEmpresaAdmin(admin.ModelAdmin):
    list_display = ("user", "empresa", "rol", "activo")
    list_filter = ("empresa", "rol", "activo")


@admin.register(ConfiguracionEmpresa)
class ConfiguracionEmpresaAdmin(admin.ModelAdmin):
    list_display = ("empresa", "pac_proveedor", "pac_sandbox")


@admin.register(CertificadoCSD)
class CertificadoCSDAdmin(admin.ModelAdmin):
    list_display = ("empresa", "numero_certificado", "vigente_hasta", "activo")
    list_filter = ("empresa", "activo")
