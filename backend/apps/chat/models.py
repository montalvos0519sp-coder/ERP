"""Modelos del chat interno.

Diseño:
- Conversation: caja común. `kind=DIRECT` (1-a-1) o `kind=GROUP` (n participantes).
- Membership: relación M2M con metadata (last_read_at para no leídos, rol admin).
- Message: texto (puede estar vacío si solo es adjunto). Soft-delete con `deleted_at`.
- Attachment: archivo subido por mensaje. Multiple por mensaje (drag de varios).
"""
from __future__ import annotations

import os
import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


def attachment_upload_to(instance: "Attachment", filename: str) -> str:
    """Path: chat/<conv_id>/<uuid>__<original-name>"""
    base, ext = os.path.splitext(filename)
    safe = uuid.uuid4().hex
    return f"chat/{instance.message.conversation_id}/{safe}__{filename}"[:240]


class Conversation(models.Model):
    DIRECT = "DIRECT"
    GROUP = "GROUP"
    KIND_CHOICES = [(DIRECT, "Directa 1-a-1"), (GROUP, "Grupo")]

    kind = models.CharField(max_length=10, choices=KIND_CHOICES, default=DIRECT)
    titulo = models.CharField(max_length=120, blank=True)  # solo grupos
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name="chat_conversaciones_creadas",
    )
    # Cache: timestamp del último mensaje, para ordenar la lista en O(1).
    ultimo_mensaje_en = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ["-ultimo_mensaje_en"]

    def __str__(self) -> str:
        if self.kind == self.GROUP:
            return self.titulo or f"Grupo #{self.pk}"
        return f"Conversación #{self.pk}"


class Membership(models.Model):
    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, related_name="memberships",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chat_membresias",
    )
    es_admin = models.BooleanField(default=False)  # solo grupos
    silenciado = models.BooleanField(default=False)
    unido_en = models.DateTimeField(auto_now_add=True)
    salido_en = models.DateTimeField(null=True, blank=True)
    last_read_at = models.DateTimeField(default=timezone.now)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["conversation", "user"], name="chat_membership_uniq",
            ),
        ]
        indexes = [models.Index(fields=["user", "salido_en"])]

    @property
    def activo(self) -> bool:
        return self.salido_en is None


class Message(models.Model):
    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, related_name="mensajes",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name="chat_mensajes_enviados",
    )
    body = models.TextField(blank=True)
    creado = models.DateTimeField(auto_now_add=True, db_index=True)
    editado_en = models.DateTimeField(null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    # Mensaje "del sistema" (ej. 'X se unió al grupo'). Sender puede ser None.
    es_sistema = models.BooleanField(default=False)

    class Meta:
        ordering = ["creado"]
        indexes = [models.Index(fields=["conversation", "creado"])]


class Attachment(models.Model):
    message = models.ForeignKey(
        Message, on_delete=models.CASCADE, related_name="adjuntos",
    )
    archivo = models.FileField(upload_to=attachment_upload_to)
    nombre_original = models.CharField(max_length=255)
    mime = models.CharField(max_length=120, blank=True)
    tamano = models.PositiveBigIntegerField(default=0)
    es_imagen = models.BooleanField(default=False)
    ancho = models.PositiveIntegerField(null=True, blank=True)
    alto = models.PositiveIntegerField(null=True, blank=True)
    creado = models.DateTimeField(auto_now_add=True)
