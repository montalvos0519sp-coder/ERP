"""Servicios de la capa de colaboración del SGC (Pilar 1).

Helpers reutilizables para registrar bitácora, emitir notificaciones in-app,
resolver miembros de la empresa y parsear @menciones. Centralizar esto evita
duplicar lógica en cada viewset y mantiene la trazabilidad consistente.
"""
from __future__ import annotations

import re

from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone

from .models import ActividadSGC, NotificacionCalidad

User = get_user_model()

# Registro de modelos del SGC accesibles por una clave corta (la usa el frontend
# para comentar / ver bitácora de cualquier registro sin exponer el app_label).
MODELOS_COLABORABLES = {
    "no_conformidad": ("sgc", "noconformidad"),
    "riesgo": ("sgc", "riesgo"),
    "auditoria": ("sgc", "auditoria"),
    "hallazgo": ("sgc", "hallazgo"),
    "objetivo": ("sgc", "objetivocalidad"),
    "kpi": ("sgc", "indicadorkpi"),
    "capacitacion": ("sgc", "capacitacion"),
    "equipo": ("sgc", "equipo"),
    "queja": ("sgc", "queja"),
    "evaluacion_proveedor": ("sgc", "evaluacionproveedor"),
    "competencia": ("sgc", "evaluacioncompetencia"),
    "requisito_eval": ("sgc", "evaluacionrequisito"),
    "revision_direccion": ("sgc", "revisiondireccion"),
    "parte_interesada": ("sgc", "parteinteresada"),
    "proceso": ("sgc", "proceso"),
    "tarea_implementacion": ("sgc", "tareaimplementacion"),
}

# Ruta del frontend por clave de modelo (para deep-links de notificaciones).
RUTA_FRONTEND = {
    "no_conformidad": "/sgc/no-conformidades",
    "riesgo": "/sgc/riesgos",
    "auditoria": "/sgc/auditorias",
    "objetivo": "/sgc/politica",
    "kpi": "/sgc/kpis",
    "capacitacion": "/sgc/capacitacion",
    "equipo": "/sgc/equipos",
    "queja": "/sgc/quejas",
    "competencia": "/sgc/competencias",
    "requisito_eval": "/sgc/diagnostico",
    "revision_direccion": "/sgc/revision-direccion",
    "proceso": "/sgc/procesos",
    "tarea_implementacion": "/sgc/implementacion",
}

_MENCION_RE = re.compile(r"@([A-Za-z0-9_.\-]{2,40})")


def ct_para(clave: str) -> ContentType | None:
    par = MODELOS_COLABORABLES.get(clave)
    if not par:
        return None
    return ContentType.objects.get_by_natural_key(*par)


def clave_de(obj) -> str | None:
    """Clave corta a partir de una instancia de modelo."""
    nombre = obj._meta.model_name
    for clave, (app, model) in MODELOS_COLABORABLES.items():
        if model == nombre:
            return clave
    return None


def miembros_empresa(empresa):
    """Usuarios activos de la empresa (incluye superusuarios)."""
    ids = empresa.miembros.filter(activo=True).values_list("user_id", flat=True)
    qs = User.objects.filter(id__in=ids, is_active=True)
    if not qs.exists():
        # Fallback: si la empresa no tiene membresías cargadas, usa superusuarios.
        qs = User.objects.filter(is_superuser=True, is_active=True)
    return qs.order_by("first_name", "username")


def nombre_usuario(user) -> str:
    if not user:
        return ""
    return (user.get_full_name() or "").strip() or user.username


def url_objeto(obj) -> str:
    clave = clave_de(obj)
    base = RUTA_FRONTEND.get(clave, "/sgc")
    return f"{base}?focus={obj.pk}"


def registrar_actividad(obj, actor, verbo, descripcion="", datos=None, empresa=None):
    """Agrega una entrada inmutable a la bitácora del objeto."""
    emp = empresa or getattr(obj, "empresa", None)
    if emp is None:
        return None
    return ActividadSGC.objects.create(
        empresa=emp,
        content_type=ContentType.objects.get_for_model(obj.__class__),
        object_id=obj.pk,
        actor=actor if getattr(actor, "is_authenticated", False) else None,
        verbo=verbo, descripcion=descripcion[:300], datos=datos or {},
    )


def notificar(destinatarios, empresa, actor, tipo, titulo, mensaje="", obj=None, url=""):
    """Crea notificaciones in-app para una lista de usuarios (evita auto-notificar al actor)."""
    creadas = []
    vistos = set()
    ct = oid = None
    if obj is not None:
        ct = ContentType.objects.get_for_model(obj.__class__)
        oid = obj.pk
        if not url:
            url = url_objeto(obj)
    for u in destinatarios:
        if u is None or u.pk in vistos:
            continue
        if actor is not None and getattr(actor, "pk", None) == u.pk:
            continue  # no te notificas a ti mismo
        vistos.add(u.pk)
        creadas.append(NotificacionCalidad(
            empresa=empresa, destinatario=u,
            actor=actor if getattr(actor, "is_authenticated", False) else None,
            tipo=tipo, titulo=titulo[:200], mensaje=mensaje, url=url,
            content_type=ct, object_id=oid,
        ))
    if creadas:
        NotificacionCalidad.objects.bulk_create(creadas)
    return creadas


def extraer_menciones(texto: str, empresa):
    """Devuelve los usuarios mencionados con @usuario dentro de la empresa."""
    if not texto:
        return []
    handles = {m.lower() for m in _MENCION_RE.findall(texto)}
    if not handles:
        return []
    return list(miembros_empresa(empresa).filter(username__in=handles))


def marcar_leidas(qs):
    return qs.filter(leida=False).update(leida=True, leida_en=timezone.now())
