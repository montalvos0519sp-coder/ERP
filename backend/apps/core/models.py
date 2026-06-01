"""Modelos core del ERP.

Filosofia: TODO se configura desde la UI. No hay datos hardcodeados.
- Empresa: organizacion (multi-tenant suave por FK).
- Sucursal: subdivision opcional de la empresa.
- PerfilUsuario: extension del User de Django con tema/preferencias.
- UsuarioEmpresa: pertenencia de un usuario a una empresa con rol.
- ConfiguracionEmpresa: parametros editables (PAC, RFC, certificados, etc.).
"""
from __future__ import annotations

from django.conf import settings
from django.contrib.auth.models import User
from django.db import models


class Empresa(models.Model):
    """Tenant/organizacion. Toda transaccion se asocia a una empresa."""

    nombre_comercial = models.CharField(max_length=200)
    razon_social = models.CharField(max_length=255)
    rfc = models.CharField(max_length=13, unique=True)
    regimen_fiscal = models.CharField(max_length=10, blank=True, help_text="Clave SAT del regimen")
    cp_fiscal = models.CharField(max_length=10, blank=True)
    direccion = models.CharField(max_length=300, blank=True)
    telefono = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    logo = models.ImageField(upload_to="empresas/logos/", blank=True, null=True)
    color_primario = models.CharField(max_length=9, default="#1A73E8")
    color_secundario = models.CharField(max_length=9, default="#34A853")
    activa = models.BooleanField(default=True)
    creada = models.DateTimeField(auto_now_add=True)
    actualizada = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["nombre_comercial"]

    def __str__(self) -> str:
        return f"{self.nombre_comercial} ({self.rfc})"


class Sucursal(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="sucursales")
    codigo = models.CharField(max_length=20)
    nombre = models.CharField(max_length=150)
    direccion = models.CharField(max_length=300, blank=True)
    cp = models.CharField(max_length=10, blank=True)
    activa = models.BooleanField(default=True)

    class Meta:
        unique_together = [("empresa", "codigo")]
        ordering = ["empresa", "nombre"]

    def __str__(self) -> str:
        return f"{self.empresa.nombre_comercial} · {self.nombre}"


class PerfilUsuario(models.Model):
    """Datos extra del usuario. Se crea automaticamente via signal."""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="perfil")
    telefono = models.CharField(max_length=30, blank=True)
    puesto = models.CharField(max_length=120, blank=True)
    avatar = models.ImageField(upload_to="usuarios/avatar/", blank=True, null=True)
    empresa_activa = models.ForeignKey(
        Empresa, on_delete=models.SET_NULL, blank=True, null=True, related_name="usuarios_activos"
    )
    sucursal_activa = models.ForeignKey(
        Sucursal, on_delete=models.SET_NULL, blank=True, null=True
    )
    # Preferencias UI (se persisten en backend para hidratacion inicial,
    # despues el frontend las edita en localStorage como en 3rrecycling).
    tema = models.CharField(
        max_length=10, choices=[("dark", "Oscuro"), ("light", "Claro")], default="dark"
    )
    fuente = models.CharField(max_length=20, default="system")
    color_acento = models.CharField(max_length=9, default="#1A73E8")

    def __str__(self) -> str:
        return f"Perfil de {self.user.username}"


ROLES_EMPRESA = [
    ("OWNER", "Propietario"),
    ("STAFF", "Staff (administrador)"),
    ("MANAGER", "Gerente"),
    ("USER", "Usuario"),
    ("READONLY", "Solo lectura"),
]


class UsuarioEmpresa(models.Model):
    """Relacion N-N entre User y Empresa, con un rol asignado."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="empresas")
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="miembros")
    rol = models.CharField(max_length=15, choices=ROLES_EMPRESA, default="USER")
    sucursales = models.ManyToManyField(Sucursal, blank=True)
    activo = models.BooleanField(default=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("user", "empresa")]
        ordering = ["empresa", "user__username"]

    def __str__(self) -> str:
        return f"{self.user.username} · {self.empresa.nombre_comercial} ({self.rol})"

    @property
    def es_staff(self) -> bool:
        return self.rol in {"OWNER", "STAFF"}


class ConfiguracionEmpresa(models.Model):
    """Parametros editables por empresa, todo desde la UI.

    Esta tabla es el corazon de "100% configurable". Aqui van:
    - Credenciales del PAC (Factura.com u otro) y URL base.
    - Datos del emisor para CFDI.
    - Flags de funcionalidades activas.

    Sin certificados directamente (van en CertificadoCSD para versionado).
    """

    empresa = models.OneToOneField(Empresa, on_delete=models.CASCADE, related_name="config")

    # PAC
    pac_proveedor = models.CharField(
        max_length=30,
        choices=[("facturacom", "Factura.com"), ("manual", "Sin PAC (manual)")],
        default="facturacom",
    )
    pac_base_url = models.URLField(blank=True, default="https://api.factura.com")
    pac_api_key = models.CharField(max_length=255, blank=True)
    pac_secret_key = models.CharField(max_length=255, blank=True)
    pac_plugin = models.CharField(max_length=10, blank=True, default="9")
    pac_sandbox = models.BooleanField(default=False)

    # Emisor por defecto (puede sobreescribirse por sucursal)
    emisor_rfc = models.CharField(max_length=13, blank=True)
    emisor_nombre = models.CharField(max_length=255, blank=True)
    emisor_regimen = models.CharField(max_length=10, blank=True)
    emisor_cp = models.CharField(max_length=10, blank=True)

    # Series CFDI mapeables (clave -> id PAC). Se gestiona via FacturaSerie.
    moneda_default = models.CharField(max_length=3, default="MXN")
    forma_pago_default = models.CharField(max_length=5, default="99")
    metodo_pago_default = models.CharField(max_length=5, default="PUE")
    uso_cfdi_default = models.CharField(max_length=5, default="S01")

    # Flags
    requiere_carta_porte = models.BooleanField(default=False)
    permite_facturacion = models.BooleanField(default=True)
    notificaciones_email = models.BooleanField(default=False)

    actualizado = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"Configuracion {self.empresa.nombre_comercial}"


class CertificadoCSD(models.Model):
    """Certificado de Sello Digital de la empresa, subido desde la UI."""

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="certificados")
    numero_certificado = models.CharField(max_length=20, blank=True)
    archivo_cer = models.FileField(upload_to="csd/cer/")
    archivo_key = models.FileField(upload_to="csd/key/")
    password_csd = models.CharField(max_length=255, help_text="Contrasena del .key (almacenar cifrado en prod)")
    vigente_desde = models.DateField(blank=True, null=True)
    vigente_hasta = models.DateField(blank=True, null=True)
    activo = models.BooleanField(default=True)
    subido_por = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True)
    subido = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-subido"]

    def __str__(self) -> str:
        return f"CSD {self.numero_certificado or self.id} · {self.empresa.nombre_comercial}"
