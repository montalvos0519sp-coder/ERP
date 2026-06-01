"""Sistema de modulos del ERP.

- Modulo: catalogo de funcionalidades del sistema (facturacion, viajes, rh, ...).
- ModuloEmpresa: activacion del modulo en una empresa (toggle desde la UI).
- AsignacionModulo: usuario -> modulo (con scope opcional de acciones).
- AccionModulo: acciones granulares dentro de un modulo (read/write/delete/export).
"""
from __future__ import annotations

from django.conf import settings
from django.db import models

from apps.core.models import Empresa


CATEGORIAS_MODULO = [
    ("OPERATIVO", "Centro Operativo"),
    ("LOGISTICA", "Logistica y Recursos"),
    ("RH", "Recursos Humanos"),
    ("FINANZAS", "Inteligencia y Finanzas"),
    ("ADMIN", "Administracion"),
    ("CATALOGOS", "Catalogos"),
    ("HERRAMIENTAS", "Herramientas"),
]


class Modulo(models.Model):
    """Definicion de un modulo del sistema. Se siembra una vez en post_migrate."""

    codigo = models.SlugField(max_length=40, unique=True)
    nombre = models.CharField(max_length=120)
    descripcion = models.TextField(blank=True)
    categoria = models.CharField(max_length=20, choices=CATEGORIAS_MODULO, default="ADMIN")
    color = models.CharField(max_length=9, default="#1A73E8")
    icono = models.CharField(max_length=40, default="LayoutDashboard",
                             help_text="Nombre del icono lucide-react para el frontend")
    ruta_frontend = models.CharField(max_length=120, default="/")
    orden = models.PositiveIntegerField(default=100)
    requiere_staff = models.BooleanField(default=False)
    requiere_carta_porte = models.BooleanField(default=False)
    es_core = models.BooleanField(default=False, help_text="Modulos core no se pueden desactivar")
    activo_globalmente = models.BooleanField(default=True)

    class Meta:
        ordering = ["categoria", "orden", "nombre"]

    def __str__(self) -> str:
        return f"{self.nombre} ({self.codigo})"


ACCIONES_BASE = [
    ("read", "Lectura"),
    ("create", "Crear"),
    ("update", "Editar"),
    ("delete", "Eliminar"),
    ("export", "Exportar"),
    ("admin", "Administrar"),
]


class AccionModulo(models.Model):
    """Permisos granulares dentro de un modulo."""

    modulo = models.ForeignKey(Modulo, on_delete=models.CASCADE, related_name="acciones")
    codigo = models.CharField(max_length=20, choices=ACCIONES_BASE)
    descripcion = models.CharField(max_length=200, blank=True)

    class Meta:
        unique_together = [("modulo", "codigo")]
        ordering = ["modulo", "codigo"]

    def __str__(self) -> str:
        return f"{self.modulo.codigo}.{self.codigo}"


class ModuloEmpresa(models.Model):
    """Activacion de un modulo en una empresa especifica."""

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="modulos")
    modulo = models.ForeignKey(Modulo, on_delete=models.CASCADE, related_name="empresas")
    activo = models.BooleanField(default=True)
    config = models.JSONField(default=dict, blank=True,
                              help_text="Config especifica del modulo en esta empresa")
    activado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True,
        related_name="modulos_activados"
    )
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [("empresa", "modulo")]
        ordering = ["empresa", "modulo"]

    def __str__(self) -> str:
        estado = "ACTIVO" if self.activo else "INACTIVO"
        return f"{self.empresa.nombre_comercial} · {self.modulo.codigo} [{estado}]"


class AsignacionModulo(models.Model):
    """Asignacion de un modulo a un usuario dentro de una empresa.

    El staff usa este modelo para decidir quien ve que en el menu lateral.
    """

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                             related_name="asignaciones_modulo")
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE,
                                related_name="asignaciones_modulo")
    modulo = models.ForeignKey(Modulo, on_delete=models.CASCADE,
                               related_name="asignaciones")
    acciones = models.ManyToManyField(AccionModulo, blank=True)
    activo = models.BooleanField(default=True)
    asignado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True,
        related_name="asignaciones_creadas"
    )
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [("user", "empresa", "modulo")]
        ordering = ["empresa", "user__username", "modulo__nombre"]

    def __str__(self) -> str:
        return f"{self.user.username} · {self.empresa.nombre_comercial} · {self.modulo.codigo}"
