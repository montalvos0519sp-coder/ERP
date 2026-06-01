"""Permisos personalizados del ERP."""
from __future__ import annotations

from rest_framework import permissions


class EsStaffEmpresa(permissions.BasePermission):
    """Permite acceso solo a usuarios con rol OWNER/STAFF en alguna empresa o superuser."""

    message = "Solo el staff de la empresa puede realizar esta operacion."

    def has_permission(self, request, view) -> bool:
        u = request.user
        if not u.is_authenticated:
            return False
        if u.is_superuser:
            return True
        return u.empresas.filter(activo=True, rol__in=["OWNER", "STAFF"]).exists()


class TieneAccesoModulo(permissions.BasePermission):
    """Verifica que el usuario tenga el modulo asignado (via apps.modulos.AsignacionModulo)."""

    modulo_code: str | None = None

    def has_permission(self, request, view) -> bool:
        u = request.user
        if not u.is_authenticated:
            return False
        if u.is_superuser:
            return True
        modulo_code = getattr(view, "modulo_code", None) or self.modulo_code
        if not modulo_code:
            return True
        # Lazy import para evitar referencias circulares.
        from apps.modulos.models import AsignacionModulo

        return AsignacionModulo.objects.filter(
            user=u, modulo__codigo=modulo_code, activo=True
        ).exists()
