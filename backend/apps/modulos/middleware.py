"""Middleware que valida que el usuario tenga el modulo asignado para rutas /api/<modulo>/.

Mapea el primer segmento de la URL a un codigo de modulo. Si el usuario no tiene
asignacion, devuelve 403. Superuser y staff de empresa pasan siempre.
"""
from __future__ import annotations

from django.http import JsonResponse


# URL prefix -> modulo codigo (debe coincidir con seed.py).
PREFIX_A_MODULO: dict[str, str] = {
    "api/facturacion": "facturacion",
    "api/carta-porte": "carta-porte",
    "api/viajes": "viajes",
    "api/flota": "flota",
    "api/rh": "rh-dashboard",
    "api/almacen": "almacen",
    "api/cxp": "cxp",
    "api/ordenes-compra": "ordenes-compra",
    "api/mantenimiento": "mantenimiento",
    "api/liquidaciones": "liquidaciones",
}

# Rutas que NUNCA se restringen por modulo.
EXCEPCIONES = (
    "api/auth/", "api/core/", "api/modulos/", "api/catalogos-sat/",
    "api/chat/", "api/diagramas/", "admin/",
)


class ModuloAccessMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path.lstrip("/")
        if path.startswith(EXCEPCIONES):
            return self.get_response(request)
        if not path.startswith("api/"):
            return self.get_response(request)

        codigo = None
        for prefix, code in PREFIX_A_MODULO.items():
            if path.startswith(prefix):
                codigo = code
                break
        if not codigo:
            return self.get_response(request)

        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return self.get_response(request)
        if user.is_superuser:
            return self.get_response(request)

        # Lazy import.
        from .models import AsignacionModulo

        tiene = AsignacionModulo.objects.filter(
            user=user, modulo__codigo=codigo, activo=True
        ).exists()
        if not tiene:
            return JsonResponse(
                {"detail": f"Sin acceso al modulo '{codigo}'. Solicita asignacion al administrador."},
                status=403,
            )
        return self.get_response(request)
