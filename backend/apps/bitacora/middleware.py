"""Middleware ligero que registra cambios (POST/PUT/PATCH/DELETE) en /api/."""
from __future__ import annotations

from .utils import log_evento


_MUTANTES = {"POST", "PUT", "PATCH", "DELETE"}


class BitacoraMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        try:
            if (
                request.method in _MUTANTES
                and request.path.startswith("/api/")
                and getattr(request, "user", None)
                and request.user.is_authenticated
                and not request.path.startswith("/api/auth/")
            ):
                empresa = None
                perfil = getattr(request.user, "perfil", None)
                if perfil:
                    empresa = perfil.empresa_activa
                log_evento(
                    user=request.user, empresa=empresa,
                    accion=f"{request.method} {request.path}",
                    descripcion=f"status={response.status_code}",
                    request=request,
                    nivel="INFO" if response.status_code < 400 else "WARN",
                )
        except Exception:
            # Bitacora nunca debe romper el request.
            pass
        return response
