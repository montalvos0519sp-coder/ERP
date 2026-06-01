from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.bitacora.utils import log_evento
from apps.modulos.models import AsignacionModulo, Modulo

from .models import Diagrama, DiagramaAprobacion, DiagramaCompartido
from .serializers import (
    AprobacionEventoSerializer,
    CompartidoSerializer,
    DiagramaListSerializer,
    DiagramaSerializer,
)

User = get_user_model()


class DiagramaViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        u = self.request.user
        qs = Diagrama.objects.select_related(
            "creado_por", "aprobador", "decidido_por", "modulo_vinculado",
        )
        if u.is_superuser:
            return qs.order_by("-actualizado")
        # Modulos a los que el usuario tiene acceso (para ver diagramas vinculados a esos modulos).
        modulos_user = AsignacionModulo.objects.filter(
            user=u, activo=True,
        ).values_list("modulo_id", flat=True)
        # Visibilidad: propio + publico + compartido + diagrama aprobado vinculado a un modulo del usuario.
        # Estoy yo (aprobador) en revision tambien debe verlo.
        qs = qs.filter(
            Q(creado_por=u)
            | Q(publico=True)
            | Q(compartidos__usuario=u)
            | Q(aprobador=u, estado=Diagrama.ESTADO_EN_REVISION)
            | Q(estado=Diagrama.ESTADO_APROBADO, modulo_vinculado_id__in=modulos_user)
        ).distinct()
        return qs.order_by("-actualizado")

    def get_serializer_class(self):
        if self.action == "list":
            return DiagramaListSerializer
        return DiagramaSerializer

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Marca "visto por el aprobador" la primera vez que el aprobador
        # designado abre un diagrama que espera su decision. Sirve para que el
        # creador sepa que su flujo ya fue revisado (aunque aun no decidido).
        if (
            instance.estado == Diagrama.ESTADO_EN_REVISION
            and instance.aprobador_id == request.user.id
            and instance.visto_por_aprobador_en is None
        ):
            instance.visto_por_aprobador_en = timezone.now()
            instance.save(update_fields=["visto_por_aprobador_en"])
            DiagramaAprobacion.objects.create(
                diagrama=instance, accion=DiagramaAprobacion.ACCION_VISTO,
                user=request.user,
            )
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def perform_create(self, serializer):
        diagrama = serializer.save(creado_por=self.request.user)
        log_evento(
            user=self.request.user, accion="diagrama.crear",
            descripcion=f"Creo diagrama '{diagrama.titulo}'",
            meta={"diagrama_id": diagrama.id}, request=self.request,
        )

    def _puede_editar(self, diagrama: Diagrama) -> bool:
        u = self.request.user
        # Los aprobados+vinculados no se editan (solo desvinculando o creando version nueva).
        if diagrama.es_inmutable:
            return False
        if u.is_superuser or diagrama.creado_por_id == u.id:
            return True
        return DiagramaCompartido.objects.filter(
            diagrama=diagrama, usuario=u, permiso=DiagramaCompartido.PERMISO_EDITAR,
        ).exists()

    def _es_propietario(self, diagrama: Diagrama) -> bool:
        u = self.request.user
        return u.is_superuser or diagrama.creado_por_id == u.id

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.es_inmutable:
            return Response(
                {"detail": "Este diagrama esta aprobado y vinculado a un modulo. Desvinculalo primero para editarlo."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not self._puede_editar(instance):
            return Response(
                {"detail": "No tienes permiso para editar este diagrama."},
                status=status.HTTP_403_FORBIDDEN,
            )
        # Si estaba RECHAZADO y se edita, vuelve a BORRADOR.
        if instance.estado == Diagrama.ESTADO_RECHAZADO:
            instance.estado = Diagrama.ESTADO_BORRADOR
            instance.save(update_fields=["estado"])
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.es_inmutable:
            return Response(
                {"detail": "Este diagrama esta aprobado y vinculado a un modulo. Desvinculalo primero para editarlo."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not self._puede_editar(instance):
            return Response(
                {"detail": "No tienes permiso para editar este diagrama."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if instance.estado == Diagrama.ESTADO_RECHAZADO:
            instance.estado = Diagrama.ESTADO_BORRADOR
            instance.save(update_fields=["estado"])
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.es_inmutable:
            return Response(
                {"detail": "No se puede eliminar: el diagrama esta aprobado y vinculado al modulo "
                           f"'{instance.modulo_vinculado.nombre}'. Desvinculalo primero."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not self._es_propietario(instance):
            return Response(
                {"detail": "Solo el propietario puede eliminar el diagrama."},
                status=status.HTTP_403_FORBIDDEN,
            )
        log_evento(
            user=request.user, accion="diagrama.eliminar",
            descripcion=f"Elimino diagrama '{instance.titulo}'",
            meta={"diagrama_id": instance.id}, request=request,
        )
        return super().destroy(request, *args, **kwargs)

    # ── Aprobacion ────────────────────────────────────────────────────────────
    @action(detail=True, methods=["post"], url_path="enviar-aprobacion")
    def enviar_aprobacion(self, request, pk=None):
        """Envia el diagrama a revision asignando un aprobador.

        Body: { "aprobador_id": <user_id>, "comentario": "..." }
        El propio creador puede listarse como aprobador (auto-aprobacion).
        """
        diagrama = self.get_object()
        if not self._puede_editar(diagrama):
            return Response({"detail": "Sin permiso para enviar a aprobacion."}, status=403)
        if diagrama.estado == Diagrama.ESTADO_EN_REVISION:
            return Response({"detail": "El diagrama ya esta en revision."}, status=400)
        if diagrama.estado == Diagrama.ESTADO_APROBADO:
            return Response({"detail": "El diagrama ya esta aprobado."}, status=400)

        aprobador_id = request.data.get("aprobador_id") or request.user.id
        aprobador = User.objects.filter(pk=aprobador_id).first()
        if not aprobador:
            return Response({"detail": "Aprobador no encontrado."}, status=404)
        comentario = (request.data.get("comentario") or "")[:600]

        diagrama.estado = Diagrama.ESTADO_EN_REVISION
        diagrama.aprobador = aprobador
        diagrama.enviado_aprobacion_en = timezone.now()
        diagrama.visto_por_aprobador_en = None
        diagrama.decidido_en = None
        diagrama.decidido_por = None
        diagrama.comentario_decision = ""
        diagrama.save(update_fields=[
            "estado", "aprobador", "enviado_aprobacion_en", "visto_por_aprobador_en",
            "decidido_en", "decidido_por", "comentario_decision",
        ])
        DiagramaAprobacion.objects.create(
            diagrama=diagrama, accion=DiagramaAprobacion.ACCION_ENVIO,
            user=request.user, aprobador_destinado=aprobador, comentario=comentario,
        )
        log_evento(
            user=request.user, accion="diagrama.enviar_aprobacion",
            descripcion=f"Envio '{diagrama.titulo}' a aprobacion de {aprobador.username}",
            meta={"diagrama_id": diagrama.id, "aprobador_id": aprobador.id},
            request=request,
        )
        return Response(DiagramaSerializer(diagrama, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="aprobar")
    def aprobar(self, request, pk=None):
        diagrama = self.get_object()
        u = request.user
        es_aprobador = diagrama.aprobador_id == u.id
        es_creador_self_approval = diagrama.creado_por_id == u.id and diagrama.aprobador_id == u.id
        if not (u.is_superuser or es_aprobador or es_creador_self_approval):
            return Response({"detail": "Solo el aprobador designado puede aprobar."}, status=403)
        if diagrama.estado != Diagrama.ESTADO_EN_REVISION:
            return Response({"detail": "El diagrama no esta en revision."}, status=400)

        comentario = (request.data.get("comentario") or "")[:600]
        diagrama.estado = Diagrama.ESTADO_APROBADO
        diagrama.decidido_en = timezone.now()
        diagrama.decidido_por = u
        diagrama.comentario_decision = comentario
        diagrama.save(update_fields=["estado", "decidido_en", "decidido_por", "comentario_decision"])
        DiagramaAprobacion.objects.create(
            diagrama=diagrama, accion=DiagramaAprobacion.ACCION_APROBAR,
            user=u, comentario=comentario,
        )
        log_evento(
            user=u, accion="diagrama.aprobar",
            descripcion=f"Aprobo diagrama '{diagrama.titulo}'",
            meta={"diagrama_id": diagrama.id}, request=request,
        )
        return Response(DiagramaSerializer(diagrama, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="rechazar")
    def rechazar(self, request, pk=None):
        diagrama = self.get_object()
        u = request.user
        if not (u.is_superuser or diagrama.aprobador_id == u.id):
            return Response({"detail": "Solo el aprobador designado puede rechazar."}, status=403)
        if diagrama.estado != Diagrama.ESTADO_EN_REVISION:
            return Response({"detail": "El diagrama no esta en revision."}, status=400)

        comentario = (request.data.get("comentario") or "")[:600]
        diagrama.estado = Diagrama.ESTADO_RECHAZADO
        diagrama.decidido_en = timezone.now()
        diagrama.decidido_por = u
        diagrama.comentario_decision = comentario
        diagrama.save(update_fields=["estado", "decidido_en", "decidido_por", "comentario_decision"])
        DiagramaAprobacion.objects.create(
            diagrama=diagrama, accion=DiagramaAprobacion.ACCION_RECHAZAR,
            user=u, comentario=comentario,
        )
        log_evento(
            user=u, accion="diagrama.rechazar", nivel="WARN",
            descripcion=f"Rechazo diagrama '{diagrama.titulo}': {comentario}",
            meta={"diagrama_id": diagrama.id}, request=request,
        )
        return Response(DiagramaSerializer(diagrama, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="vincular-modulo")
    def vincular_modulo(self, request, pk=None):
        """Vincula el diagrama a un modulo del ERP. Solo aprobados.

        Body: { "modulo_id": <id> | null }
        modulo_id=null -> desvincula.
        """
        diagrama = self.get_object()
        if not (request.user.is_superuser or self._es_propietario(diagrama)):
            return Response({"detail": "Solo el propietario o superuser puede vincular."}, status=403)
        if diagrama.estado != Diagrama.ESTADO_APROBADO:
            return Response({"detail": "Solo diagramas aprobados pueden vincularse a modulos."}, status=400)

        modulo_id = request.data.get("modulo_id")
        if modulo_id in (None, "", 0, "0"):
            modulo_prev = diagrama.modulo_vinculado
            diagrama.modulo_vinculado = None
            diagrama.save(update_fields=["modulo_vinculado"])
            DiagramaAprobacion.objects.create(
                diagrama=diagrama, accion=DiagramaAprobacion.ACCION_DESVINCULAR,
                user=request.user, modulo=modulo_prev,
                comentario=f"Desvinculado de {modulo_prev.nombre if modulo_prev else '-'}",
            )
            log_evento(
                user=request.user, accion="diagrama.desvincular",
                descripcion=f"Desvinculo diagrama '{diagrama.titulo}'",
                meta={"diagrama_id": diagrama.id, "modulo_prev_id": modulo_prev.id if modulo_prev else None},
                request=request,
            )
            return Response(DiagramaSerializer(diagrama, context={"request": request}).data)

        modulo = Modulo.objects.filter(pk=modulo_id).first()
        if not modulo:
            return Response({"detail": "Modulo no encontrado."}, status=404)
        diagrama.modulo_vinculado = modulo
        diagrama.save(update_fields=["modulo_vinculado"])
        DiagramaAprobacion.objects.create(
            diagrama=diagrama, accion=DiagramaAprobacion.ACCION_VINCULAR,
            user=request.user, modulo=modulo,
            comentario=f"Vinculado a {modulo.nombre}",
        )
        log_evento(
            user=request.user, accion="diagrama.vincular",
            descripcion=f"Vinculo diagrama '{diagrama.titulo}' a modulo '{modulo.nombre}'",
            meta={"diagrama_id": diagrama.id, "modulo_id": modulo.id},
            request=request,
        )
        return Response(DiagramaSerializer(diagrama, context={"request": request}).data)

    @action(detail=False, methods=["get"], url_path="por-modulo")
    def por_modulo(self, request):
        """Diagramas APROBADOS y vinculados que pertenecen a un modulo.

        Acepta `?codigo=<codigo_modulo>` (exacto) o `?ruta=<pathname>` (todos los
        modulos cuya `ruta_frontend` sea prefijo de la ruta actual, p.ej.
        /almacen cubre /almacen/productos). Respeta la visibilidad de
        get_queryset(): un usuario solo ve los diagramas de modulos a los que
        tiene acceso.
        """
        codigo = request.query_params.get("codigo")
        ruta = request.query_params.get("ruta")
        qs = self.get_queryset().filter(
            estado=Diagrama.ESTADO_APROBADO, modulo_vinculado__isnull=False,
        )
        if codigo:
            qs = qs.filter(modulo_vinculado__codigo=codigo)
        elif ruta:
            rutas = [
                m.ruta_frontend
                for m in Modulo.objects.exclude(ruta_frontend="").exclude(ruta_frontend="/")
                if ruta == m.ruta_frontend or ruta.startswith(m.ruta_frontend.rstrip("/") + "/")
            ]
            if not rutas:
                return Response({"count": 0, "results": []})
            qs = qs.filter(modulo_vinculado__ruta_frontend__in=rutas)
        else:
            return Response({"count": 0, "results": []})

        qs = qs.distinct().order_by("-actualizado")
        data = DiagramaListSerializer(qs, many=True, context={"request": request}).data
        return Response({"count": len(data), "results": data})

    @action(detail=False, methods=["get"], url_path="pendientes-aprobacion")
    def pendientes_aprobacion(self, request):
        """Diagramas que esperan MI aprobacion."""
        qs = Diagrama.objects.select_related("creado_por").filter(
            aprobador=request.user, estado=Diagrama.ESTADO_EN_REVISION,
        ).order_by("-enviado_aprobacion_en")
        return Response({
            "count": qs.count(),
            "results": DiagramaListSerializer(qs, many=True, context={"request": request}).data,
        })

    # ── Comparticiones ────────────────────────────────────────────────────────
    @action(detail=True, methods=["get", "post"], url_path="compartidos")
    def compartidos(self, request, pk=None):
        diagrama = self.get_object()
        if request.method == "GET":
            comps = diagrama.compartidos.select_related("usuario", "compartido_por")
            return Response(CompartidoSerializer(comps, many=True).data)

        if not self._es_propietario(diagrama):
            return Response(
                {"detail": "Solo el propietario puede compartir el diagrama."},
                status=status.HTTP_403_FORBIDDEN,
            )

        username = (request.data.get("username") or "").strip()
        user_id = request.data.get("user_id")
        permiso = request.data.get("permiso") or DiagramaCompartido.PERMISO_VER
        if permiso not in dict(DiagramaCompartido.PERMISO_CHOICES):
            return Response({"detail": "Permiso invalido."}, status=400)

        usuario = None
        if user_id:
            usuario = User.objects.filter(pk=user_id).first()
        elif username:
            usuario = User.objects.filter(username__iexact=username).first()
        if not usuario:
            return Response({"detail": "Usuario no encontrado."}, status=404)
        if usuario.id == diagrama.creado_por_id:
            return Response({"detail": "El propietario ya tiene acceso."}, status=400)

        comp, created = DiagramaCompartido.objects.update_or_create(
            diagrama=diagrama, usuario=usuario,
            defaults={"permiso": permiso, "compartido_por": request.user},
        )
        return Response(CompartidoSerializer(comp).data,
                        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=True, methods=["patch", "delete"],
            url_path=r"compartidos/(?P<comp_id>\d+)")
    def compartido_detalle(self, request, pk=None, comp_id=None):
        diagrama = self.get_object()
        if not self._es_propietario(diagrama):
            return Response(
                {"detail": "Solo el propietario puede modificar el acceso."},
                status=status.HTTP_403_FORBIDDEN,
            )
        comp = DiagramaCompartido.objects.filter(pk=comp_id, diagrama=diagrama).first()
        if not comp:
            return Response({"detail": "Comparticion no encontrada."}, status=404)

        if request.method == "DELETE":
            comp.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        permiso = request.data.get("permiso")
        if permiso not in dict(DiagramaCompartido.PERMISO_CHOICES):
            return Response({"detail": "Permiso invalido."}, status=400)
        comp.permiso = permiso
        comp.save(update_fields=["permiso"])
        return Response(CompartidoSerializer(comp).data)
