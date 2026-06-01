"""Vistas del sistema de modulos."""
from __future__ import annotations

from collections import defaultdict

from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import Empresa
from apps.core.permissions import EsStaffEmpresa

from .models import AsignacionModulo, Modulo, ModuloEmpresa, CATEGORIAS_MODULO
from .serializers import (
    AsignacionModuloSerializer,
    ModuloEmpresaSerializer,
    ModuloSerializer,
)


class ModuloViewSet(viewsets.ModelViewSet):
    queryset = Modulo.objects.prefetch_related("acciones").all()
    serializer_class = ModuloSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["categoria", "activo_globalmente", "es_core"]
    search_fields = ["codigo", "nombre", "descripcion"]


class ModuloEmpresaViewSet(viewsets.ModelViewSet):
    queryset = ModuloEmpresa.objects.select_related("empresa", "modulo").all()
    serializer_class = ModuloEmpresaSerializer
    permission_classes = [permissions.IsAuthenticated, EsStaffEmpresa]
    filterset_fields = ["empresa", "modulo", "activo"]

    def perform_create(self, serializer):
        serializer.save(activado_por=self.request.user)

    @action(detail=False, methods=["post"])
    def toggle(self, request):
        """Activa/desactiva un modulo en una empresa de un solo golpe."""
        empresa_id = request.data.get("empresa")
        modulo_id = request.data.get("modulo")
        activo = bool(request.data.get("activo", True))
        if not (empresa_id and modulo_id):
            return Response({"detail": "Faltan parametros."}, status=400)
        me, _ = ModuloEmpresa.objects.update_or_create(
            empresa_id=empresa_id, modulo_id=modulo_id,
            defaults={"activo": activo, "activado_por": request.user},
        )
        return Response(ModuloEmpresaSerializer(me).data)


class AsignacionModuloViewSet(viewsets.ModelViewSet):
    queryset = AsignacionModulo.objects.select_related("user", "empresa", "modulo").all()
    serializer_class = AsignacionModuloSerializer
    permission_classes = [permissions.IsAuthenticated, EsStaffEmpresa]
    filterset_fields = ["user", "empresa", "modulo", "activo"]

    def perform_create(self, serializer):
        serializer.save(asignado_por=self.request.user)

    @action(detail=False, methods=["post"])
    def bulk_set(self, request):
        """Reemplaza las asignaciones del usuario en una empresa por la lista provista.

        Payload:
            { "user": 1, "empresa": 1, "modulos": [3, 5, 9] }
        """
        user_id = request.data.get("user")
        empresa_id = request.data.get("empresa")
        modulos_ids = request.data.get("modulos", []) or []
        if not (user_id and empresa_id):
            return Response({"detail": "Faltan user/empresa."}, status=400)
        # Desactiva los que ya tenia y no estan en la nueva lista.
        AsignacionModulo.objects.filter(
            user_id=user_id, empresa_id=empresa_id
        ).exclude(modulo_id__in=modulos_ids).update(activo=False)
        # Crea/activa los nuevos.
        for mid in modulos_ids:
            AsignacionModulo.objects.update_or_create(
                user_id=user_id, empresa_id=empresa_id, modulo_id=mid,
                defaults={"activo": True, "asignado_por": request.user},
            )
        # Devuelve el set actualizado.
        qs = AsignacionModulo.objects.filter(
            user_id=user_id, empresa_id=empresa_id, activo=True
        )
        return Response(AsignacionModuloSerializer(qs, many=True).data)


class MiMenuView(APIView):
    """Devuelve la estructura de menu para el usuario autenticado.

    Combina:
      - empresa_activa del PerfilUsuario (o la primera de UsuarioEmpresa).
      - los ModuloEmpresa activos para esa empresa.
      - los AsignacionModulo activos del usuario para esa empresa.

    Si el usuario es superuser, ve TODO. Si es staff de la empresa, ve todos los
    modulos activos en la empresa (no necesita asignacion explicita).
    """

    def get(self, request):
        user = request.user
        empresa_id = request.query_params.get("empresa")
        if not empresa_id:
            perfil = getattr(user, "perfil", None)
            if perfil and perfil.empresa_activa_id:
                empresa_id = perfil.empresa_activa_id
            else:
                ue = user.empresas.filter(activo=True).first()
                empresa_id = ue.empresa_id if ue else None

        if not empresa_id:
            return Response({"empresa_id": None, "secciones": []})

        empresa = Empresa.objects.filter(id=empresa_id).first()
        if not empresa:
            return Response({"empresa_id": None, "secciones": []})

        # Modulos activos en la empresa.
        modulos_empresa = (
            ModuloEmpresa.objects.filter(empresa=empresa, activo=True, modulo__activo_globalmente=True)
            .select_related("modulo")
        )
        modulos_validos = {me.modulo_id: me.modulo for me in modulos_empresa}

        # Filtrado por asignacion (solo si el usuario NO es superuser/staff de empresa).
        es_staff_empresa = (
            user.is_superuser
            or user.empresas.filter(empresa=empresa, activo=True, rol__in=["OWNER", "STAFF"]).exists()
        )

        if not es_staff_empresa:
            asignados_ids = set(
                AsignacionModulo.objects.filter(
                    user=user, empresa=empresa, activo=True
                ).values_list("modulo_id", flat=True)
            )
            modulos_finales = [m for mid, m in modulos_validos.items() if mid in asignados_ids]
        else:
            modulos_finales = list(modulos_validos.values())

        # Agrupar por categoria.
        agrupado: dict[str, list] = defaultdict(list)
        for m in modulos_finales:
            agrupado[m.categoria].append(m)
        cat_labels = dict(CATEGORIAS_MODULO)

        secciones = []
        for cat, _label in CATEGORIAS_MODULO:
            mods = sorted(agrupado.get(cat, []), key=lambda m: m.orden)
            if not mods:
                continue
            secciones.append({
                "categoria": cat,
                "label": cat_labels.get(cat, cat),
                "color": mods[0].color,
                "items": [
                    {
                        "id": m.codigo,
                        "codigo": m.codigo,
                        "label": m.nombre,
                        "icono": m.icono,
                        "color": m.color,
                        "href": m.ruta_frontend,
                        "requiere_staff": m.requiere_staff,
                    }
                    for m in mods
                ],
            })

        return Response({
            "empresa": {
                "id": empresa.id,
                "nombre": empresa.nombre_comercial,
                "rfc": empresa.rfc,
                "color_primario": empresa.color_primario,
                "color_secundario": empresa.color_secundario,
            },
            "es_staff_empresa": es_staff_empresa,
            "secciones": secciones,
        })
