"""Bitacora de auditoria del ERP. Registra eventos y accesos."""
from django.conf import settings
from django.db import models

from apps.core.models import Empresa


class EventoBitacora(models.Model):
    NIVEL_INFO = "INFO"
    NIVEL_WARN = "WARN"
    NIVEL_ERROR = "ERROR"
    NIVELES = [
        (NIVEL_INFO, "Informacion"),
        (NIVEL_WARN, "Advertencia"),
        (NIVEL_ERROR, "Error"),
    ]

    fecha = models.DateTimeField(auto_now_add=True, db_index=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True)
    empresa = models.ForeignKey(Empresa, on_delete=models.SET_NULL, blank=True, null=True)
    nivel = models.CharField(max_length=10, choices=NIVELES, default=NIVEL_INFO)
    accion = models.CharField(max_length=80, db_index=True)
    descripcion = models.CharField(max_length=400, blank=True)
    ip = models.GenericIPAddressField(blank=True, null=True)
    metodo = models.CharField(max_length=10, blank=True)
    ruta = models.CharField(max_length=300, blank=True)
    meta = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-fecha"]
        indexes = [
            models.Index(fields=["user", "fecha"]),
            models.Index(fields=["empresa", "fecha"]),
        ]

    def __str__(self) -> str:
        return f"[{self.nivel}] {self.accion} · {self.fecha:%Y-%m-%d %H:%M}"
