"""Vistas REST del chat.

Endpoints principales:
- GET    /api/chat/conversaciones/                       lista del usuario
- POST   /api/chat/conversaciones/direct/                crea (o reusa) 1-a-1
- POST   /api/chat/conversaciones/grupo/                 crea grupo
- GET    /api/chat/conversaciones/{id}/mensajes/         historial paginado
- POST   /api/chat/conversaciones/{id}/mensajes/         envía texto + adjuntos (multipart)
- POST   /api/chat/conversaciones/{id}/leer/             marca como leído hasta ahora
- GET    /api/chat/no-leidos/                            total de mensajes sin leer
- GET    /api/chat/usuarios/?q=…                         busca usuarios para iniciar chat
"""
from __future__ import annotations

import mimetypes
from io import BytesIO

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Attachment, Conversation, Membership, Message
from .serializers import (
    ConversationSerializer, CrearDirectSerializer, CrearGrupoSerializer,
    MessageSerializer, UserMiniSerializer,
)

User = get_user_model()
MAX_FILE_BYTES = 20 * 1024 * 1024  # 20 MB por adjunto


def _es_imagen(mime: str) -> bool:
    return bool(mime) and mime.startswith("image/")


def _dimensiones(fh) -> tuple[int | None, int | None]:
    try:
        from PIL import Image  # Pillow
        fh.seek(0)
        data = fh.read()
        fh.seek(0)
        img = Image.open(BytesIO(data))
        return img.width, img.height
    except Exception:
        return None, None


def _broadcast(conversation: Conversation, payload: dict) -> None:
    """Publica un evento WS a todos los miembros activos."""
    layer = get_channel_layer()
    if not layer:
        return
    for m in conversation.memberships.filter(salido_en__isnull=True).values_list("user_id", flat=True):
        async_to_sync(layer.group_send)(
            f"chat_user_{m}",
            {"type": "chat.event", "payload": payload},
        )


class MensajesPagination(PageNumberPagination):
    page_size = 30
    page_size_query_param = "page_size"
    max_page_size = 100


