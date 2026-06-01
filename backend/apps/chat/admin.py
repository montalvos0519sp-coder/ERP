from django.contrib import admin

from .models import Attachment, Conversation, Membership, Message


@admin.register(Conversation)
class ConvAdmin(admin.ModelAdmin):
    list_display = ("id", "kind", "titulo", "creado", "ultimo_mensaje_en")
    list_filter = ("kind",)


@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    list_display = ("id", "conversation", "user", "es_admin", "salido_en")


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("id", "conversation", "sender", "creado", "es_sistema", "deleted_at")
    list_filter = ("es_sistema",)
    raw_id_fields = ("conversation", "sender")


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ("id", "message", "nombre_original", "mime", "tamano", "es_imagen")
