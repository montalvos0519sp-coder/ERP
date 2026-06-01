from __future__ import annotations

from .models import EventoBitacora


def log_evento(*, user=None, empresa=None, accion: str, descripcion: str = "",
               nivel: str = "INFO", meta: dict | None = None, request=None) -> EventoBitacora:
    ip = None
    metodo = ""
    ruta = ""
    if request is not None:
        ip = request.META.get("HTTP_X_FORWARDED_FOR") or request.META.get("REMOTE_ADDR")
        metodo = request.method
        ruta = request.path
    return EventoBitacora.objects.create(
        user=user, empresa=empresa, accion=accion,
        descripcion=descripcion[:400], nivel=nivel, meta=meta or {},
        ip=ip, metodo=metodo, ruta=ruta,
    )
