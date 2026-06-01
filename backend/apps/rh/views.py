"""Vistas del modulo RH."""
from __future__ import annotations

from datetime import date, datetime, timedelta
from collections import Counter

from django.db.models import Count, Q
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    ConfigNotificacionRH, Departamento, Empleado, Notificacion, Prestamo,
    Puesto, SolicitudRH, TipoSolicitudRH, Vacacion,
)
from .serializers import (
    ConfigNotificacionRHSerializer, DepartamentoSerializer, EmpleadoSerializer,
    NotificacionSerializer, PrestamoSerializer, PuestoSerializer,
    SolicitudRHSerializer, TipoSolicitudRHSerializer, VacacionSerializer,
)


def _emit_notificacion_solicitud(solicitud: SolicitudRH, *, tipo: str, titulo: str,
                                  mensaje: str, enlace: str, destinatarios=None):
    """Crea registros Notificacion para los destinatarios indicados.

    Si `destinatarios` es None, busca los usuarios habilitados en
    ConfigNotificacionRH para la empresa de la solicitud (activo=True). Si no
    hay nadie configurado, hace fallback a todos los usuarios staff de la
    empresa para no perder la senal.
    """
    if destinatarios is None:
        config_users = ConfigNotificacionRH.objects.filter(
            empresa_id=solicitud.empresa_id, activo=True
        ).values_list("user_id", flat=True)
        destinatarios = list(config_users)
        if not destinatarios:
            from apps.core.models import UsuarioEmpresa
            destinatarios = list(
                UsuarioEmpresa.objects.filter(
                    empresa_id=solicitud.empresa_id, activo=True,
                    rol__in=["OWNER", "STAFF", "MANAGER"],
                ).values_list("user_id", flat=True)
            )

    objs = [
        Notificacion(
            empresa_id=solicitud.empresa_id, user_id=uid, tipo=tipo,
            titulo=titulo, mensaje=mensaje, enlace=enlace, solicitud=solicitud,
        )
        for uid in set(destinatarios)
    ]
    if objs:
        Notificacion.objects.bulk_create(objs)


