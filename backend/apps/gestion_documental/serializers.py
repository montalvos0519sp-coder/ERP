"""Serializers de gestion documental."""
from __future__ import annotations

from rest_framework import serializers

from .models import (
    AccesoDocumento,
    Documento,
    FlujoAprobacion,
    PasoAprobacion,
    PasoFlujo,
    PropuestaMejora,
    SolicitudAprobacion,
    TipoDocumento,
    VersionDocumento,
)


class TipoDocumentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoDocumento
        fields = ["id", "empresa", "categoria", "codigo", "nombre", "descripcion",
                  "color", "icono", "activo", "creado"]
        read_only_fields = ["creado"]


class PasoFlujoSerializer(serializers.ModelSerializer):
    aprobador_username = serializers.CharField(source="aprobador.username", read_only=True)
    aprobador_nombre = serializers.SerializerMethodField()

    class Meta:
        model = PasoFlujo
        fields = ["id", "flujo", "orden", "aprobador", "aprobador_username",
                  "aprobador_nombre", "obligatorio", "descripcion"]

    def get_aprobador_nombre(self, p: PasoFlujo) -> str:
        u = p.aprobador
        full = f"{u.first_name} {u.last_name}".strip()
        return full or u.username


class FlujoAprobacionSerializer(serializers.ModelSerializer):
    pasos = PasoFlujoSerializer(many=True, read_only=True)
    tipo_documento_codigo = serializers.CharField(source="tipo_documento.codigo", read_only=True, default="")
    tipo_documento_nombre = serializers.CharField(source="tipo_documento.nombre", read_only=True, default="")
    n_pasos = serializers.SerializerMethodField()

    class Meta:
        model = FlujoAprobacion
        fields = ["id", "empresa", "nombre", "descripcion",
                  "tipo_documento", "tipo_documento_codigo", "tipo_documento_nombre",
                  "modo", "min_aprobaciones", "activo", "es_default",
                  "creado", "pasos", "n_pasos"]
        read_only_fields = ["creado"]

    def get_n_pasos(self, f: FlujoAprobacion) -> int:
        return f.pasos.count()


class VersionDocumentoSerializer(serializers.ModelSerializer):
    aprobado_por_username = serializers.CharField(source="aprobado_por.username", read_only=True, default="")
    archivo_url = serializers.SerializerMethodField()

    class Meta:
        model = VersionDocumento
        fields = ["id", "documento", "version", "archivo", "archivo_url",
                  "archivo_nombre_original", "archivo_mime", "archivo_tamano",
                  "fecha_emision", "fecha_aprobacion",
                  "aprobado_por", "aprobado_por_username",
                  "notas_cambios", "creado"]
        read_only_fields = ["creado", "archivo_url", "archivo_tamano",
                            "archivo_mime", "aprobado_por_username"]

    def get_archivo_url(self, v: VersionDocumento) -> str:
        return v.archivo.url if v.archivo else ""


class PasoAprobacionSerializer(serializers.ModelSerializer):
    aprobador_username = serializers.CharField(source="aprobador.username", read_only=True)
    aprobador_nombre = serializers.SerializerMethodField()

    class Meta:
        model = PasoAprobacion
        fields = ["id", "solicitud", "orden", "aprobador", "aprobador_username",
                  "aprobador_nombre", "obligatorio", "estado", "comentario",
                  "decidido_en"]
        read_only_fields = fields

    def get_aprobador_nombre(self, p: PasoAprobacion) -> str:
        u = p.aprobador
        full = f"{u.first_name} {u.last_name}".strip()
        return full or u.username


class SolicitudAprobacionSerializer(serializers.ModelSerializer):
    pasos = PasoAprobacionSerializer(many=True, read_only=True)
    enviada_por_username = serializers.CharField(source="enviada_por.username", read_only=True, default="")
    flujo_nombre = serializers.CharField(source="flujo.nombre", read_only=True, default="")
    flujo_modo = serializers.CharField(source="flujo.modo", read_only=True, default="")

    class Meta:
        model = SolicitudAprobacion
        fields = ["id", "documento", "flujo", "flujo_nombre", "flujo_modo",
                  "estado", "enviada_por", "enviada_por_username",
                  "comentario_envio", "fecha_envio", "fecha_cierre", "pasos"]
        read_only_fields = fields


class AccesoDocumentoSerializer(serializers.ModelSerializer):
    usuario_username = serializers.CharField(source="usuario.username", read_only=True)
    usuario_nombre = serializers.SerializerMethodField()

    class Meta:
        model = AccesoDocumento
        fields = ["id", "documento", "usuario", "usuario_username", "usuario_nombre",
                  "puede_ver", "puede_descargar", "puede_proponer_mejora",
                  "otorgado_por", "creado"]
        read_only_fields = ["creado", "otorgado_por"]

    def get_usuario_nombre(self, a: AccesoDocumento) -> str:
        u = a.usuario
        full = f"{u.first_name} {u.last_name}".strip()
        return full or u.username


