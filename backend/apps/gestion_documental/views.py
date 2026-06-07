"""Vistas del modulo Gestion Documental."""
from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from django.http import FileResponse, Http404
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from apps.bitacora.utils import log_evento

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
from .serializers import (
    AccesoDocumentoSerializer,
    DocumentoListSerializer,
    DocumentoSerializer,
    FlujoAprobacionSerializer,
    PasoFlujoSerializer,
    PropuestaMejoraSerializer,
    SolicitudAprobacionSerializer,
    TipoDocumentoSerializer,
    VersionDocumentoSerializer,
)

User = get_user_model()


# ── Helpers de permiso ──────────────────────────────────────────────────────
def _empresas_del_usuario(user):
    if user.is_superuser:
        return None
    return list(user.empresas.filter(activo=True).values_list("empresa_id", flat=True))


def _es_staff_empresa(user, empresa_id) -> bool:
    if user.is_superuser:
        return True
    return user.empresas.filter(
        empresa_id=empresa_id, activo=True, rol__in=["OWNER", "STAFF", "MANAGER"],
    ).exists()


def puede_ver_documento(user, doc: Documento) -> bool:
    if user.is_superuser:
        return True
    if doc.creado_por_id == user.id:
        return True
    # Visible a todos cuando esta vigente.
    if doc.estado == Documento.ESTADO_VIGENTE and doc.visible_para_todos:
        if _empresas_del_usuario(user) is None or doc.empresa_id in (_empresas_del_usuario(user) or []):
            return True
    # Acceso explicito
    return AccesoDocumento.objects.filter(documento=doc, usuario=user, puede_ver=True).exists()


def puede_descargar_documento(user, doc: Documento) -> bool:
    if user.is_superuser or doc.creado_por_id == user.id:
        return True
    if doc.estado != Documento.ESTADO_VIGENTE:
        return False
    if doc.visible_para_todos and doc.empresa_id in (_empresas_del_usuario(user) or [doc.empresa_id]):
        return True
    return AccesoDocumento.objects.filter(
        documento=doc, usuario=user, puede_descargar=True,
    ).exists()


def puede_proponer_mejora_documento(user, doc: Documento) -> bool:
    if doc.estado != Documento.ESTADO_VIGENTE:
        return False
    if user.is_superuser or doc.creado_por_id == user.id:
        return True
    if doc.visible_para_todos and doc.empresa_id in (_empresas_del_usuario(user) or [doc.empresa_id]):
        return True
    return AccesoDocumento.objects.filter(
        documento=doc, usuario=user, puede_proponer_mejora=True,
    ).exists()


# ── TipoDocumento ───────────────────────────────────────────────────────────
class TipoDocumentoViewSet(viewsets.ModelViewSet):
    queryset = TipoDocumento.objects.all()
    serializer_class = TipoDocumentoSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["empresa", "categoria", "activo"]
    search_fields = ["codigo", "nombre", "descripcion"]

    def get_queryset(self):
        u = self.request.user
        qs = super().get_queryset()
        empresas = _empresas_del_usuario(u)
        if empresas is not None:
            qs = qs.filter(empresa_id__in=empresas)
        return qs

    @action(detail=False, methods=["post"], url_path="cargar-sugeridos")
    def cargar_sugeridos(self, request):
        """Crea los tipos ISO 9001 estandar para una empresa."""
        empresa_id = request.data.get("empresa")
        if not empresa_id:
            return Response({"detail": "Falta empresa."}, status=400)
        if not _es_staff_empresa(request.user, empresa_id):
            return Response({"detail": "Solo staff puede sembrar tipos."}, status=403)

        SUGERIDOS = [
            ("POLITICA", "PL", "Politica", "Politicas corporativas (Calidad, Seguridad, etc.)", "#A855F7"),
            ("MANUAL", "MN", "Manual", "Manuales de calidad, de operacion, etc.", "#3B82F6"),
            ("PROCEDIMIENTO", "PR", "Procedimiento", "Procedimientos operativos.", "#10B981"),
            ("INSTRUCTIVO", "IT", "Instructivo", "Instructivos de trabajo.", "#F59E0B"),
            ("FORMATO", "FR", "Formato", "Formatos y formularios controlados.", "#0EA5E9"),
            ("REGISTRO", "RG", "Registro", "Registros de calidad.", "#64748B"),
            ("PLAN", "PN", "Plan", "Planes (auditoria, capacitacion, etc.).", "#EC4899"),
        ]
        creados = 0
        for categoria, codigo, nombre, desc, color in SUGERIDOS:
            _, was_created = TipoDocumento.objects.get_or_create(
                empresa_id=empresa_id, codigo=codigo,
                defaults={
                    "categoria": categoria, "nombre": nombre, "descripcion": desc,
                    "color": color, "activo": True,
                },
            )
            if was_created:
                creados += 1
        return Response({"creados": creados, "total_sugeridos": len(SUGERIDOS)})