class _EmpresaScoped(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    empresa_field = "empresa"

    def get_queryset(self):
        u = self.request.user
        qs = super().get_queryset()
        if u.is_superuser:
            return qs
        ids = u.empresas.filter(activo=True).values_list("empresa_id", flat=True)
        return qs.filter(**{f"{self.empresa_field}__in": ids})

    def _empresa_activa_del_user(self):
        """Devuelve el id de la empresa activa del usuario para auto-rellenar
        en formularios que no la envien (catalogos RH, etc.)."""
        u = self.request.user
        perfil = getattr(u, "perfil", None)
        if perfil and perfil.empresa_activa_id:
            return perfil.empresa_activa_id
        ue = u.empresas.filter(activo=True).first()
        return ue.empresa_id if ue else None

    def create(self, request, *args, **kwargs):
        # Si el frontend no manda `empresa`, la rellenamos con la empresa activa
        # del usuario. Asi los formularios de catalogos no necesitan saber el id.
        data = request.data
        if hasattr(data, "_mutable"):
            data._mutable = True
        if not data.get(self.empresa_field):
            empresa_id = self._empresa_activa_del_user()
            if empresa_id:
                data[self.empresa_field] = empresa_id
        return super().create(request, *args, **kwargs)


class DepartamentoViewSet(_EmpresaScoped):
    queryset = Departamento.objects.all()
    serializer_class = DepartamentoSerializer
    filterset_fields = ["empresa", "activo"]


class PuestoViewSet(_EmpresaScoped):
    queryset = Puesto.objects.select_related("departamento")
    serializer_class = PuestoSerializer
    filterset_fields = ["empresa", "departamento", "activo"]


class EmpleadoViewSet(_EmpresaScoped):
    queryset = Empleado.objects.select_related("puesto", "sucursal")
    serializer_class = EmpleadoSerializer
    filterset_fields = ["empresa", "puesto", "activo"]
    search_fields = ["nombre", "numero_empleado", "rfc", "curp"]


class VacacionViewSet(viewsets.ModelViewSet):
    queryset = Vacacion.objects.select_related("empleado")
    serializer_class = VacacionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["empleado", "estado"]


class PrestamoViewSet(viewsets.ModelViewSet):
    queryset = Prestamo.objects.select_related("empleado")
    serializer_class = PrestamoSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["empleado", "estado"]


# ── Tipos configurables de solicitud RH (admin) ──────────────────────────
class TipoSolicitudRHViewSet(viewsets.ModelViewSet):
    """CRUD del catalogo de tipos de solicitud (permisos, vacaciones, prestamos).

    - GET: cualquier usuario autenticado (para llenar el select del form).
    - POST/PATCH/DELETE: solo staff de empresa.
    """

    queryset = TipoSolicitudRH.objects.all()
    serializer_class = TipoSolicitudRHSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["empresa", "categoria", "activo"]
    search_fields = ["nombre", "descripcion"]

    def get_queryset(self):
        u = self.request.user
        qs = super().get_queryset()
        if u.is_superuser:
            return qs
        ids = u.empresas.filter(activo=True).values_list("empresa_id", flat=True)
        return qs.filter(empresa__in=ids)

    def get_permissions(self):
        # Solo el staff puede mutar el catalogo.
        if self.action in ("create", "update", "partial_update", "destroy", "cargar_sugeridos"):
            from apps.core.permissions import EsStaffEmpresa
            return [permissions.IsAuthenticated(), EsStaffEmpresa()]
        return [permissions.IsAuthenticated()]

    @action(detail=False, methods=["post"], url_path="cargar-sugeridos")
    def cargar_sugeridos(self, request):
        """Crea un set basico de tipos comunes para que el admin no parta de cero.

        Body: { "empresa": <id> }. Es idempotente: usa get_or_create asi que
        no duplica los tipos existentes.
        """
        empresa_id = request.data.get("empresa")
        if not empresa_id:
            return Response({"detail": "Falta empresa."}, status=400)

        SUGERIDOS = [
            # PERMISO
            ("PERMISO", "Permiso medico",         "Justificacion por enfermedad / atencion medica.",       True,  3,    True,  "#EF4444"),
            ("PERMISO", "Permiso personal",       "Asuntos personales del empleado.",                       False, 3,    True,  "#6366F1"),
            ("PERMISO", "Permiso por defuncion",  "Por fallecimiento de familiar directo.",                 False, 5,    True,  "#64748B"),
            ("PERMISO", "Permiso por matrimonio", "Dias por contraer matrimonio.",                          False, 5,    True,  "#EC4899"),
            ("PERMISO", "Permiso por paternidad", "Licencia por nacimiento de hijo.",                       False, 5,    True,  "#3B82F6"),
            ("PERMISO", "Permiso por maternidad", "Incapacidad por maternidad.",                            True,  84,   True,  "#F472B6"),
            ("PERMISO", "Permiso sin goce",       "Permiso solicitado sin pago durante la ausencia.",       False, None, False, "#94A3B8"),

            # VACACION
            ("VACACION", "Vacaciones pagadas",     "Periodo vacacional con goce de sueldo.",                False, None, True,  "#14B8A6"),
            ("VACACION", "Vacaciones sin goce",    "Vacaciones adicionales sin pago.",                      False, None, False, "#94A3B8"),
            ("VACACION", "Dias economicos",        "Dias acumulados otorgados por la empresa.",             False, 5,    True,  "#10B981"),

            # PRESTAMO
            ("PRESTAMO", "Prestamo personal",      "Prestamo descontado via nomina.",                       False, None, True,  "#F59E0B"),
            ("PRESTAMO", "Prestamo emergencia",    "Prestamo urgente por situacion extraordinaria.",        False, None, True,  "#EF4444"),
            ("PRESTAMO", "Caja de ahorro",         "Disposicion del fondo de caja de ahorro.",              False, None, True,  "#10B981"),
            ("PRESTAMO", "Anticipo de salario",    "Adelanto de sueldo del periodo en curso.",              False, None, True,  "#0EA5E9"),
        ]

        creados = 0
        for cat, nombre, desc, req_doc, dias_max, goce, color in SUGERIDOS:
            obj, created = TipoSolicitudRH.objects.get_or_create(
                empresa_id=empresa_id, categoria=cat, nombre=nombre,
                defaults={
                    "descripcion": desc,
                    "requiere_documento": req_doc,
                    "dias_maximos": dias_max,
                    "con_goce_sueldo": goce,
                    "color": color,
                    "icono": "FileText",
                    "requiere_aprobacion": True,
                    "activo": True,
                },
            )
            if created:
                creados += 1
        return Response({"creados": creados, "total_sugeridos": len(SUGERIDOS)})


# ── Solicitudes RH (empleados crean; staff aprueba) ──────────────────────
class SolicitudRHViewSet(viewsets.ModelViewSet):
    """Solicitudes de permiso / vacacion / prestamo de los empleados.

    Reglas:
    - Empleados ven solo SUS propias solicitudes.
    - Staff/superuser de la empresa ven todas.
    - Acciones aprobar/rechazar/cancelar solo para staff.
    """

    queryset = SolicitudRH.objects.select_related("empresa", "empleado", "tipo", "solicitado_por", "aprobado_por")
    serializer_class = SolicitudRHSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["empresa", "empleado", "tipo", "estado"]
    search_fields = ["motivo", "empleado__nombre", "empleado__numero_empleado"]
    ordering_fields = ["fecha_solicitud", "fecha_inicio"]

    def _empresas_usuario(self, user):
        if user.is_superuser:
            return None  # sin filtro
        return list(user.empresas.filter(activo=True).values_list("empresa_id", flat=True))

    def _es_staff_empresa(self, user, empresa_id):
        if user.is_superuser:
            return True
        return user.empresas.filter(
            empresa_id=empresa_id, activo=True, rol__in=["OWNER", "STAFF", "MANAGER"]
        ).exists()

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        empresas = self._empresas_usuario(user)
        if empresas is not None:
            qs = qs.filter(empresa_id__in=empresas)
        # Si el usuario NO es staff/admin en ninguna de sus empresas,
        # filtramos a sus propias solicitudes.
        if not user.is_superuser:
            es_staff_alguna = user.empresas.filter(
                activo=True, rol__in=["OWNER", "STAFF", "MANAGER"]
            ).exists()
            if not es_staff_alguna:
                # Empleado regular: solo sus propias solicitudes (link via user_sistema).
                qs = qs.filter(empleado__user_sistema=user)
        return qs

    def perform_create(self, serializer):
        sol = serializer.save(solicitado_por=self.request.user)
        # Notifica al staff/admins habilitados que llego una solicitud nueva.
        enlace = {
            "PERMISO": "/rh/permisos",
            "VACACION": "/rh/vacaciones",
            "PRESTAMO": "/rh/prestamos",
        }.get(sol.tipo.categoria, "/rh")
        _emit_notificacion_solicitud(
            sol,
            tipo="SOL_NUEVA",
            titulo=f"Nueva solicitud: {sol.tipo.nombre}",
            mensaje=f"{sol.empleado.nombre} ({sol.empleado.numero_empleado}) ha solicitado {sol.tipo.nombre}.",
            enlace=enlace,
        )

    @action(detail=True, methods=["post"])
    def aprobar(self, request, pk=None):
        sol = self.get_object()
        if not self._es_staff_empresa(request.user, sol.empresa_id):
            return Response({"detail": "Sin permiso para aprobar."}, status=403)
        sol.estado = "APROB"
        sol.aprobado_por = request.user
        sol.fecha_aprobacion = datetime.now()
        sol.comentarios_aprobacion = request.data.get("comentarios", "")
        sol.save()
        # Notificar al empleado que su solicitud fue aprobada.
        if sol.solicitado_por_id:
            _emit_notificacion_solicitud(
                sol,
                tipo="SOL_APROB",
                titulo=f"Solicitud aprobada: {sol.tipo.nombre}",
                mensaje=sol.comentarios_aprobacion or "Tu solicitud ha sido aprobada.",
                enlace="/mis-solicitudes",
                destinatarios=[sol.solicitado_por_id],
            )
        return Response(SolicitudRHSerializer(sol).data)

    @action(detail=True, methods=["post"])
    def rechazar(self, request, pk=None):
        sol = self.get_object()
        if not self._es_staff_empresa(request.user, sol.empresa_id):
            return Response({"detail": "Sin permiso para rechazar."}, status=403)
        sol.estado = "RECH"
        sol.aprobado_por = request.user
        sol.fecha_aprobacion = datetime.now()
        sol.comentarios_aprobacion = request.data.get("comentarios", "")
        sol.save()
        if sol.solicitado_por_id:
            _emit_notificacion_solicitud(
                sol,
                tipo="SOL_RECH",
                titulo=f"Solicitud rechazada: {sol.tipo.nombre}",
                mensaje=sol.comentarios_aprobacion or "Tu solicitud fue rechazada.",
                enlace="/mis-solicitudes",
                destinatarios=[sol.solicitado_por_id],
            )
        return Response(SolicitudRHSerializer(sol).data)

    @action(detail=True, methods=["post"])
    def cancelar(self, request, pk=None):
        sol = self.get_object()
        # El propio solicitante o el staff pueden cancelar.
        es_propietario = sol.solicitado_por_id == request.user.id
        if not (es_propietario or self._es_staff_empresa(request.user, sol.empresa_id)):
            return Response({"detail": "Sin permiso para cancelar."}, status=403)
        sol.estado = "CANC"
        sol.save()
        # Si la cancela el empleado, avisar a admins.
        if es_propietario:
            _emit_notificacion_solicitud(
                sol,
                tipo="SOL_CANC",
                titulo=f"Solicitud cancelada: {sol.tipo.nombre}",
                mensaje=f"{sol.empleado.nombre} cancelo su solicitud.",
                enlace="/rh/permisos" if sol.tipo.categoria == "PERMISO" else "/rh",
            )
        return Response(SolicitudRHSerializer(sol).data)

    @action(detail=False, methods=["get"], url_path="mias")
    def mis_solicitudes(self, request):
        """Atajo: solo las solicitudes del usuario actual (via Empleado.user_sistema)."""
        qs = self.get_queryset().filter(empleado__user_sistema=request.user)
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(self.get_serializer(page, many=True).data)
        return Response(self.get_serializer(qs, many=True).data)


# ── Notificaciones del usuario actual ───────────────────────────────────
class NotificacionViewSet(viewsets.ModelViewSet):
    """Notificaciones in-app. Cada usuario ve solo las suyas.

    Acciones extra:
      - GET  /api/rh/notificaciones/no-leidas/     → conteo + ultimas no leidas
      - POST /api/rh/notificaciones/{id}/marcar-leida/
      - POST /api/rh/notificaciones/marcar-todas-leidas/
    """

    queryset = Notificacion.objects.all()
    serializer_class = NotificacionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["leida", "tipo", "empresa"]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        return super().get_queryset().filter(user=self.request.user)

    @action(detail=False, methods=["get"], url_path="no-leidas")
    def no_leidas(self, request):
        qs = self.get_queryset().filter(leida=False).order_by("-creado")
        return Response({
            "count": qs.count(),
            "results": NotificacionSerializer(qs[:20], many=True).data,
        })

    @action(detail=True, methods=["post"], url_path="marcar-leida")
    def marcar_leida(self, request, pk=None):
        notif = self.get_object()
        if not notif.leida:
            notif.leida = True
            notif.leida_en = datetime.now()
            notif.save(update_fields=["leida", "leida_en"])
        return Response(NotificacionSerializer(notif).data)

    @action(detail=False, methods=["post"], url_path="marcar-todas-leidas")
    def marcar_todas_leidas(self, request):
        ahora = datetime.now()
        actualizadas = self.get_queryset().filter(leida=False).update(
            leida=True, leida_en=ahora,
        )
        return Response({"actualizadas": actualizadas})


# ── Configuracion: quien recibe notificaciones RH ────────────────────────
class ConfigNotificacionRHViewSet(viewsets.ModelViewSet):
    """Administra qué usuarios reciben notificaciones de solicitudes RH.

    Solo staff puede ver/modificar. La UI lo expone en /admin/catalogos-rh.
    """

    queryset = ConfigNotificacionRH.objects.select_related("user", "empresa")
    serializer_class = ConfigNotificacionRHSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["empresa", "activo", "user"]

    def get_queryset(self):
        u = self.request.user
        qs = super().get_queryset()
        if u.is_superuser:
            return qs
        ids = u.empresas.filter(activo=True).values_list("empresa_id", flat=True)
        return qs.filter(empresa__in=ids)

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [permissions.IsAuthenticated()]
        from apps.core.permissions import EsStaffEmpresa
        return [permissions.IsAuthenticated(), EsStaffEmpresa()]

    def create(self, request, *args, **kwargs):
        """Upsert: si ya existe (empresa,user), actualiza activo en lugar de fallar."""
        empresa_id = request.data.get("empresa")
        user_id = request.data.get("user")
        activo = bool(request.data.get("activo", True))
        if not empresa_id or not user_id:
            return Response({"detail": "Faltan empresa y user."}, status=400)
        obj, _ = ConfigNotificacionRH.objects.update_or_create(
            empresa_id=empresa_id, user_id=user_id,
            defaults={"activo": activo},
        )
        return Response(ConfigNotificacionRHSerializer(obj).data, status=201)

    @action(detail=False, methods=["get"], url_path="usuarios-disponibles")
    def usuarios_disponibles(self, request):
        """Lista todos los usuarios de la empresa con su estado actual
        de notificacion RH (para pintar checkboxes en /admin/catalogos-rh).
        """
        empresa_id = request.query_params.get("empresa")
        if not empresa_id:
            return Response({"detail": "Falta empresa."}, status=400)
        from apps.core.models import UsuarioEmpresa
        from django.contrib.auth import get_user_model
        User = get_user_model()
        miembros = UsuarioEmpresa.objects.filter(
            empresa_id=empresa_id, activo=True,
        ).select_related("user")
        user_ids = [m.user_id for m in miembros]
        config_map = {
            c.user_id: c.activo
            for c in ConfigNotificacionRH.objects.filter(
                empresa_id=empresa_id, user_id__in=user_ids,
            )
        }
        out = []
        for m in miembros:
            u = m.user
            out.append({
                "user_id": u.id,
                "username": u.username,
                "first_name": u.first_name,
                "last_name": u.last_name,
                "email": u.email,
                "is_staff": u.is_staff,
                "rol": m.rol,
                "notif_activo": config_map.get(u.id, False),
            })
        out.sort(key=lambda x: (not x["is_staff"], x["username"]))
        return Response({"results": out})


class RHDashboardView(APIView):
    """Endpoint agregado para el panel principal de RH.

    Devuelve un blob con stats, alertas, cumpleanos del dia, proximas vacaciones
    y prestamos pendientes. Filtra por empresas a las que el usuario pertenece.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        hoy = date.today()

        # Empresas accesibles para el usuario
        if user.is_superuser:
            empresas_ids = None  # sin filtro
        else:
            empresas_ids = list(user.empresas.filter(activo=True).values_list("empresa_id", flat=True))

        emp_qs = Empleado.objects.all()
        dep_qs = Departamento.objects.all()
        if empresas_ids is not None:
            emp_qs = emp_qs.filter(empresa_id__in=empresas_ids)
            dep_qs = dep_qs.filter(empresa_id__in=empresas_ids)

        total_empleados = emp_qs.count()
        empleados_activos = emp_qs.filter(activo=True).count()
        empleados_inactivos = total_empleados - empleados_activos
        empleados_activos_pct = round((empleados_activos / total_empleados) * 100, 1) if total_empleados else 0
        empleados_inactivos_pct = round((empleados_inactivos / total_empleados) * 100, 1) if total_empleados else 0

        # Distribucion por departamento (top 8)
        dept_counts = (
            emp_qs.filter(activo=True)
            .values("puesto__departamento__nombre")
            .annotate(count=Count("id"))
            .order_by("-count")[:8]
        )
        departamento_distribucion = [
            {"nombre": d["puesto__departamento__nombre"] or "Sin departamento", "count": d["count"]}
            for d in dept_counts
        ]

        # Operadores por empresa (basado en puesto que contiene "operador")
        operadores_qs = emp_qs.filter(activo=True, puesto__nombre__icontains="operador")
        ops_por_empresa = (
            operadores_qs.values("empresa_id", "empresa__nombre_comercial")
            .annotate(total=Count("id"))
            .order_by("-total")
        )
        operadores_por_empresa = [
            {
                "empresa_id": o["empresa_id"],
                "empresa": o["empresa__nombre_comercial"] or "Sin empresa",
                "total": o["total"],
            }
            for o in ops_por_empresa
        ]

        # Vacaciones
        vac_qs = Vacacion.objects.select_related("empleado", "empleado__puesto").filter(
            empleado__in=emp_qs
        )
        vacaciones_pendientes = vac_qs.filter(estado="PEND").count()
        vacaciones_aprob = vac_qs.filter(estado="APROB").count()
        vacaciones_activas = vacaciones_pendientes + vacaciones_aprob
        # progreso = % de vacaciones APROB sobre el total no canceladas
        no_canc = vac_qs.exclude(estado="CANC").count()
        vacaciones_progreso = round((vacaciones_aprob / no_canc) * 100, 1) if no_canc else 0

        proximas_vacaciones = []
        for v in vac_qs.filter(estado__in=["PEND", "APROB"], fecha_inicio__gte=hoy).order_by("fecha_inicio")[:6]:
            nombre = v.empleado.nombre
            dias_restantes = (v.fecha_inicio - hoy).days
            estado_mapped = "aprobado" if v.estado == "APROB" else "pendiente"
            proximas_vacaciones.append({
                "empleado": {"nombre_completo": nombre},
                "fecha_inicio": v.fecha_inicio.isoformat(),
                "fecha_fin": v.fecha_fin.isoformat(),
                "dias": v.dias,
                "estado": estado_mapped,
                "dias_restantes": dias_restantes,
            })

        # Prestamos
        prest_qs = Prestamo.objects.select_related("empleado").filter(empleado__in=emp_qs)
        prestamos_activos = prest_qs.filter(estado="ACTIVO").count()
        total_prestamos = prest_qs.count()
        prestamos_progreso = round((prest_qs.filter(estado="ACTIVO").count() / total_prestamos) * 100, 1) if total_prestamos else 0

        prestamos_pendientes = []
        for p in prest_qs.filter(estado="ACTIVO").order_by("-fecha_otorgamiento")[:6]:
            monto_total = float(p.monto)
            saldo = float(p.saldo)
            pagado = monto_total - saldo
            progreso = round((pagado / monto_total) * 100, 1) if monto_total else 0
            prestamos_pendientes.append({
                "empleado": {"nombre_completo": p.empleado.nombre},
                "monto_total": monto_total,
                "plazo_meses": p.cuotas,
                "monto_pagado": pagado,
                "saldo_pendiente": saldo,
                "progreso_pago": progreso,
            })

        # Cumpleanos hoy (necesita fecha_nacimiento; mi modelo no la tiene aun → vacio)
        cumpleanos_hoy: list = []

        # Alertas RH (calculo basico)
        alertas: list = []
        # 1) Empleados sin RFC
        sin_rfc = emp_qs.filter(activo=True).filter(Q(rfc="") | Q(rfc__isnull=True)).count()
        if sin_rfc:
            alertas.append({
                "tipo": "warning",
                "titulo": f"{sin_rfc} empleado(s) sin RFC",
                "descripcion": "Captura el RFC para emitir CFDI de nomina.",
                "fecha": hoy.isoformat(),
                "icono": "AlertTriangle",
            })
        # 2) Empleados sin NSS
        sin_nss = emp_qs.filter(activo=True).filter(Q(nss="") | Q(nss__isnull=True)).count()
        if sin_nss:
            alertas.append({
                "tipo": "info",
                "titulo": f"{sin_nss} empleado(s) sin NSS",
                "descripcion": "Falta numero de seguro social.",
                "fecha": hoy.isoformat(),
                "icono": "Info",
            })
        # 3) Vacaciones pendientes de aprobacion
        if vacaciones_pendientes:
            alertas.append({
                "tipo": "info",
                "titulo": f"{vacaciones_pendientes} solicitud(es) de vacaciones pendientes",
                "descripcion": "Revisa y aprueba en Vacaciones.",
                "fecha": hoy.isoformat(),
                "icono": "Calendar",
            })

        return Response({
            "total_empleados": total_empleados,
            "empleados_activos": empleados_activos,
            "empleados_inactivos": empleados_inactivos,
            "empleados_activos_porcentaje": empleados_activos_pct,
            "empleados_inactivos_porcentaje": empleados_inactivos_pct,
            "total_departamentos": dep_qs.filter(activo=True).count(),
            # legacy fields (compatibilidad)
            "operadores_migmar": 0,
            "operadores_marco": 0,
            "operadores_por_empresa": operadores_por_empresa,
            "vacaciones_activas": vacaciones_activas,
            "vacaciones_pendientes": vacaciones_pendientes,
            "vacaciones_progreso": vacaciones_progreso,
            "prestamos_activos": prestamos_activos,
            "total_prestamos_activos": prestamos_activos,
            "prestamos_progreso": prestamos_progreso,
            "total_eliminados": emp_qs.filter(activo=False).count(),
            "alertas_rh": alertas,
            "cumpleanos_hoy": cumpleanos_hoy,
            "proximas_vacaciones": proximas_vacaciones,
            "prestamos_pendientes": prestamos_pendientes,
            "departamento_distribucion": departamento_distribucion,
            "today": hoy.isoformat(),
            "user_is_superuser": bool(user.is_superuser),
        })