class ConversationViewSet(viewsets.GenericViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        return (Conversation.objects
                .filter(memberships__user=self.request.user,
                        memberships__salido_en__isnull=True)
                .distinct()
                .order_by("-ultimo_mensaje_en"))

    def list(self, request):
        qs = self.get_queryset()
        ser = self.get_serializer(qs, many=True)
        return Response({"results": ser.data, "count": qs.count()})

    def retrieve(self, request, pk=None):
        conv = get_object_or_404(self.get_queryset(), pk=pk)
        return Response(self.get_serializer(conv).data)

    @action(detail=False, methods=["post"], url_path="direct")
    def crear_direct(self, request):
        ser = CrearDirectSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        otro_id = ser.validated_data["user_id"]
        if otro_id == request.user.id:
            return Response({"detail": "No puedes abrir un chat contigo mismo."}, status=400)
        otro = get_object_or_404(User, pk=otro_id, is_active=True)

        # Reusar una conversación directa ya existente entre los dos.
        existente = (Conversation.objects
                     .filter(kind=Conversation.DIRECT,
                             memberships__user=request.user)
                     .filter(memberships__user=otro)
                     .distinct()
                     .first())
        if existente:
            return Response(self.get_serializer(existente).data)

        with transaction.atomic():
            conv = Conversation.objects.create(
                kind=Conversation.DIRECT, creado_por=request.user,
            )
            Membership.objects.bulk_create([
                Membership(conversation=conv, user=request.user),
                Membership(conversation=conv, user=otro),
            ])
        return Response(self.get_serializer(conv).data, status=201)

    @action(detail=False, methods=["post"], url_path="grupo")
    def crear_grupo(self, request):
        ser = CrearGrupoSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user_ids = set(ser.validated_data["user_ids"]) - {request.user.id}
        if not user_ids:
            return Response({"detail": "Agrega al menos un participante."}, status=400)
        otros = list(User.objects.filter(pk__in=user_ids, is_active=True))
        if not otros:
            return Response({"detail": "No se encontraron usuarios válidos."}, status=400)
        with transaction.atomic():
            conv = Conversation.objects.create(
                kind=Conversation.GROUP,
                titulo=ser.validated_data["titulo"],
                creado_por=request.user,
            )
            miembros = [Membership(conversation=conv, user=request.user, es_admin=True)]
            miembros += [Membership(conversation=conv, user=u) for u in otros]
            Membership.objects.bulk_create(miembros)
            # Mensaje del sistema "creó el grupo".
            Message.objects.create(
                conversation=conv,
                sender=request.user,
                body=f"creó el grupo «{conv.titulo}»",
                es_sistema=True,
            )
            conv.ultimo_mensaje_en = timezone.now()
            conv.save(update_fields=["ultimo_mensaje_en"])
        return Response(self.get_serializer(conv).data, status=201)

    @action(detail=True, methods=["get", "post"], url_path="mensajes")
    def mensajes(self, request, pk=None):
        conv = get_object_or_404(self.get_queryset(), pk=pk)
        if request.method == "GET":
            qs = conv.mensajes.select_related("sender").prefetch_related("adjuntos").order_by("-creado")
            page = MensajesPagination()
            ms = page.paginate_queryset(qs, request)
            ser = MessageSerializer(ms, many=True)
            return page.get_paginated_response(ser.data)

        body = (request.data.get("body") or "").strip()
        files = request.FILES.getlist("adjuntos") if hasattr(request, "FILES") else []
        if not body and not files:
            return Response({"detail": "Mensaje vacío."}, status=400)

        for f in files:
            if f.size > MAX_FILE_BYTES:
                return Response(
                    {"detail": f"El archivo «{f.name}» supera el límite de 20 MB."},
                    status=400,
                )

        with transaction.atomic():
            msg = Message.objects.create(
                conversation=conv, sender=request.user, body=body,
            )
            for f in files:
                mime = f.content_type or mimetypes.guess_type(f.name)[0] or ""
                es_img = _es_imagen(mime)
                w, h = _dimensiones(f) if es_img else (None, None)
                Attachment.objects.create(
                    message=msg,
                    archivo=f,
                    nombre_original=f.name[:255],
                    mime=mime[:120],
                    tamano=f.size or 0,
                    es_imagen=es_img,
                    ancho=w,
                    alto=h,
                )
            conv.ultimo_mensaje_en = msg.creado
            conv.save(update_fields=["ultimo_mensaje_en", "actualizado"])
            # El propio sender ya leyó su mensaje.
            Membership.objects.filter(conversation=conv, user=request.user) \
                .update(last_read_at=msg.creado)

        data = MessageSerializer(msg).data
        _broadcast(conv, {
            "type": "message.new",
            "conversation_id": conv.id,
            "message": data,
        })
        return Response(data, status=201)

    @action(detail=True, methods=["post"], url_path="leer")
    def marcar_leido(self, request, pk=None):
        conv = get_object_or_404(self.get_queryset(), pk=pk)
        Membership.objects.filter(conversation=conv, user=request.user) \
            .update(last_read_at=timezone.now())
        _broadcast(conv, {
            "type": "conversation.read",
            "conversation_id": conv.id,
            "user_id": request.user.id,
        })
        return Response({"ok": True})

    @action(detail=True, methods=["post"], url_path="agregar")
    def agregar_miembros(self, request, pk=None):
        conv = get_object_or_404(self.get_queryset(), pk=pk)
        if conv.kind != Conversation.GROUP:
            return Response({"detail": "Sólo en grupos."}, status=400)
        ids = request.data.get("user_ids") or []
        nuevos = User.objects.filter(pk__in=ids, is_active=True)
        with transaction.atomic():
            for u in nuevos:
                Membership.objects.get_or_create(
                    conversation=conv, user=u, defaults={"salido_en": None},
                )
            Message.objects.create(
                conversation=conv, sender=request.user, es_sistema=True,
                body=f"agregó a {', '.join(u.username for u in nuevos)}",
            )
            conv.ultimo_mensaje_en = timezone.now()
            conv.save(update_fields=["ultimo_mensaje_en"])
        return Response(self.get_serializer(conv).data)

    @action(detail=True, methods=["post"], url_path="salir")
    def salir(self, request, pk=None):
        conv = get_object_or_404(self.get_queryset(), pk=pk)
        Membership.objects.filter(conversation=conv, user=request.user) \
            .update(salido_en=timezone.now())
        Message.objects.create(
            conversation=conv, sender=request.user, es_sistema=True,
            body="salió de la conversación",
        )
        conv.ultimo_mensaje_en = timezone.now()
        conv.save(update_fields=["ultimo_mensaje_en"])
        return Response({"ok": True})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def no_leidos(request):
    """Total de mensajes sin leer + desglose por conversación."""
    miembros = (Membership.objects
                .filter(user=request.user, salido_en__isnull=True)
                .select_related("conversation"))
    total = 0
    por_conv = {}
    for m in miembros:
        n = m.conversation.mensajes.filter(
            creado__gt=m.last_read_at,
        ).exclude(sender=request.user).count()
        if n:
            por_conv[m.conversation_id] = n
            total += n
    return Response({"total": total, "por_conversacion": por_conv})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def usuarios(request):
    """Busca usuarios para iniciar chat. Excluye al propio usuario y a inactivos."""
    q = (request.GET.get("q") or "").strip()
    qs = User.objects.filter(is_active=True).exclude(pk=request.user.id)
    if q:
        qs = qs.filter(
            Q(username__icontains=q) | Q(first_name__icontains=q)
            | Q(last_name__icontains=q) | Q(email__icontains=q),
        )
    qs = qs.order_by("first_name", "username")[:25]
    return Response({"results": UserMiniSerializer(qs, many=True).data})