class PropuestaMejoraSerializer(serializers.ModelSerializer):
    autor_username = serializers.CharField(source="autor.username", read_only=True)
    autor_nombre = serializers.SerializerMethodField()
    revisado_por_username = serializers.CharField(source="revisado_por.username", read_only=True, default="")
    archivo_propuesto_url = serializers.SerializerMethodField()
    documento_codigo = serializers.CharField(source="documento.codigo", read_only=True)
    documento_titulo = serializers.CharField(source="documento.titulo", read_only=True)

    class Meta:
        model = PropuestaMejora
        fields = ["id", "documento", "documento_codigo", "documento_titulo",
                  "autor", "autor_username", "autor_nombre",
                  "titulo", "descripcion", "archivo_propuesto", "archivo_propuesto_url",
                  "archivo_nombre_original",
                  "estado", "revisado_por", "revisado_por_username",
                  "comentario_revision", "fecha", "fecha_revision"]
        read_only_fields = ["fecha", "fecha_revision", "estado", "revisado_por",
                            "revisado_por_username", "comentario_revision",
                            "autor_username", "autor_nombre", "archivo_propuesto_url",
                            "documento_codigo", "documento_titulo"]

    def get_autor_nombre(self, p: PropuestaMejora) -> str:
        u = p.autor
        full = f"{u.first_name} {u.last_name}".strip()
        return full or u.username

    def get_archivo_propuesto_url(self, p: PropuestaMejora) -> str:
        return p.archivo_propuesto.url if p.archivo_propuesto else ""


class DocumentoListSerializer(serializers.ModelSerializer):
    """Version liviana para listados."""
    tipo_codigo = serializers.CharField(source="tipo.codigo", read_only=True)
    tipo_nombre = serializers.CharField(source="tipo.nombre", read_only=True)
    tipo_categoria = serializers.CharField(source="tipo.categoria", read_only=True)
    departamento_nombre = serializers.CharField(source="departamento.nombre", read_only=True, default="")
    creado_por_username = serializers.CharField(source="creado_por.username", read_only=True, default="")
    aprobado_por_username = serializers.CharField(source="aprobado_por.username", read_only=True, default="")
    archivo_url = serializers.SerializerMethodField()

    class Meta:
        model = Documento
        fields = ["id", "empresa", "tipo", "tipo_codigo", "tipo_nombre", "tipo_categoria",
                  "departamento", "departamento_nombre",
                  "codigo", "titulo", "descripcion", "contenido", "version", "estado",
                  "archivo_url", "archivo_nombre_original", "archivo_mime", "archivo_tamano",
                  "fecha_emision", "fecha_aprobacion", "fecha_proxima_revision",
                  "fecha_obsolescencia",
                  "etiquetas", "palabras_clave",
                  "creado_por", "creado_por_username",
                  "aprobado_por", "aprobado_por_username",
                  "creado", "actualizado",
                  "flujo", "visible_para_todos"]
        read_only_fields = ["creado", "actualizado", "estado", "aprobado_por",
                            "aprobado_por_username", "creado_por_username",
                            "tipo_codigo", "tipo_nombre", "tipo_categoria",
                            "departamento_nombre", "archivo_url"]

    def get_archivo_url(self, d: Documento) -> str:
        return d.archivo.url if d.archivo else ""


class DocumentoSerializer(DocumentoListSerializer):
    """Detalle con historial y solicitud activa."""
    versiones = VersionDocumentoSerializer(many=True, read_only=True)
    solicitud_activa = serializers.SerializerMethodField()
    puede_descargar = serializers.SerializerMethodField()
    puede_proponer_mejora = serializers.SerializerMethodField()

    class Meta(DocumentoListSerializer.Meta):
        fields = DocumentoListSerializer.Meta.fields + [
            "versiones", "solicitud_activa", "puede_descargar", "puede_proponer_mejora",
        ]
        read_only_fields = DocumentoListSerializer.Meta.read_only_fields + [
            "versiones", "solicitud_activa", "puede_descargar", "puede_proponer_mejora",
        ]

    def _user(self):
        req = self.context.get("request")
        return req.user if req else None

    def get_solicitud_activa(self, d: Documento):
        sol = d.solicitudes.filter(estado=SolicitudAprobacion.ESTADO_PENDIENTE).order_by("-fecha_envio").first()
        if not sol:
            return None
        return SolicitudAprobacionSerializer(sol).data

    def get_puede_descargar(self, d: Documento) -> bool:
        from .views import puede_descargar_documento  # evita circular en build
        u = self._user()
        return puede_descargar_documento(u, d) if u else False

    def get_puede_proponer_mejora(self, d: Documento) -> bool:
        from .views import puede_proponer_mejora_documento
        u = self._user()
        return puede_proponer_mejora_documento(u, d) if u else False