# ── FlujoAprobacion ─────────────────────────────────────────────────────────
class FlujoAprobacionViewSet(viewsets.ModelViewSet):
    queryset = FlujoAprobacion.objects.prefetch_related("pasos__aprobador")
    serializer_class = FlujoAprobacionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["empresa", "tipo_documento", "modo", "activo"]
    search_fields = ["nombre"]

    def get_queryset(self):
        u = self.request.user
        qs = super().get_queryset()
        empresas = _empresas_del_usuario(u)
        if empresas is not None:
            qs = qs.filter(empresa_id__in=empresas)
        return qs

    @action(detail=True, methods=["post"], url_path="set-pasos")
    def set_pasos(self, request, pk=None):
        """Reemplaza los pasos del flujo con la lista enviada.

        Body: { "pasos": [{ "aprobador": <user_id>, "orden": 1, "obligatorio": true }, ...] }
        """
        flujo = self.get_object()
        if not _es_staff_empresa(request.user, flujo.empresa_id):
            return Response({"detail": "Solo staff puede modificar el flujo."}, status=403)

        pasos_in = request.data.get("pasos") or []
        with transaction.atomic():
            flujo.pasos.all().delete()
            for i, p in enumerate(pasos_in, start=1):
                user_id = p.get("aprobador")
                if not user_id:
                    continue
                PasoFlujo.objects.create(
                    flujo=flujo,
                    orden=p.get("orden") or i,
                    aprobador_id=user_id,
                    obligatorio=bool(p.get("obligatorio", True)),
                    descripcion=(p.get("descripcion") or "")[:200],
                )
        return Response(FlujoAprobacionSerializer(flujo).data)


# ── Documento ───────────────────────────────────────────────────────────────
class DocumentoViewSet(viewsets.ModelViewSet):
    queryset = Documento.objects.select_related("tipo", "departamento", "creado_por",
                                                "aprobado_por", "flujo", "empresa")
    serializer_class = DocumentoSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    filterset_fields = ["empresa", "tipo", "departamento", "estado", "visible_para_todos"]
    search_fields = ["codigo", "titulo", "descripcion", "etiquetas", "palabras_clave"]
    ordering_fields = ["actualizado", "creado", "codigo", "titulo", "fecha_emision"]

    def get_queryset(self):
        u = self.request.user
        qs = super().get_queryset()
        if u.is_superuser:
            return qs.order_by("-actualizado")
        empresas = _empresas_del_usuario(u) or []
        # Visible si:
        #   - vigente y publico para la empresa del usuario
        #   - creado por mi
        #   - acceso explicito
        #   - soy aprobador de un paso pendiente
        qs = qs.filter(
            (
                Q(empresa_id__in=empresas, estado=Documento.ESTADO_VIGENTE, visible_para_todos=True)
                | Q(creado_por=u)
                | Q(accesos__usuario=u, accesos__puede_ver=True)
                | Q(solicitudes__pasos__aprobador=u, solicitudes__estado=SolicitudAprobacion.ESTADO_PENDIENTE)
            )
        ).distinct().order_by("-actualizado")
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return DocumentoListSerializer
        return DocumentoSerializer

    def perform_create(self, serializer):
        archivo = self.request.FILES.get("archivo")
        extra = {}
        if archivo:
            extra = {
                "archivo_nombre_original": archivo.name,
                "archivo_mime": getattr(archivo, "content_type", "") or "",
                "archivo_tamano": archivo.size,
            }
        doc = serializer.save(creado_por=self.request.user, **extra)
        log_evento(
            user=self.request.user, accion="doc.crear",
            descripcion=f"Creo documento {doc.codigo} v{doc.version}: {doc.titulo}",
            meta={"documento_id": doc.id}, request=self.request,
        )

    def perform_update(self, serializer):
        instance = serializer.instance
        # Documento VIGENTE no se edita directamente: hay que enviar nueva version.
        if instance.estado == Documento.ESTADO_VIGENTE:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied(
                "Un documento VIGENTE no se edita directamente. Sube una nueva version o "
                "registra una propuesta de mejora."
            )
        archivo = self.request.FILES.get("archivo")
        extra = {}
        if archivo:
            extra = {
                "archivo_nombre_original": archivo.name,
                "archivo_mime": getattr(archivo, "content_type", "") or "",
                "archivo_tamano": archivo.size,
            }
        doc = serializer.save(**extra)
        log_evento(
            user=self.request.user, accion="doc.editar",
            descripcion=f"Actualizo documento {doc.codigo} v{doc.version}",
            meta={"documento_id": doc.id}, request=self.request,
        )

    def perform_destroy(self, instance):
        from rest_framework.exceptions import PermissionDenied
        u = self.request.user
        # Solo el creador (o un superusuario) puede eliminar su documento.
        if instance.creado_por_id != u.id and not u.is_superuser:
            raise PermissionDenied("Solo el creador puede eliminar este documento.")
        # Únicamente se permite eliminar borradores o documentos rechazados; los
        # que ya entraron al flujo o están vigentes se conservan por trazabilidad.
        if instance.estado not in (Documento.ESTADO_BORRADOR, Documento.ESTADO_RECHAZADO):
            raise PermissionDenied(
                "Solo puedes eliminar documentos en BORRADOR. "
                "Un documento vigente se marca como OBSOLETO para conservar el historial."
            )
        log_evento(
            user=self.request.user, accion="doc.eliminar", nivel="WARN",
            descripcion=f"Elimino documento {instance.codigo} v{instance.version}",
            meta={"documento_id": instance.id}, request=self.request,
        )
        instance.delete()

    # ── Acciones de aprobacion ──────────────────────────────────────────────
    @action(detail=True, methods=["post"], url_path="enviar-aprobacion")
    def enviar_aprobacion(self, request, pk=None):
        """Crea una SolicitudAprobacion segun el flujo asociado.

        Body: { "flujo_id": <id opcional>, "comentario": "..." }
        Si no se pasa flujo_id, usa el flujo del documento o el default del tipo.
        """
        doc = self.get_object()
        u = request.user
        if doc.creado_por_id != u.id and not u.is_superuser:
            return Response({"detail": "Solo el creador puede enviar a aprobacion."}, status=403)
        if doc.estado in (Documento.ESTADO_EN_REVISION, Documento.ESTADO_VIGENTE):
            return Response({"detail": f"El documento esta en estado {doc.estado}."}, status=400)
        if not doc.archivo:
            return Response({"detail": "Sube el archivo antes de enviar a aprobacion."}, status=400)

        flujo_id = request.data.get("flujo_id") or (doc.flujo_id if doc.flujo_id else None)
        flujo = None
        if flujo_id:
            flujo = FlujoAprobacion.objects.filter(
                pk=flujo_id, empresa_id=doc.empresa_id, activo=True,
            ).first()
        if not flujo:
            flujo = FlujoAprobacion.objects.filter(
                empresa_id=doc.empresa_id, tipo_documento_id=doc.tipo_id,
                activo=True, es_default=True,
            ).first()
        if not flujo:
            return Response(
                {"detail": "No hay flujo de aprobacion configurado para este tipo de documento."},
                status=400,
            )
        pasos_flujo = list(flujo.pasos.all().order_by("orden"))
        if not pasos_flujo:
            return Response({"detail": "El flujo no tiene aprobadores configurados."}, status=400)

        with transaction.atomic():
            # Cancela solicitudes anteriores que sigan pendientes (estado raro).
            doc.solicitudes.filter(estado=SolicitudAprobacion.ESTADO_PENDIENTE).update(
                estado=SolicitudAprobacion.ESTADO_CANCELADA, fecha_cierre=timezone.now(),
            )
            sol = SolicitudAprobacion.objects.create(
                documento=doc, flujo=flujo, enviada_por=u,
                comentario_envio=(request.data.get("comentario") or "")[:600],
            )
            for pf in pasos_flujo:
                PasoAprobacion.objects.create(
                    solicitud=sol, orden=pf.orden,
                    aprobador=pf.aprobador, obligatorio=pf.obligatorio,
                )
            doc.estado = Documento.ESTADO_EN_REVISION
            doc.flujo = flujo
            doc.save(update_fields=["estado", "flujo"])

        log_evento(
            user=u, accion="doc.enviar_aprobacion",
            descripcion=f"Envio {doc.codigo} v{doc.version} a aprobacion (flujo: {flujo.nombre})",
            meta={"documento_id": doc.id, "solicitud_id": sol.id}, request=request,
        )
        return Response(DocumentoSerializer(doc, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="aprobar-paso")
    def aprobar_paso(self, request, pk=None):
        """El aprobador del paso pendiente aprueba.

        Body: { "comentario": "..." }
        """
        doc = self.get_object()
        u = request.user
        sol = doc.solicitudes.filter(estado=SolicitudAprobacion.ESTADO_PENDIENTE).order_by("-fecha_envio").first()
        if not sol:
            return Response({"detail": "No hay solicitud pendiente."}, status=400)
        paso = sol.pasos.filter(aprobador=u, estado=PasoAprobacion.ESTADO_PENDIENTE).first()
        if not paso and not u.is_superuser:
            return Response({"detail": "No eres aprobador en este flujo."}, status=403)
        if u.is_superuser and not paso:
            # Superuser puede aprobar cualquier paso pendiente (asume el siguiente).
            paso = sol.pasos.filter(estado=PasoAprobacion.ESTADO_PENDIENTE).order_by("orden").first()
            if not paso:
                return Response({"detail": "No hay paso pendiente."}, status=400)

        # Para flujo SECUENCIAL: solo puede aprobar el paso mas chico pendiente.
        if sol.flujo.modo == FlujoAprobacion.MODO_SECUENCIAL:
            min_pendiente = sol.pasos.filter(estado=PasoAprobacion.ESTADO_PENDIENTE).order_by("orden").first()
            if paso.id != min_pendiente.id:
                return Response(
                    {"detail": f"Es flujo secuencial. Espera al paso {min_pendiente.orden} primero."},
                    status=400,
                )

        comentario = (request.data.get("comentario") or "")[:600]
        with transaction.atomic():
            paso.estado = PasoAprobacion.ESTADO_APROBADO
            paso.comentario = comentario
            paso.decidido_en = timezone.now()
            paso.save(update_fields=["estado", "comentario", "decidido_en"])

            _evaluar_solicitud(sol, request_user=u, request_obj=request)

        log_evento(
            user=u, accion="doc.aprobar_paso",
            descripcion=f"Aprobo paso #{paso.orden} de {doc.codigo} v{doc.version}",
            meta={"documento_id": doc.id, "solicitud_id": sol.id, "paso_id": paso.id},
            request=request,
        )
        return Response(DocumentoSerializer(doc, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="rechazar-paso")
    def rechazar_paso(self, request, pk=None):
        doc = self.get_object()
        u = request.user
        sol = doc.solicitudes.filter(estado=SolicitudAprobacion.ESTADO_PENDIENTE).order_by("-fecha_envio").first()
        if not sol:
            return Response({"detail": "No hay solicitud pendiente."}, status=400)
        paso = sol.pasos.filter(aprobador=u, estado=PasoAprobacion.ESTADO_PENDIENTE).first()
        if not paso and not u.is_superuser:
            return Response({"detail": "No eres aprobador en este flujo."}, status=403)
        if u.is_superuser and not paso:
            paso = sol.pasos.filter(estado=PasoAprobacion.ESTADO_PENDIENTE).order_by("orden").first()
        comentario = (request.data.get("comentario") or "")[:600]

        with transaction.atomic():
            paso.estado = PasoAprobacion.ESTADO_RECHAZADO
            paso.comentario = comentario
            paso.decidido_en = timezone.now()
            paso.save(update_fields=["estado", "comentario", "decidido_en"])
            sol.estado = SolicitudAprobacion.ESTADO_RECHAZADA
            sol.fecha_cierre = timezone.now()
            sol.save(update_fields=["estado", "fecha_cierre"])
            doc.estado = Documento.ESTADO_RECHAZADO
            doc.save(update_fields=["estado"])

        log_evento(
            user=u, accion="doc.rechazar_paso", nivel="WARN",
            descripcion=f"Rechazo {doc.codigo} v{doc.version}: {comentario}",
            meta={"documento_id": doc.id, "solicitud_id": sol.id}, request=request,
        )
        return Response(DocumentoSerializer(doc, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="marcar-obsoleto")
    def marcar_obsoleto(self, request, pk=None):
        doc = self.get_object()
        if doc.creado_por_id != request.user.id and not request.user.is_superuser:
            return Response({"detail": "Sin permiso."}, status=403)
        doc.estado = Documento.ESTADO_OBSOLETO
        doc.fecha_obsolescencia = timezone.now().date()
        doc.save(update_fields=["estado", "fecha_obsolescencia"])
        log_evento(
            user=request.user, accion="doc.obsoleto",
            descripcion=f"Marco como OBSOLETO {doc.codigo} v{doc.version}",
            meta={"documento_id": doc.id}, request=request,
        )
        return Response(DocumentoSerializer(doc, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="nueva-version", parser_classes=[MultiPartParser, FormParser])
    def nueva_version(self, request, pk=None):
        """Sube una version nueva del documento.

        Body multipart: { "version": "2.0", "archivo": <file>, "notas_cambios": "..." }
        El documento VIGENTE pasa al historial y la nueva queda en BORRADOR.
        """
        doc = self.get_object()
        if doc.creado_por_id != request.user.id and not request.user.is_superuser:
            return Response({"detail": "Sin permiso para versionar."}, status=403)
        archivo = request.FILES.get("archivo")
        nueva_version = (request.data.get("version") or "").strip()
        notas = (request.data.get("notas_cambios") or "")[:2000]
        if not archivo or not nueva_version:
            return Response({"detail": "Faltan archivo o version."}, status=400)

        with transaction.atomic():
            # Snapshot de la version actual.
            if doc.archivo:
                VersionDocumento.objects.create(
                    documento=doc, version=doc.version,
                    archivo=doc.archivo,
                    archivo_nombre_original=doc.archivo_nombre_original,
                    archivo_mime=doc.archivo_mime,
                    archivo_tamano=doc.archivo_tamano,
                    fecha_emision=doc.fecha_emision,
                    fecha_aprobacion=doc.fecha_aprobacion,
                    aprobado_por=doc.aprobado_por,
                    notas_cambios="",
                )
            # Actualiza el doc principal a la version nueva (queda en BORRADOR).
            doc.archivo = archivo
            doc.archivo_nombre_original = archivo.name
            doc.archivo_mime = getattr(archivo, "content_type", "") or ""
            doc.archivo_tamano = archivo.size
            doc.version = nueva_version
            doc.estado = Documento.ESTADO_BORRADOR
            doc.fecha_emision = None
            doc.fecha_aprobacion = None
            doc.aprobado_por = None
            doc.save()
            # Notas se guardan en la version recien archivada (versiones[0]).
            ultima_ver = doc.versiones.order_by("-creado").first()
            if ultima_ver and notas:
                ultima_ver.notas_cambios = notas
                ultima_ver.save(update_fields=["notas_cambios"])

        log_evento(
            user=request.user, accion="doc.nueva_version",
            descripcion=f"Subio nueva version v{nueva_version} de {doc.codigo}",
            meta={"documento_id": doc.id, "version": nueva_version}, request=request,
        )
        return Response(DocumentoSerializer(doc, context={"request": request}).data)

    @action(detail=True, methods=["get"], url_path="descargar")
    def descargar(self, request, pk=None):
        doc = self.get_object()
        if not puede_descargar_documento(request.user, doc):
            return Response({"detail": "Sin permiso para descargar este documento."}, status=403)
        if not doc.archivo:
            raise Http404
        log_evento(
            user=request.user, accion="doc.descargar",
            descripcion=f"Descargo {doc.codigo} v{doc.version}",
            meta={"documento_id": doc.id}, request=request,
        )
        # FileResponse stream-ea sin cargar todo en RAM.
        response = FileResponse(
            doc.archivo.open("rb"),
            as_attachment=True,
            filename=doc.archivo_nombre_original or doc.archivo.name.split("/")[-1],
        )
        return response

    @action(detail=True, methods=["get"], url_path="word")
    def word(self, request, pk=None):
        """Descarga el documento como Word (.docx) profesional, con encabezado de
        control documental, historial de versiones, firmas y el contenido
        convertido en tablas/secciones nativas."""
        from datetime import date as _date
        import re as _re
        try:
            from apps.sgc.views import _docx_controlado
        except Exception:
            return Response({"detail": "Generación de Word no disponible en el servidor."}, status=400)
        from django.http import HttpResponse

        doc = self.get_object()
        empresa = doc.empresa
        nombre_emp = (getattr(empresa, "nombre_comercial", "") or getattr(empresa, "razon_social", "") or "________________")
        hoy = _date.today()
        fecha_doc = (doc.fecha_emision or hoy).strftime("%d/%m/%Y")
        try:
            tipo_label = doc.tipo.nombre
        except Exception:
            tipo_label = str(doc.tipo)

        # El contenido ya viene con datos sustituidos; reemplazamos marcadores por si acaso.
        cont = (doc.contenido or doc.descripcion or "")
        cont = (cont.replace("{{empresa}}", nombre_emp)
                    .replace("{{razon_social}}", getattr(empresa, "razon_social", "") or nombre_emp)
                    .replace("{{fecha}}", fecha_doc)
                    .replace("{{anio}}", str(hoy.year))
                    .replace("{{codigo}}", doc.codigo or "")
                    .replace("{{rfc}}", getattr(empresa, "rfc", "") or ""))
        m = _re.search(r"Emisi.n inicial[^\n]*\n", cont)
        body = cont[m.end():] if m else cont

        creador = (doc.creado_por.get_full_name() or doc.creado_por.username) if doc.creado_por else " "
        aprobador = (doc.aprobado_por.get_full_name() or doc.aprobado_por.username) if doc.aprobado_por else " "

        # Historial real de versiones, si existe.
        historial = []
        try:
            for v in doc.versiones.all().order_by("creado"):
                aut = (v.aprobado_por.get_full_name() or v.aprobado_por.username) if getattr(v, "aprobado_por", None) else creador
                fch = (v.fecha_aprobacion or v.creado.date() if getattr(v, "creado", None) else hoy)
                historial.append((v.version, fch.strftime("%d/%m/%Y") if hasattr(fch, "strftime") else str(fch),
                                  (v.notas_cambios or "Nueva versión")[:80], aut))
        except Exception:
            historial = []
        if not historial:
            historial = [(doc.version or "1.0", fecha_doc, "Emisión inicial", creador)]

        bio = _docx_controlado(
            empresa=nombre_emp, titulo=doc.titulo or "Documento",
            subtitulo=f"{tipo_label} · v{doc.version} · {doc.get_estado_display()}",
            codigo=doc.codigo or "—", version=doc.version or "1.0", fecha=fecha_doc,
            clasificacion=doc.get_estado_display(), body=body,
            elaboro=creador, reviso=" ", aprobo=aprobador, historial=historial)

        fname = (doc.codigo or "documento").replace(" ", "_") + ".docx"
        log_evento(
            user=request.user, accion="doc.word",
            descripcion=f"Descargo Word de {doc.codigo} v{doc.version}",
            meta={"documento_id": doc.id}, request=request,
        )
        resp = HttpResponse(
            bio.read(),
            content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        resp["Content-Disposition"] = f'attachment; filename="{fname}"'
        return resp

    @action(detail=False, methods=["get"], url_path="pendientes-mias")
    def pendientes_mias(self, request):
        """Documentos donde yo soy aprobador y mi paso esta PENDIENTE."""
        u = request.user
        sols = SolicitudAprobacion.objects.filter(
            estado=SolicitudAprobacion.ESTADO_PENDIENTE,
            pasos__aprobador=u, pasos__estado=PasoAprobacion.ESTADO_PENDIENTE,
        ).select_related("documento", "documento__tipo").distinct()
        docs = [s.documento for s in sols]
        return Response({
            "count": len(docs),
            "results": DocumentoListSerializer(docs, many=True, context={"request": request}).data,
        })

    # ── Accesos individuales ────────────────────────────────────────────────
    @action(detail=True, methods=["get", "post"], url_path="accesos")
    def accesos(self, request, pk=None):
        doc = self.get_object()
        if request.method == "GET":
            qs = AccesoDocumento.objects.filter(documento=doc).select_related("usuario", "otorgado_por")
            return Response(AccesoDocumentoSerializer(qs, many=True).data)

        if not _es_staff_empresa(request.user, doc.empresa_id) and doc.creado_por_id != request.user.id:
            return Response({"detail": "Sin permiso."}, status=403)
        user_id = request.data.get("usuario")
        if not user_id:
            return Response({"detail": "Falta usuario."}, status=400)
        defaults = {
            "puede_ver": bool(request.data.get("puede_ver", True)),
            "puede_descargar": bool(request.data.get("puede_descargar", True)),
            "puede_proponer_mejora": bool(request.data.get("puede_proponer_mejora", True)),
            "otorgado_por": request.user,
        }
        acc, _ = AccesoDocumento.objects.update_or_create(
            documento=doc, usuario_id=user_id, defaults=defaults,
        )
        log_evento(
            user=request.user, accion="doc.acceso.set",
            descripcion=f"Acceso a {doc.codigo} para user {user_id}",
            meta={"documento_id": doc.id, "user_id": user_id}, request=request,
        )
        return Response(AccesoDocumentoSerializer(acc).data, status=201)

    @action(detail=True, methods=["delete"], url_path=r"accesos/(?P<acceso_id>\d+)")
    def revocar_acceso(self, request, pk=None, acceso_id=None):
        doc = self.get_object()
        if not _es_staff_empresa(request.user, doc.empresa_id) and doc.creado_por_id != request.user.id:
            return Response({"detail": "Sin permiso."}, status=403)
        acc = AccesoDocumento.objects.filter(pk=acceso_id, documento=doc).first()
        if not acc:
            return Response({"detail": "Acceso no encontrado."}, status=404)
        log_evento(
            user=request.user, accion="doc.acceso.revocar",
            descripcion=f"Revoco acceso a {doc.codigo} de user {acc.usuario_id}",
            meta={"documento_id": doc.id, "user_id": acc.usuario_id}, request=request,
        )
        acc.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


def _evaluar_solicitud(sol: SolicitudAprobacion, *, request_user, request_obj=None):
    """Tras aprobar un paso, decide si la solicitud completa esta APROBADA.

    - SECUENCIAL: aprobada cuando todos los pasos estan aprobados.
    - PARALELO: aprobada cuando hay >= min_aprobaciones aprobadas y no hay rechazos.
    - UNICO: igual a secuencial con 1 paso.
    """
    flujo = sol.flujo
    pasos = list(sol.pasos.all())
    aprobados = sum(1 for p in pasos if p.estado == PasoAprobacion.ESTADO_APROBADO)
    pendientes = sum(1 for p in pasos if p.estado == PasoAprobacion.ESTADO_PENDIENTE)
    rechazados = sum(1 for p in pasos if p.estado == PasoAprobacion.ESTADO_RECHAZADO)

    aprobar_doc = False
    if flujo.modo == FlujoAprobacion.MODO_PARALELO:
        if aprobados >= flujo.min_aprobaciones and rechazados == 0:
            aprobar_doc = True
    else:  # UNICO o SECUENCIAL
        if pendientes == 0 and rechazados == 0:
            aprobar_doc = True

    if aprobar_doc:
        sol.estado = SolicitudAprobacion.ESTADO_APROBADA
        sol.fecha_cierre = timezone.now()
        sol.save(update_fields=["estado", "fecha_cierre"])
        doc = sol.documento
        doc.estado = Documento.ESTADO_VIGENTE
        doc.fecha_aprobacion = timezone.now().date()
        if not doc.fecha_emision:
            doc.fecha_emision = doc.fecha_aprobacion
        doc.aprobado_por = request_user
        doc.save(update_fields=["estado", "fecha_aprobacion", "fecha_emision", "aprobado_por"])
        log_evento(
            user=request_user, accion="doc.vigente",
            descripcion=f"{doc.codigo} v{doc.version} quedo VIGENTE",
            meta={"documento_id": doc.id, "solicitud_id": sol.id},
            request=request_obj,
        )


# ── Propuestas de mejora ────────────────────────────────────────────────────
class PropuestaMejoraViewSet(viewsets.ModelViewSet):
    queryset = PropuestaMejora.objects.select_related("documento", "autor", "revisado_por")
    serializer_class = PropuestaMejoraSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    filterset_fields = ["documento", "estado", "autor"]
    search_fields = ["titulo", "descripcion"]

    def get_queryset(self):
        u = self.request.user
        qs = super().get_queryset()
        if u.is_superuser:
            return qs.order_by("-fecha")
        empresas = _empresas_del_usuario(u) or []
        # Veo mis propuestas o las del doc que aprobe.
        return qs.filter(
            Q(autor=u)
            | Q(documento__creado_por=u)
            | Q(documento__empresa_id__in=empresas)
        ).distinct().order_by("-fecha")

    def perform_create(self, serializer):
        doc = serializer.validated_data["documento"]
        if not puede_proponer_mejora_documento(self.request.user, doc):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("No tienes permiso para proponer mejoras a este documento.")
        archivo = self.request.FILES.get("archivo_propuesto")
        extra = {}
        if archivo:
            extra["archivo_nombre_original"] = archivo.name
        prop = serializer.save(autor=self.request.user, **extra)
        log_evento(
            user=self.request.user, accion="doc.mejora.proponer",
            descripcion=f"Propuso mejora '{prop.titulo}' a {doc.codigo}",
            meta={"documento_id": doc.id, "propuesta_id": prop.id}, request=self.request,
        )

    @action(detail=True, methods=["post"], url_path="aceptar")
    def aceptar(self, request, pk=None):
        prop = self.get_object()
        u = request.user
        doc = prop.documento
        # Solo creador del doc o staff de empresa pueden aceptar.
        if doc.creado_por_id != u.id and not _es_staff_empresa(u, doc.empresa_id):
            return Response({"detail": "Sin permiso."}, status=403)
        if prop.estado != PropuestaMejora.ESTADO_PENDIENTE:
            return Response({"detail": "La propuesta ya fue revisada."}, status=400)
        prop.estado = PropuestaMejora.ESTADO_ACEPTADA
        prop.revisado_por = u
        prop.comentario_revision = (request.data.get("comentario") or "")[:600]
        prop.fecha_revision = timezone.now()
        prop.save(update_fields=["estado", "revisado_por", "comentario_revision", "fecha_revision"])
        log_evento(
            user=u, accion="doc.mejora.aceptar",
            descripcion=f"Acepto propuesta '{prop.titulo}' de {doc.codigo}",
            meta={"documento_id": doc.id, "propuesta_id": prop.id}, request=request,
        )
        return Response(PropuestaMejoraSerializer(prop).data)

    @action(detail=True, methods=["post"], url_path="rechazar")
    def rechazar(self, request, pk=None):
        prop = self.get_object()
        u = request.user
        doc = prop.documento
        if doc.creado_por_id != u.id and not _es_staff_empresa(u, doc.empresa_id):
            return Response({"detail": "Sin permiso."}, status=403)
        if prop.estado != PropuestaMejora.ESTADO_PENDIENTE:
            return Response({"detail": "La propuesta ya fue revisada."}, status=400)
        prop.estado = PropuestaMejora.ESTADO_RECHAZADA
        prop.revisado_por = u
        prop.comentario_revision = (request.data.get("comentario") or "")[:600]
        prop.fecha_revision = timezone.now()
        prop.save(update_fields=["estado", "revisado_por", "comentario_revision", "fecha_revision"])
        log_evento(
            user=u, accion="doc.mejora.rechazar", nivel="WARN",
            descripcion=f"Rechazo propuesta '{prop.titulo}' de {doc.codigo}: {prop.comentario_revision}",
            meta={"documento_id": doc.id, "propuesta_id": prop.id}, request=request,
        )
        return Response(PropuestaMejoraSerializer(prop).data)

    @action(detail=True, methods=["post"], url_path="retirar")
    def retirar(self, request, pk=None):
        prop = self.get_object()
        if prop.autor_id != request.user.id and not request.user.is_superuser:
            return Response({"detail": "Sin permiso."}, status=403)
        if prop.estado != PropuestaMejora.ESTADO_PENDIENTE:
            return Response({"detail": "Solo se puede retirar mientras esta PENDIENTE."}, status=400)
        prop.estado = PropuestaMejora.ESTADO_RETIRADA
        prop.save(update_fields=["estado"])
        return Response(PropuestaMejoraSerializer(prop).data)


# ── Acceso a Documentos directo (admin) ─────────────────────────────────────
class AccesoDocumentoViewSet(viewsets.ModelViewSet):
    queryset = AccesoDocumento.objects.select_related("documento", "usuario", "otorgado_por")
    serializer_class = AccesoDocumentoSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["documento", "usuario"]

    def get_queryset(self):
        u = self.request.user
        qs = super().get_queryset()
        if u.is_superuser:
            return qs
        empresas = _empresas_del_usuario(u) or []
        return qs.filter(documento__empresa_id__in=empresas)

    def perform_create(self, serializer):
        serializer.save(otorgado_por=self.request.user)


# ── Solicitudes (read-only, para timeline en UI) ────────────────────────────
class SolicitudAprobacionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SolicitudAprobacion.objects.select_related(
        "documento", "flujo", "enviada_por",
    ).prefetch_related("pasos__aprobador")
    serializer_class = SolicitudAprobacionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["documento", "estado"]
