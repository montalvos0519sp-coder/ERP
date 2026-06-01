from __future__ import annotations

import secrets
from datetime import date

from django.db.models import Avg, Count, Q
from rest_framework import permissions, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.core.models import Empresa

from .models import (
    AccionCAPA, AcuerdoRevision, ActividadSGC, Auditoria, Capacitacion, ComentarioSGC,
    CompetenciaPerfil, ElementoContexto, Encuesta, Equipo, EvaluacionCompetencia, EvaluacionDetalle, EvaluacionProveedor,
    EvaluacionRequisito, EvidenciaSGC, Hallazgo, IndicadorKPI, MedicionKPI, NoConformidad,
    NotificacionCalidad, Norma, ObjetivoCalidad, ParteInteresada, PerfilPuesto, PoliticaCalidad,
    Proceso, Queja, RequisitoISO, RespuestaEncuesta, RevisionDireccion, Riesgo,
    SubtareaImplementacion, TareaImplementacion, TareaObjetivo,
)
from .serializers import (
    AccionCAPASerializer, AcuerdoRevisionSerializer, ActividadSGCSerializer, AuditoriaSerializer,
    CapacitacionSerializer,
    ComentarioSGCSerializer, ElementoContextoSerializer, EquipoSerializer,
    EvaluacionCompetenciaSerializer, EvaluacionProveedorSerializer, EvaluacionRequisitoSerializer,
    EvidenciaSGCSerializer, HallazgoSerializer, IndicadorKPISerializer, MedicionKPISerializer,
    MiembroSerializer, NoConformidadSerializer, NotificacionCalidadSerializer, NormaSerializer,
    ObjetivoCalidadSerializer, ParteInteresadaSerializer, PerfilPuestoSerializer,
    PoliticaCalidadSerializer, ProcesoSerializer, QuejaSerializer, RequisitoISOSerializer,
    RevisionDireccionSerializer, RiesgoSerializer, SubtareaImplementacionSerializer,
    TareaImplementacionSerializer, TareaObjetivoSerializer,
    EncuestaSerializer, EncuestaPublicaSerializer, RespuestaEncuestaSerializer,
    CompetenciaPerfilSerializer, EvaluacionDetalleSerializer,
)
from .servicios import (
    ct_para, extraer_menciones, marcar_leidas, miembros_empresa, nombre_usuario,
    notificar, registrar_actividad, url_objeto,
)


def _empresas(user):
    if user.is_superuser:
        return Empresa.objects.values_list("id", flat=True)
    return user.empresas.filter(activo=True).values_list("empresa_id", flat=True)


class _Scoped(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    empresa_field = "empresa"

    def get_queryset(self):
        qs = super().get_queryset()
        return qs.filter(**{f"{self.empresa_field}__in": _empresas(self.request.user)})


class _Colaborativo(_Scoped):
    """ModelViewSet con trazabilidad y notificaciones automáticas.

    Registra cada alta/cambio en la bitácora (ActividadSGC) y notifica al usuario
    asignado cuando se le asigna un registro o cambia su estado. La subclase
    declara `asignacion_field` (FK al User responsable).
    """
    asignacion_field = "responsable_user"

    def _label(self, obj) -> str:
        nombre = obj._meta.verbose_name or obj._meta.model_name
        ref = getattr(obj, "folio", "") or getattr(obj, "titulo", "") or getattr(obj, "nombre", "") or f"#{obj.pk}"
        return f"{nombre} {ref}".strip()

    def _asignado(self, obj):
        return getattr(obj, self.asignacion_field, None)

    def perform_create(self, serializer):
        user = self.request.user
        extra = {}
        if any(f.name == "creado_por" for f in serializer.Meta.model._meta.fields):
            extra["creado_por"] = user
        obj = serializer.save(**extra)
        registrar_actividad(obj, user, "CREO", f"creó {self._label(obj)}")
        asignado = self._asignado(obj)
        if asignado:
            notificar([asignado], obj.empresa, user, "ASIGNACION",
                      f"Te asignaron: {self._label(obj)}", obj=obj)

    def perform_update(self, serializer):
        user = self.request.user
        inst = serializer.instance
        antes_asig = getattr(inst, f"{self.asignacion_field}_id", None)
        antes_estado = getattr(inst, "estado", None)
        obj = serializer.save()
        nuevo_asig = self._asignado(obj)
        if nuevo_asig and getattr(nuevo_asig, "pk", None) != antes_asig:
            registrar_actividad(obj, user, "ASIGNO", f"asignó a {nombre_usuario(nuevo_asig)}")
            notificar([nuevo_asig], obj.empresa, user, "ASIGNACION",
                      f"Te asignaron: {self._label(obj)}", obj=obj)
        nuevo_estado = getattr(obj, "estado", None)
        if antes_estado is not None and nuevo_estado != antes_estado:
            registrar_actividad(obj, user, "CAMBIO_ESTADO",
                                f"cambió el estado a {nuevo_estado}",
                                {"estado": [antes_estado, nuevo_estado]})
            if nuevo_asig:
                notificar([nuevo_asig], obj.empresa, user, "CAMBIO_ESTADO",
                          f"{self._label(obj)}: {antes_estado} → {nuevo_estado}", obj=obj)
        else:
            registrar_actividad(obj, user, "ACTUALIZO", f"actualizó {self._label(obj)}")


# Catálogos de norma/requisitos (no scoped por empresa: son globales).
class NormaViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = Norma.objects.all()
    serializer_class = NormaSerializer


class RequisitoISOViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = RequisitoISO.objects.select_related("norma")
    serializer_class = RequisitoISOSerializer
    filterset_fields = ["norma"]


class EvaluacionRequisitoViewSet(_Scoped):
    queryset = EvaluacionRequisito.objects.select_related("requisito")
    serializer_class = EvaluacionRequisitoSerializer
    filterset_fields = ["empresa", "requisito", "requisito__norma", "cumple"]

    @action(detail=False, methods=["post"])
    def generar_capa(self, request):
        """Crea no conformidades automáticamente desde las brechas (NO/PARCIAL)."""
        ids = list(_empresas(request.user))
        emp_id = request.data.get("empresa") or (ids[0] if ids else None)
        if not emp_id or int(emp_id) not in ids:
            return Response({"detail": "Empresa inválida."}, status=400)
        brechas = (EvaluacionRequisito.objects.filter(empresa_id=emp_id, cumple__in=["NO", "PARCIAL"])
                   .select_related("requisito__norma"))
        creadas = 0
        for ev in brechas:
            desc = f"Brecha {ev.requisito.norma.codigo} {ev.requisito.clausula}: {ev.requisito.titulo}"
            if NoConformidad.objects.filter(empresa_id=emp_id, descripcion=desc).exists():
                continue
            NoConformidad.objects.create(
                empresa_id=emp_id,
                tipo="CORRECTIVA" if ev.cumple == "NO" else "MEJORA", origen="AUDITORIA",
                descripcion=desc, accion=ev.observaciones or "Definir e implementar acción para cerrar la brecha.",
                estado="ABIERTA",
            )
            creadas += 1
        return Response({"creadas": creadas, "brechas": brechas.count()})


class NoConformidadViewSet(_Colaborativo):
    queryset = NoConformidad.objects.select_related("responsable_user", "creado_por")
    serializer_class = NoConformidadSerializer
    filterset_fields = ["empresa", "tipo", "estado", "origen", "responsable_user"]
    search_fields = ["folio", "descripcion"]

    @action(detail=True, methods=["post"])
    def cerrar(self, request, pk=None):
        from datetime import date as _d
        nc = self.get_object()
        antes = nc.estado
        nc.estado = "CERRADA"
        nc.fecha_cierre = _d.today()
        nc.eficacia_verificada = bool(request.data.get("eficacia", True))
        nc.save()
        registrar_actividad(nc, request.user, "CERRO",
                            f"cerró la NC (eficacia {'verificada' if nc.eficacia_verificada else 'pendiente'})",
                            {"estado": [antes, "CERRADA"]})
        if nc.creado_por and nc.creado_por_id != request.user.id:
            notificar([nc.creado_por], nc.empresa, request.user, "CAMBIO_ESTADO",
                      f"Se cerró la NC {nc.folio or nc.id}", obj=nc)
        return Response(NoConformidadSerializer(nc).data)

    @action(detail=True, methods=["post"])
    def aprobar(self, request, pk=None):
        """Aprueba el plan de acción (segregación: no debería ser el ejecutor)."""
        from datetime import date as _d
        nc = self.get_object()
        nc.aprobada_por = request.user
        nc.fecha_aprobacion = _d.today()
        if nc.estado == "ABIERTA":
            nc.estado = "EN_PROCESO"
        nc.save()
        registrar_actividad(nc, request.user, "APROBO", "aprobó el plan de acción")
        destinatarios = [nc.responsable_user, nc.creado_por]
        notificar(destinatarios, nc.empresa, request.user, "APROBACION",
                  f"Plan de acción aprobado: {nc.folio or nc.id}", obj=nc)
        return Response(NoConformidadSerializer(nc).data)

    @action(detail=True, methods=["post"])
    def verificar_eficacia(self, request, pk=None):
        nc = self.get_object()
        eficaz = bool(request.data.get("eficaz", True))
        nc.verificada_por = request.user
        nc.eficacia_verificada = eficaz
        nc.save()
        registrar_actividad(nc, request.user, "VERIFICO",
                            f"verificó la eficacia: {'eficaz' if eficaz else 'no eficaz'}")
        notificar([nc.responsable_user, nc.creado_por], nc.empresa, request.user, "CAMBIO_ESTADO",
                  f"Eficacia {'confirmada' if eficaz else 'no lograda'}: {nc.folio or nc.id}", obj=nc)
        return Response(NoConformidadSerializer(nc).data)


class AuditoriaViewSet(_Colaborativo):
    asignacion_field = "auditor_lider_user"
    queryset = Auditoria.objects.prefetch_related("hallazgos").select_related("auditor_lider_user")
    serializer_class = AuditoriaSerializer
    filterset_fields = ["empresa", "tipo", "estado", "auditor_lider_user"]


class HallazgoViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = Hallazgo.objects.select_related("auditoria")
    serializer_class = HallazgoSerializer
    filterset_fields = ["auditoria", "tipo"]

    def get_queryset(self):
        return super().get_queryset().filter(auditoria__empresa__in=_empresas(self.request.user))

    @action(detail=True, methods=["post"])
    def convertir_nc(self, request, pk=None):
        h = self.get_object()
        if h.no_conformidad_id:
            return Response({"detail": "Ya tiene NC.", "no_conformidad": h.no_conformidad_id})
        nc = NoConformidad.objects.create(
            empresa=h.auditoria.empresa, tipo="CORRECTIVA", origen="AUDITORIA",
            descripcion=f"[{h.auditoria.titulo}] {h.descripcion}", estado="ABIERTA",
        )
        h.no_conformidad = nc
        h.save(update_fields=["no_conformidad"])
        return Response({"no_conformidad": nc.id})


class RiesgoViewSet(_Colaborativo):
    queryset = Riesgo.objects.select_related("responsable_user")
    serializer_class = RiesgoSerializer
    filterset_fields = ["empresa", "estado", "es_oportunidad", "responsable_user"]


class IndicadorKPIViewSet(_Scoped):
    queryset = IndicadorKPI.objects.all()
    serializer_class = IndicadorKPISerializer
    filterset_fields = ["empresa", "proceso"]


class CapacitacionViewSet(_Colaborativo):
    queryset = Capacitacion.objects.select_related("responsable_user")
    serializer_class = CapacitacionSerializer
    filterset_fields = ["empresa", "estado", "responsable_user"]


class EquipoViewSet(_Colaborativo):
    queryset = Equipo.objects.select_related("responsable_user")
    serializer_class = EquipoSerializer
    filterset_fields = ["empresa", "activo", "responsable_user"]


class EvaluacionProveedorViewSet(_Scoped):
    queryset = EvaluacionProveedor.objects.select_related("proveedor")
    serializer_class = EvaluacionProveedorSerializer
    filterset_fields = ["empresa", "proveedor"]

    def perform_create(self, serializer):
        ev = serializer.save()
        # Alerta automática: si el proveedor cae a clasificación D (<70),
        # notifica a la dirección/calidad de la empresa.
        if float(ev.puntaje) < 70:
            from django.contrib.auth import get_user_model
            from apps.core.models import UsuarioEmpresa
            uids = UsuarioEmpresa.objects.filter(
                empresa=ev.empresa, activo=True, rol__in=["OWNER", "STAFF", "MANAGER"]
            ).values_list("user_id", flat=True)
            dest = list(get_user_model().objects.filter(id__in=uids))
            notificar(dest, ev.empresa, self.request.user, "VENCIMIENTO",
                      f"Proveedor crítico: {ev.proveedor.razon_social}",
                      mensaje=f"Cayó a clasificación D (puntaje {ev.puntaje}) en {ev.periodo}. Requiere plan de mejora.",
                      url="/sgc/evaluacion-proveedores")


class QuejaViewSet(_Scoped):
    queryset = Queja.objects.all()
    serializer_class = QuejaSerializer
    filterset_fields = ["empresa", "tipo", "estado"]

    @action(detail=True, methods=["post"])
    def escalar(self, request, pk=None):
        q = self.get_object()
        if q.no_conformidad_id:
            return Response({"detail": "Ya escalada.", "no_conformidad": q.no_conformidad_id})
        nc = NoConformidad.objects.create(
            empresa=q.empresa, tipo="CORRECTIVA", origen="QUEJA",
            descripcion=f"[Queja {q.folio or q.id}] {q.descripcion}", estado="ABIERTA",
        )
        q.no_conformidad = nc
        q.estado = "EN_PROCESO"
        q.save(update_fields=["no_conformidad", "estado"])
        return Response({"no_conformidad": nc.id})


class PoliticaCalidadViewSet(_Scoped):
    queryset = PoliticaCalidad.objects.all()
    serializer_class = PoliticaCalidadSerializer
    filterset_fields = ["empresa"]


class ObjetivoCalidadViewSet(_Colaborativo):
    queryset = ObjetivoCalidad.objects.select_related("responsable_user")
    serializer_class = ObjetivoCalidadSerializer
    filterset_fields = ["empresa", "estado", "responsable_user"]


class ElementoContextoViewSet(_Scoped):
    queryset = ElementoContexto.objects.all()
    serializer_class = ElementoContextoSerializer
    filterset_fields = ["empresa", "tipo"]


class ParteInteresadaViewSet(_Scoped):
    queryset = ParteInteresada.objects.all()
    serializer_class = ParteInteresadaSerializer
    filterset_fields = ["empresa", "tipo"]


def _snapshot_sgc(ids):
    """Foto compacta del estado del SGC para la revisión por la dirección (9.3.2)."""
    nc = NoConformidad.objects.filter(empresa_id__in=ids)
    aud = Auditoria.objects.filter(empresa_id__in=ids)
    kpis = list(IndicadorKPI.objects.filter(empresa_id__in=ids))
    riesgos = list(Riesgo.objects.filter(empresa_id__in=ids))
    quejas = Queja.objects.filter(empresa_id__in=ids)
    sat = quejas.exclude(satisfaccion__isnull=True).aggregate(p=Avg("satisfaccion"))["p"]
    evals = EvaluacionRequisito.objects.filter(empresa_id__in=ids).exclude(cumple="NA")
    puntos = {"NO": 0, "PARCIAL": 50, "SI": 100}
    evd = evals.count()
    cumplimiento = round(sum(puntos.get(e.cumple, 0) for e in evals) / evd, 1) if evd else 0
    impl = TareaImplementacion.objects.filter(empresa_id__in=ids)
    objs = ObjetivoCalidad.objects.filter(empresa_id__in=ids)
    return {
        "cumplimiento_iso": cumplimiento,
        "nc_abiertas": nc.filter(estado__in=["ABIERTA", "EN_PROCESO"]).count(),
        "nc_cerradas": nc.filter(estado="CERRADA").count(),
        "nc_total": nc.count(),
        "auditorias_cerradas": aud.filter(estado="CERRADA").count(),
        "auditorias_programadas": aud.filter(estado="PROGRAMADA").count(),
        "kpis_en_meta": sum(1 for k in kpis if k.cumple),
        "kpis_total": len(kpis),
        "riesgos_altos": sum(1 for r in riesgos if r.severidad in ("ALTO", "CRITICO")),
        "riesgos_total": len(riesgos),
        "satisfaccion": round(sat, 1) if sat else None,
        "quejas_abiertas": quejas.filter(estado__in=["ABIERTA", "EN_PROCESO"]).count(),
        "implementacion_pct": round(impl.filter(columna="VERIFICADO").count() / impl.count() * 100, 1) if impl.count() else 0,
        "objetivos_logrados": objs.filter(estado="LOGRADO").count(),
        "objetivos_total": objs.count(),
        "fecha": str(date.today()),
    }


class RevisionDireccionViewSet(_Scoped):
    queryset = RevisionDireccion.objects.prefetch_related("acuerdos_items").select_related("creado_por")
    serializer_class = RevisionDireccionSerializer
    filterset_fields = ["empresa"]

    def perform_create(self, serializer):
        rev = serializer.save(creado_por=self.request.user)
        rev.metricas = _snapshot_sgc([rev.empresa_id])
        rev.save(update_fields=["metricas"])

    @action(detail=False, methods=["get"])
    def snapshot(self, request):
        """Estado actual del SGC en vivo (para mostrar al armar la revisión)."""
        ids = list(_empresas(request.user))
        emp = request.query_params.get("empresa")
        if emp and int(emp) in ids:
            ids = [int(emp)]
        return Response(_snapshot_sgc(ids))

    @action(detail=False, methods=["get"])
    def datos_sugeridos(self, request):
        """Pre-llena las entradas de la revisión con el estado actual del SGC."""
        ids = list(_empresas(request.user))
        emp = request.query_params.get("empresa")
        if emp and int(emp) in ids:
            ids = [int(emp)]
        from django.db.models import Avg
        nc = NoConformidad.objects.filter(empresa_id__in=ids)
        aud = Auditoria.objects.filter(empresa_id__in=ids)
        kpis = list(IndicadorKPI.objects.filter(empresa_id__in=ids))
        riesgos = list(Riesgo.objects.filter(empresa_id__in=ids))
        quejas = Queja.objects.filter(empresa_id__in=ids)
        sat = quejas.exclude(satisfaccion__isnull=True).aggregate(p=Avg("satisfaccion"))["p"]
        texto = (
            f"DESEMPEÑO DEL SGC:\n"
            f"• No conformidades: {nc.count()} (abiertas: {nc.filter(estado__in=['ABIERTA','EN_PROCESO']).count()}).\n"
            f"• Auditorías realizadas: {aud.filter(estado='CERRADA').count()}; programadas: {aud.filter(estado='PROGRAMADA').count()}.\n"
            f"• KPIs en meta: {sum(1 for k in kpis if k.cumple)}/{len(kpis)}.\n"
            f"• Riesgos críticos/altos: {sum(1 for r in riesgos if r.severidad in ('CRITICO','ALTO'))} de {len(riesgos)}.\n"
            f"• Satisfacción del cliente (prom.): {round(sat,1) if sat else 'N/D'}/5.\n"
            f"• Quejas abiertas: {quejas.filter(estado__in=['ABIERTA','EN_PROCESO']).count()}."
        )
        return Response({"entradas": texto})


class PerfilPuestoViewSet(_Scoped):
    queryset = PerfilPuesto.objects.all()
    serializer_class = PerfilPuestoSerializer
    filterset_fields = ["empresa", "area"]


class EvaluacionCompetenciaViewSet(_Scoped):
    queryset = EvaluacionCompetencia.objects.select_related("perfil").prefetch_related("detalles")
    serializer_class = EvaluacionCompetenciaSerializer
    filterset_fields = ["empresa", "estado", "perfil"]

    @action(detail=True, methods=["post"])
    def sembrar_detalles(self, request, pk=None):
        """Copia las competencias del perfil como detalles a evaluar (nivel 0)."""
        ev = self.get_object()
        if not ev.perfil:
            return Response({"detail": "La evaluación no tiene perfil."}, status=400)
        ev.detalles.all().delete()
        for c in ev.perfil.competencias.all():
            EvaluacionDetalle.objects.create(
                evaluacion=ev, competencia=c, nombre=c.nombre, tipo=c.tipo,
                nivel_requerido=c.nivel_requerido, nivel_actual=0,
                obligatoria=c.obligatoria, orden=c.orden,
            )
        ev.recomputar()
        return Response(EvaluacionCompetenciaSerializer(ev).data)

    @action(detail=True, methods=["post"])
    def crear_capacitacion(self, request, pk=None):
        """Genera un plan de capacitación a partir de las brechas detectadas."""
        from datetime import date as _d, timedelta
        ev = self.get_object()
        brechas = [d for d in ev.detalles.all() if d.nivel_actual < d.nivel_requerido]
        if not brechas:
            return Response({"detail": "Sin brechas que cerrar."}, status=400)
        temas = ", ".join(d.nombre for d in brechas)
        cap = Capacitacion.objects.create(
            empresa=ev.empresa,
            curso=f"Plan de desarrollo · {ev.persona}",
            descripcion=f"Cerrar brechas de competencia de {ev.persona}: {temas}.",
            participantes=ev.persona, estado="PROGRAMADA",
            responsable_user=ev.persona_user,
        )
        ev.capacitacion_ref = cap
        ev.plan_desarrollo = f"Capacitación en: {temas}."
        ev.fecha_reevaluacion = _d.today() + timedelta(days=90)
        ev.save(update_fields=["capacitacion_ref", "plan_desarrollo", "fecha_reevaluacion"])
        return Response({"capacitacion": cap.id, "evaluacion": EvaluacionCompetenciaSerializer(ev).data})

    @action(detail=False, methods=["get"])
    def brechas(self, request):
        """Dashboard de brechas: por competencia (cuántas personas no la cubren)
        y por persona (cuántas brechas tiene)."""
        ids = list(_empresas(request.user))
        emp = request.query_params.get("empresa")
        if emp and int(emp) in ids:
            ids = [int(emp)]
        dets = (EvaluacionDetalle.objects
                .filter(evaluacion__empresa_id__in=ids)
                .select_related("evaluacion"))
        por_comp, por_persona = {}, {}
        total_brechas = 0
        for d in dets:
            if d.nivel_actual < d.nivel_requerido:
                total_brechas += 1
                por_comp[d.nombre] = por_comp.get(d.nombre, 0) + 1
                p = d.evaluacion.persona
                por_persona[p] = por_persona.get(p, 0) + 1
        return Response({
            "total_brechas": total_brechas,
            "por_competencia": sorted(
                [{"nombre": k, "personas": v} for k, v in por_comp.items()],
                key=lambda x: -x["personas"])[:15],
            "por_persona": sorted(
                [{"persona": k, "brechas": v} for k, v in por_persona.items()],
                key=lambda x: -x["brechas"])[:15],
        })


class DashboardSGCViewSet(viewsets.ViewSet):
    """Dashboard ejecutivo del SGC: cumplimiento ISO, NC, auditorías, riesgos…"""
    permission_classes = [permissions.IsAuthenticated]

    def _emp(self, request):
        emp = request.query_params.get("empresa")
        ids = list(_empresas(request.user))
        return [int(emp)] if emp and int(emp) in ids else list(ids)

    @action(detail=False, methods=["get"])
    def resumen(self, request):
        ids = self._emp(request)
        hoy = date.today()

        # % cumplimiento ISO (promedio de puntaje de las evaluaciones, ignora NA).
        evals = EvaluacionRequisito.objects.filter(empresa_id__in=ids).exclude(cumple="NA")
        total_req = RequisitoISO.objects.count()
        puntos = {"NO": 0, "PARCIAL": 50, "SI": 100}
        suma = sum(puntos.get(e.cumple, 0) for e in evals)
        evaluados = evals.count()
        cumplimiento = round(suma / evaluados, 1) if evaluados else 0

        nc = NoConformidad.objects.filter(empresa_id__in=ids)
        aud = Auditoria.objects.filter(empresa_id__in=ids)
        riesgos = list(Riesgo.objects.filter(empresa_id__in=ids))
        kpis = list(IndicadorKPI.objects.filter(empresa_id__in=ids))
        equipos = Equipo.objects.filter(empresa_id__in=ids, activo=True)
        caps = Capacitacion.objects.filter(empresa_id__in=ids)
        quejas = Queja.objects.filter(empresa_id__in=ids)

        riesgos_criticos = sum(1 for r in riesgos if r.severidad == "CRITICO")
        riesgos_altos = sum(1 for r in riesgos if r.severidad == "ALTO")
        kpis_cumplen = sum(1 for k in kpis if k.cumple)
        equipos_vencidos = equipos.filter(
            requiere_calibracion=True, fecha_proxima_calibracion__lt=hoy).count()
        caps_pendientes = caps.filter(estado__in=["PROGRAMADA", "VENCIDA"]).count()

        # Avance global: implementación, objetivos y NC resueltas.
        impl = TareaImplementacion.objects.filter(empresa_id__in=ids)
        impl_total = impl.count()
        impl_verif = impl.filter(columna="VERIFICADO").count()
        objs = ObjetivoCalidad.objects.filter(empresa_id__in=ids)
        obj_total = objs.count()
        obj_logrados = objs.filter(estado="LOGRADO").count()
        obj_avance = round(sum(o.avance for o in objs) / obj_total, 1) if obj_total else 0
        nc_total = nc.count()
        nc_cerradas = nc.filter(estado="CERRADA").count()
        kpis_pct = round(kpis_cumplen / len(kpis) * 100, 1) if kpis else 0

        return Response({
            "cumplimiento_iso": cumplimiento,
            "implementacion": {
                "total": impl_total, "verificadas": impl_verif,
                "progreso": round(impl_verif / impl_total * 100, 1) if impl_total else 0,
            },
            "objetivos": {
                "total": obj_total, "logrados": obj_logrados, "avance_promedio": obj_avance,
                "progreso": round(obj_logrados / obj_total * 100, 1) if obj_total else 0,
            },
            "nc_cerradas": nc_cerradas,
            "nc_resueltas_pct": round(nc_cerradas / nc_total * 100, 1) if nc_total else 0,
            "kpis_meta_pct": kpis_pct,
            "requisitos_total": total_req,
            "requisitos_evaluados": evaluados,
            "no_conformidades": {
                "abiertas": nc.filter(estado__in=["ABIERTA", "EN_PROCESO"]).count(),
                "vencidas": nc.filter(estado__in=["ABIERTA", "EN_PROCESO"], fecha_compromiso__lt=hoy).count(),
                "total": nc.count(),
            },
            "auditorias": {
                "programadas": aud.filter(estado="PROGRAMADA").count(),
                "en_curso": aud.filter(estado="EN_CURSO").count(),
            },
            "riesgos": {"criticos": riesgos_criticos, "altos": riesgos_altos, "total": len(riesgos)},
            "kpis": {"cumplen": kpis_cumplen, "total": len(kpis)},
            "equipos_calibracion_vencida": equipos_vencidos,
            "capacitaciones_pendientes": caps_pendientes,
            "quejas_abiertas": quejas.filter(estado__in=["ABIERTA", "EN_PROCESO"]).count(),
        })

    @action(detail=False, methods=["get"])
    def agenda(self, request):
        """Agenda de cumplimiento: todos los vencimientos del SGC para mantenerlo
        vivo (auditorías, calibraciones, capacitaciones, NC, objetivos, revisión
        por la dirección, acuerdos, tareas y acciones CAPA)."""
        ids = self._emp(request)
        hoy = date.today()
        ev = []

        def add(tipo, titulo, fecha, url):
            if not fecha:
                return
            dias = (fecha - hoy).days
            ev.append({
                "tipo": tipo, "titulo": titulo, "fecha": str(fecha), "dias": dias,
                "estado": "vencido" if dias < 0 else "proximo" if dias <= 30 else "futuro",
                "url": url,
            })

        for a in Auditoria.objects.filter(empresa_id__in=ids, estado__in=["PROGRAMADA", "EN_CURSO"]):
            add("Auditoría", a.titulo, a.fecha_programada, "/sgc/auditorias")
        for e in Equipo.objects.filter(empresa_id__in=ids, requiere_calibracion=True, activo=True):
            add("Calibración", f"{e.codigo} · {e.nombre}", e.fecha_proxima_calibracion, "/sgc/equipos")
        for c in Capacitacion.objects.filter(empresa_id__in=ids).exclude(fecha_vencimiento=None):
            add("Capacitación", c.curso, c.fecha_vencimiento, "/sgc/capacitacion")
        for n in NoConformidad.objects.filter(empresa_id__in=ids, estado__in=["ABIERTA", "EN_PROCESO"]).exclude(fecha_compromiso=None):
            add("No conformidad", f"{n.folio or 'NC'} · {n.descripcion[:50]}", n.fecha_compromiso, "/sgc/no-conformidades")
        for o in ObjetivoCalidad.objects.filter(empresa_id__in=ids, estado="EN_CURSO").exclude(fecha_limite=None):
            add("Objetivo", o.objetivo[:50], o.fecha_limite, "/sgc/politica")
        for r in RevisionDireccion.objects.filter(empresa_id__in=ids).exclude(proxima_fecha=None):
            add("Revisión dirección", f"Revisión {r.periodo or ''}".strip(), r.proxima_fecha, "/sgc/revision-direccion")
        for ac in AcuerdoRevision.objects.filter(revision__empresa_id__in=ids).exclude(estado="CERRADO").exclude(fecha_compromiso=None):
            add("Acuerdo dirección", ac.descripcion[:50], ac.fecha_compromiso, "/sgc/revision-direccion")
        for t in TareaImplementacion.objects.filter(empresa_id__in=ids).exclude(columna="VERIFICADO").exclude(fecha_limite=None):
            add("Implementación", t.titulo[:50], t.fecha_limite, "/sgc/implementacion")
        for acc in AccionCAPA.objects.filter(no_conformidad__empresa_id__in=ids).exclude(estado="VERIFICADA").exclude(fecha_compromiso=None):
            add("Acción CAPA", acc.descripcion[:50], acc.fecha_compromiso, "/sgc/no-conformidades")

        ev.sort(key=lambda x: x["fecha"])
        resumen = {
            "vencidos": sum(1 for e in ev if e["dias"] < 0),
            "semana": sum(1 for e in ev if 0 <= e["dias"] <= 7),
            "mes": sum(1 for e in ev if 0 <= e["dias"] <= 30),
            "total": len(ev),
        }
        return Response({"eventos": ev, "resumen": resumen})


# ═════════════════════════════════════════════════════════════════════════════
# COLABORACIÓN MULTI-USUARIO (Pilar 1)
# ═════════════════════════════════════════════════════════════════════════════
class MiembrosViewSet(viewsets.ViewSet):
    """Usuarios de la empresa activa, para selectores de asignación/@menciones."""
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        ids = list(_empresas(request.user))
        emp = request.query_params.get("empresa")
        emp_id = int(emp) if (emp and int(emp) in ids) else (ids[0] if ids else None)
        if not emp_id:
            return Response([])
        empresa = Empresa.objects.filter(id=emp_id).first()
        if not empresa:
            return Response([])
        data = MiembroSerializer(miembros_empresa(empresa), many=True,
                                 context={"empresa_id": emp_id}).data
        return Response(data)


class ComentarioViewSet(viewsets.ModelViewSet):
    """Hilo de comentarios de cualquier registro del SGC (genérico vía ContentType)."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ComentarioSGCSerializer

    def get_queryset(self):
        qs = (ComentarioSGC.objects.filter(empresa__in=_empresas(self.request.user))
              .select_related("autor").prefetch_related("menciones"))
        tipo = self.request.query_params.get("tipo")
        objeto = self.request.query_params.get("objeto")
        if tipo and objeto:
            ct = ct_para(tipo)
            qs = qs.filter(content_type=ct, object_id=objeto) if ct else qs.none()
        elif tipo or objeto:
            qs = qs.none()
        return qs

    def _resolver(self, request):
        tipo = request.data.get("tipo")
        objeto_id = request.data.get("objeto")
        ct = ct_para(tipo)
        if not ct or not objeto_id:
            return None, None
        obj = ct.model_class().objects.filter(pk=objeto_id).first()
        if not obj or getattr(obj, "empresa_id", None) not in set(_empresas(request.user)):
            return None, None
        return ct, obj

    def create(self, request, *args, **kwargs):
        texto = (request.data.get("texto") or "").strip()
        ct, obj = self._resolver(request)
        if not obj or not texto:
            return Response({"detail": "tipo, objeto y texto son requeridos."}, status=400)
        c = ComentarioSGC.objects.create(
            empresa=obj.empresa, content_type=ct, object_id=obj.pk,
            autor=request.user, texto=texto,
        )
        menciones = extraer_menciones(texto, obj.empresa)
        if menciones:
            c.menciones.set(menciones)
        registrar_actividad(obj, request.user, "COMENTO", "comentó")
        # Notifica a responsables del objeto (sin las menciones, que reciben otra).
        ids_mencion = {u.pk for u in menciones}
        interesados = []
        for f in ("responsable_user", "auditor_lider_user", "creado_por"):
            u = getattr(obj, f, None)
            if u and u.pk not in ids_mencion:
                interesados.append(u)
        notificar(interesados, obj.empresa, request.user, "COMENTARIO",
                  "Nuevo comentario", mensaje=texto[:140], obj=obj)
        notificar(menciones, obj.empresa, request.user, "MENCION",
                  "Te mencionaron en un comentario", mensaje=texto[:140], obj=obj)
        return Response(ComentarioSGCSerializer(c).data, status=201)

    def perform_update(self, serializer):
        serializer.save(editado=True)

    def get_object(self):
        obj = super().get_object()
        # Solo el autor (o staff/superuser) puede editar/borrar su comentario.
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            u = self.request.user
            if obj.autor_id != u.id and not (u.is_staff or u.is_superuser):
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Solo el autor puede modificar el comentario.")
        return obj


class ActividadViewSet(viewsets.ReadOnlyModelViewSet):
    """Bitácora/timeline de un registro del SGC (solo lectura)."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ActividadSGCSerializer

    def get_queryset(self):
        qs = (ActividadSGC.objects.filter(empresa__in=_empresas(self.request.user))
              .select_related("actor"))
        tipo = self.request.query_params.get("tipo")
        objeto = self.request.query_params.get("objeto")
        if tipo and objeto:
            ct = ct_para(tipo)
            qs = qs.filter(content_type=ct, object_id=objeto) if ct else qs.none()
        elif tipo or objeto:
            qs = qs.none()
        return qs[:200]


class NotificacionViewSet(viewsets.ReadOnlyModelViewSet):
    """Notificaciones del usuario autenticado (campana del SGC)."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NotificacionCalidadSerializer

    def get_queryset(self):
        qs = NotificacionCalidad.objects.filter(destinatario=self.request.user).select_related("actor")
        if self.request.query_params.get("no_leidas") in ("1", "true", "True"):
            qs = qs.filter(leida=False)
        return qs

    @action(detail=False, methods=["get"])
    def conteo(self, request):
        n = NotificacionCalidad.objects.filter(destinatario=request.user, leida=False).count()
        return Response({"no_leidas": n})

    @action(detail=True, methods=["post"])
    def leer(self, request, pk=None):
        marcar_leidas(NotificacionCalidad.objects.filter(pk=pk, destinatario=request.user))
        return Response({"ok": True})

    @action(detail=False, methods=["post"])
    def marcar_todas(self, request):
        n = marcar_leidas(NotificacionCalidad.objects.filter(destinatario=request.user))
        return Response({"marcadas": n})


class MisPendientesViewSet(viewsets.ViewSet):
    """Bandeja unificada 'Mis pendientes de calidad' del usuario autenticado."""
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=["get"])
    def resumen(self, request):
        user = request.user
        ids = list(_empresas(user))
        emp = request.query_params.get("empresa")
        if emp and int(emp) in ids:
            ids = [int(emp)]
        hoy = date.today()
        items = []

        def push(tipo, obj, titulo, estado, fecha_limite, ruta, progreso=None, sub=None):
            vencido = bool(fecha_limite and fecha_limite < hoy and estado not in
                           ("CERRADA", "RESUELTA", "LOGRADO", "CONTROLADO", "IMPLEMENTADO", "VERIFICADO"))
            items.append({
                "tipo": tipo, "id": obj.pk, "titulo": titulo, "estado": estado,
                "fecha_limite": fecha_limite, "vencido": vencido,
                "url": f"{ruta}?focus={obj.pk}",
                "progreso": progreso, "sub": sub,
            })

        for nc in NoConformidad.objects.filter(empresa_id__in=ids, responsable_user=user,
                                               estado__in=["ABIERTA", "EN_PROCESO"]).prefetch_related("acciones"):
            acc = list(nc.acciones.all())
            sub = {"done": sum(1 for a in acc if a.estado in ("HECHA", "VERIFICADA")), "total": len(acc)} if acc else None
            push("No conformidad", nc, f"{nc.folio or 'NC'} · {nc.descripcion[:70]}",
                 nc.estado, nc.fecha_compromiso, "/sgc/no-conformidades", sub=sub)
        for r in Riesgo.objects.filter(empresa_id__in=ids, responsable_user=user,
                                       estado__in=["IDENTIFICADO", "EN_TRATAMIENTO"]):
            push("Riesgo", r, r.descripcion[:70], r.estado, None, "/sgc/riesgos")
        for o in ObjetivoCalidad.objects.filter(empresa_id__in=ids, responsable_user=user,
                                                estado="EN_CURSO").prefetch_related("tareas"):
            tareas = list(o.tareas.all())
            sub = {"done": sum(1 for t in tareas if t.avance >= 100), "total": len(tareas)} if tareas else None
            push("Objetivo", o, o.objetivo[:70], o.estado, o.fecha_limite, "/sgc/politica",
                 progreso=o.avance, sub=sub)
        for t in (TareaImplementacion.objects.filter(empresa_id__in=ids, responsable_user=user)
                  .exclude(columna="VERIFICADO").prefetch_related("subtareas")):
            subs = list(t.subtareas.all())
            sub = {"done": sum(1 for s in subs if s.avance >= 100), "total": len(subs)} if subs else None
            push("Implementación", t, t.titulo, t.get_columna_display(), t.fecha_limite,
                 "/sgc/implementacion", progreso=t.avance, sub=sub)
        for a in Auditoria.objects.filter(empresa_id__in=ids, auditor_lider_user=user,
                                          estado__in=["PROGRAMADA", "EN_CURSO"]):
            push("Auditoría", a, a.titulo, a.estado, a.fecha_programada, "/sgc/auditorias")
        for c in Capacitacion.objects.filter(empresa_id__in=ids, responsable_user=user,
                                             estado__in=["PROGRAMADA", "VENCIDA"]):
            push("Capacitación", c, c.curso, c.estado, c.fecha, "/sgc/capacitacion")
        for e in Equipo.objects.filter(empresa_id__in=ids, responsable_user=user,
                                       requiere_calibracion=True, activo=True):
            push("Calibración", e, f"{e.codigo} · {e.nombre}",
                 "Calibrar", e.fecha_proxima_calibracion, "/sgc/equipos")

        items.sort(key=lambda x: (not x["vencido"], x["fecha_limite"] or date.max))
        return Response({
            "total": len(items),
            "vencidos": sum(1 for i in items if i["vencido"]),
            "items": items,
        })


# ═════════════════════════════════════════════════════════════════════════════
# PILAR 2 · TABLERO DE IMPLEMENTACIÓN (Kanban ISO)
# ═════════════════════════════════════════════════════════════════════════════
class TareaImplementacionViewSet(_Colaborativo):
    queryset = TareaImplementacion.objects.select_related("responsable_user", "requisito")
    serializer_class = TareaImplementacionSerializer
    filterset_fields = ["empresa", "columna", "prioridad", "responsable_user", "requisito"]

    AVANCE_COL = {"POR_HACER": 0, "EN_PROCESO": 50, "IMPLEMENTADO": 90, "VERIFICADO": 100}

    @action(detail=False, methods=["get"])
    def tablero(self, request):
        ids = list(_empresas(request.user))
        emp = request.query_params.get("empresa")
        if emp and int(emp) in ids:
            ids = [int(emp)]
        tareas = self.get_queryset().filter(empresa_id__in=ids)
        cols = {c: [] for c, _ in TareaImplementacion.COLUMNAS}
        for t in tareas:
            cols.setdefault(t.columna, []).append(TareaImplementacionSerializer(t).data)
        total = tareas.count()
        verificadas = tareas.filter(columna="VERIFICADO").count()
        return Response({
            "columnas": [{"clave": c, "titulo": lbl, "tareas": cols.get(c, [])}
                         for c, lbl in TareaImplementacion.COLUMNAS],
            "total": total, "verificadas": verificadas,
            "progreso": round(verificadas / total * 100, 1) if total else 0,
        })

    @action(detail=True, methods=["post"])
    def mover(self, request, pk=None):
        t = self.get_object()
        antes = t.columna
        col = request.data.get("columna")
        if col not in dict(TareaImplementacion.COLUMNAS):
            return Response({"detail": "Columna inválida."}, status=400)
        t.columna = col
        if "orden" in request.data:
            t.orden = request.data["orden"]
        # El avance sigue a la columna salvo que se especifique a mano.
        t.avance = request.data.get("avance", self.AVANCE_COL.get(col, t.avance))
        t.save()
        if antes != col:
            registrar_actividad(t, request.user, "CAMBIO_ESTADO",
                                f"movió la tarjeta a {t.get_columna_display()}",
                                {"columna": [antes, col]})
            if t.responsable_user:
                notificar([t.responsable_user], t.empresa, request.user, "CAMBIO_ESTADO",
                          f"{t.titulo}: {antes} → {col}", obj=t)
        return Response(TareaImplementacionSerializer(t).data)

    @action(detail=False, methods=["post"])
    def generar(self, request):
        """Crea una tarjeta por cada cláusula ISO que aún no tenga tarea."""
        ids = list(_empresas(request.user))
        emp_id = request.data.get("empresa") or (ids[0] if ids else None)
        if not emp_id or int(emp_id) not in ids:
            return Response({"detail": "Empresa inválida."}, status=400)
        existentes = set(TareaImplementacion.objects.filter(empresa_id=emp_id)
                         .exclude(requisito=None).values_list("requisito_id", flat=True))
        creadas = 0
        for req in RequisitoISO.objects.select_related("norma"):
            if req.id in existentes:
                continue
            TareaImplementacion.objects.create(
                empresa_id=emp_id, requisito=req,
                titulo=f"{req.clausula} · {req.titulo}",
                descripcion=f"Implementar el requisito {req.clausula} de {req.norma.codigo}.",
                columna="POR_HACER", creado_por=request.user,
            )
            creadas += 1
        return Response({"creadas": creadas})


# ═════════════════════════════════════════════════════════════════════════════
# PILAR 3 · CAPA AVANZADO (acciones múltiples + evidencias)
# ═════════════════════════════════════════════════════════════════════════════
class AccionCAPAViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AccionCAPASerializer
    filterset_fields = ["no_conformidad", "estado", "responsable_user"]

    def get_queryset(self):
        return (AccionCAPA.objects.filter(no_conformidad__empresa__in=_empresas(self.request.user))
                .select_related("responsable_user", "no_conformidad"))

    @staticmethod
    def _avanzar_nc(nc):
        """Auto-progreso: con acciones definidas, una NC ABIERTA pasa a EN_PROCESO."""
        if nc.estado == "ABIERTA" and nc.acciones.exists():
            nc.estado = "EN_PROCESO"
            nc.save(update_fields=["estado"])
            return True
        return False

    def perform_create(self, serializer):
        accion = serializer.save()
        nc = accion.no_conformidad
        registrar_actividad(nc, self.request.user, "ACTUALIZO",
                            f"agregó una acción: {accion.descripcion[:60]}")
        self._avanzar_nc(nc)
        if accion.responsable_user:
            notificar([accion.responsable_user], nc.empresa, self.request.user, "ASIGNACION",
                      f"Acción CAPA asignada en {nc.folio or nc.id}", mensaje=accion.descripcion[:140], obj=nc)

    def perform_update(self, serializer):
        antes = serializer.instance.estado
        accion = serializer.save()
        if accion.estado != antes:
            registrar_actividad(accion.no_conformidad, self.request.user, "CAMBIO_ESTADO",
                                f"acción «{accion.descripcion[:40]}» → {accion.get_estado_display()}")
        self._avanzar_nc(accion.no_conformidad)


class EvidenciaViewSet(viewsets.ModelViewSet):
    """Adjuntos de evidencia (genéricos) para cualquier registro del SGC."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = EvidenciaSGCSerializer

    def get_queryset(self):
        qs = EvidenciaSGC.objects.filter(empresa__in=_empresas(self.request.user)).select_related("subido_por")
        tipo = self.request.query_params.get("tipo")
        objeto = self.request.query_params.get("objeto")
        if tipo and objeto:
            ct = ct_para(tipo)
            qs = qs.filter(content_type=ct, object_id=objeto) if ct else qs.none()
        elif tipo or objeto:
            qs = qs.none()
        return qs

    def create(self, request, *args, **kwargs):
        tipo = request.data.get("tipo")
        objeto_id = request.data.get("objeto")
        ct = ct_para(tipo)
        if not ct or not objeto_id or "archivo" not in request.FILES:
            return Response({"detail": "tipo, objeto y archivo son requeridos."}, status=400)
        obj = ct.model_class().objects.filter(pk=objeto_id).first()
        if not obj or getattr(obj, "empresa_id", None) not in set(_empresas(request.user)):
            return Response({"detail": "Objeto no encontrado."}, status=404)
        archivo = request.FILES["archivo"]
        ev = EvidenciaSGC.objects.create(
            empresa=obj.empresa, content_type=ct, object_id=obj.pk, archivo=archivo,
            nombre=request.data.get("nombre") or archivo.name,
            descripcion=request.data.get("descripcion", ""), subido_por=request.user,
        )
        registrar_actividad(obj, request.user, "ADJUNTO", f"adjuntó evidencia: {ev.nombre}")
        return Response(EvidenciaSGCSerializer(ev, context={"request": request}).data, status=201)


# ═════════════════════════════════════════════════════════════════════════════
# PILAR 4 · PROCESOS (SIPOC) + MEDICIONES KPI
# ═════════════════════════════════════════════════════════════════════════════
class ProcesoViewSet(_Colaborativo):
    asignacion_field = "dueno_user"
    queryset = Proceso.objects.select_related("dueno_user").prefetch_related("kpis", "riesgos", "objetivos")
    serializer_class = ProcesoSerializer
    filterset_fields = ["empresa", "tipo", "activo", "dueno_user"]

    @action(detail=True, methods=["get"])
    def panorama(self, request, pk=None):
        """Tablero 360° del proceso: KPIs, riesgos y objetivos vinculados."""
        from .models import IndicadorKPI as _KPI, ObjetivoCalidad as _Obj, Riesgo as _Rie
        p = self.get_object()
        kpis = list(p.kpis.all())
        riesgos = list(p.riesgos.all())
        objetivos = list(p.objetivos.all())
        return Response({
            "proceso": ProcesoSerializer(p).data,
            "kpis": IndicadorKPISerializer(kpis, many=True).data,
            "riesgos": RiesgoSerializer(riesgos, many=True).data,
            "objetivos": ObjetivoCalidadSerializer(objetivos, many=True).data,
            "resumen": {
                "kpis_total": len(kpis),
                "kpis_en_meta": sum(1 for k in kpis if k.cumple),
                "riesgos_total": len(riesgos),
                "riesgos_altos": sum(1 for r in riesgos if r.severidad in ("ALTO", "CRITICO")),
                "objetivos_total": len(objetivos),
                "objetivos_logrados": sum(1 for o in objetivos if o.estado == "LOGRADO"),
            },
        })


class MedicionKPIViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = MedicionKPISerializer
    filterset_fields = ["kpi"]

    def get_queryset(self):
        return MedicionKPI.objects.filter(kpi__empresa__in=_empresas(self.request.user)).select_related("kpi")

    def perform_create(self, serializer):
        medicion = serializer.save(registrado_por=self.request.user)
        # Actualiza el valor actual del KPI con la última medición.
        kpi = medicion.kpi
        ultima = kpi.mediciones.order_by("-fecha").first()
        if ultima and ultima.id == medicion.id:
            kpi.valor_actual = medicion.valor
            kpi.save(update_fields=["valor_actual"])


class TareaObjetivoViewSet(viewsets.ModelViewSet):
    """Tareas/resultados clave de un objetivo. Cada cambio recalcula el avance
    del objetivo padre y lo autocompleta al llegar al 100 %."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TareaObjetivoSerializer
    filterset_fields = ["objetivo"]

    def get_queryset(self):
        return (TareaObjetivo.objects.filter(objetivo__empresa__in=_empresas(self.request.user))
                .select_related("responsable_user", "objetivo"))

    def _recomputar(self, objetivo):
        objetivo.recomputar()
        return {"objetivo_avance": objetivo.avance, "objetivo_estado": objetivo.estado}

    def create(self, request, *args, **kwargs):
        resp = super().create(request, *args, **kwargs)
        obj = self._obj
        extra = self._recomputar(obj)
        resp.data.update(extra)
        if obj.responsable_user and obj.responsable_user_id != request.user.id:
            notificar([obj.responsable_user], obj.empresa, request.user, "INFO",
                      f"Nueva tarea en objetivo: {obj.objetivo[:60]}", obj=obj)
        return resp

    def perform_create(self, serializer):
        tarea = serializer.save()
        self._obj = tarea.objetivo

    def update(self, request, *args, **kwargs):
        resp = super().update(request, *args, **kwargs)
        obj = self.get_object().objetivo
        resp.data.update(self._recomputar(obj))
        return resp

    def destroy(self, request, *args, **kwargs):
        tarea = self.get_object()
        obj = tarea.objetivo
        tarea.delete()
        obj.recomputar()
        return Response({"objetivo_avance": obj.avance, "objetivo_estado": obj.estado})


class SubtareaImplementacionViewSet(viewsets.ModelViewSet):
    """Subtareas de una tarjeta del tablero; recalculan el avance/columna del padre."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SubtareaImplementacionSerializer
    filterset_fields = ["tarea"]

    def get_queryset(self):
        return (SubtareaImplementacion.objects.filter(tarea__empresa__in=_empresas(self.request.user))
                .select_related("responsable_user", "tarea"))

    @staticmethod
    def _extra(t):
        return {"tarea_avance": t.avance, "tarea_columna": t.columna}

    def create(self, request, *args, **kwargs):
        resp = super().create(request, *args, **kwargs)
        self._t.recomputar()
        resp.data.update(self._extra(self._t))
        return resp

    def perform_create(self, serializer):
        sub = serializer.save()
        self._t = sub.tarea

    def update(self, request, *args, **kwargs):
        resp = super().update(request, *args, **kwargs)
        t = self.get_object().tarea
        t.recomputar()
        resp.data.update(self._extra(t))
        return resp

    def destroy(self, request, *args, **kwargs):
        sub = self.get_object()
        t = sub.tarea
        sub.delete()
        t.recomputar()
        return Response(self._extra(t))


class AcuerdoRevisionViewSet(viewsets.ModelViewSet):
    """Acuerdos (salidas 9.3.3) de la revisión, asignables y con seguimiento."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AcuerdoRevisionSerializer
    filterset_fields = ["revision", "estado"]

    def get_queryset(self):
        return (AcuerdoRevision.objects.filter(revision__empresa__in=_empresas(self.request.user))
                .select_related("responsable_user", "revision"))

    def perform_create(self, serializer):
        ac = serializer.save()
        if ac.responsable_user and ac.responsable_user_id != self.request.user.id:
            notificar([ac.responsable_user], ac.revision.empresa, self.request.user, "ASIGNACION",
                      f"Acuerdo de revisión: {ac.descripcion[:60]}", obj=ac.revision)


# ═════════════════════════════════════════════════════════════════════════════
# ENCUESTAS PÚBLICAS
# ═════════════════════════════════════════════════════════════════════════════
class EncuestaViewSet(_Scoped):
    queryset = Encuesta.objects.all()
    serializer_class = EncuestaSerializer
    filterset_fields = ["empresa", "activa"]

    def perform_create(self, serializer):
        serializer.save(token=secrets.token_urlsafe(9), creado_por=self.request.user)

    @action(detail=True, methods=["get"])
    def resultados(self, request, pk=None):
        enc = self.get_object()
        resp = list(enc.respuestas.all())
        sats = [r.satisfaccion for r in resp if r.satisfaccion]
        npss = [r.nps for r in resp if r.nps is not None]
        prom = round(sum(sats) / len(sats), 1) if sats else None
        csat = round(sum(1 for s in sats if s >= 4) / len(sats) * 100) if sats else None
        # NPS = %promotores(9-10) - %detractores(0-6)
        nps_val = None
        if npss:
            promo = sum(1 for n in npss if n >= 9); detr = sum(1 for n in npss if n <= 6)
            nps_val = round((promo - detr) / len(npss) * 100)
        dist = [{"estrella": s, "n": sum(1 for x in sats if x == s)} for s in range(1, 6)]
        return Response({
            "total": len(resp), "satisfaccion_prom": prom, "csat": csat, "nps": nps_val,
            "distribucion": dist,
            "respuestas": RespuestaEncuestaSerializer(resp, many=True).data,
        })


@api_view(["GET"])
@permission_classes([AllowAny])
def encuesta_publica(request, token):
    enc = Encuesta.objects.filter(token=token).first()
    if not enc:
        return Response({"detail": "Encuesta no encontrada."}, status=404)
    if not enc.activa:
        return Response({"detail": "Esta encuesta está cerrada.", "cerrada": True}, status=200)
    return Response(EncuestaPublicaSerializer(enc).data)


@api_view(["POST"])
@permission_classes([AllowAny])
def responder_encuesta(request, token):
    enc = Encuesta.objects.filter(token=token, activa=True).first()
    if not enc:
        return Response({"detail": "Encuesta no disponible."}, status=404)
    data = request.data or {}
    respuestas = data.get("respuestas") or {}
    # Deriva satisfacción (primera pregunta rating) y NPS (primera nps).
    sat = nps = None
    for p in enc.preguntas:
        pid = str(p.get("id"))
        val = respuestas.get(pid)
        if val in (None, ""):
            continue
        if p.get("tipo") == "rating" and sat is None:
            try: sat = int(val)
            except (TypeError, ValueError): pass
        if p.get("tipo") == "nps" and nps is None:
            try: nps = int(val)
            except (TypeError, ValueError): pass
    r = RespuestaEncuesta.objects.create(
        encuesta=enc, respuestas=respuestas,
        cliente_nombre=data.get("cliente_nombre", "")[:200],
        cliente_email=data.get("cliente_email", "")[:200],
        satisfaccion=sat, nps=nps,
    )
    # Crea un caso en Quejas con cada respuesta (voz del cliente) si está activado.
    if enc.crear_queja:
        textos = []
        for p in enc.preguntas:
            v = respuestas.get(str(p.get("id")))
            if v not in (None, "", []):
                textos.append(f"{p.get('titulo')}: {v if not isinstance(v, list) else ', '.join(map(str, v))}")
        tipo = "FELICITACION" if (sat and sat >= 4) else "SUGERENCIA" if (sat == 3) else "QUEJA"
        if sat is None and nps is not None:
            tipo = "FELICITACION" if nps >= 9 else "QUEJA" if nps <= 6 else "SUGERENCIA"
        q = Queja.objects.create(
            empresa=enc.empresa, tipo=tipo,
            cliente=data.get("cliente_nombre", "") or "Anónimo",
            descripcion=f"[Encuesta: {enc.titulo}]\n" + "\n".join(textos[:20]),
            satisfaccion=sat, estado="ABIERTA",
        )
        r.queja = q; r.save(update_fields=["queja"])
        # Notifica a calidad/dirección si fue una queja/insatisfacción.
        if tipo == "QUEJA":
            from apps.core.models import UsuarioEmpresa
            uids = UsuarioEmpresa.objects.filter(empresa=enc.empresa, activo=True, rol__in=["OWNER", "STAFF", "MANAGER"]).values_list("user_id", flat=True)
            from django.contrib.auth import get_user_model
            notificar(list(get_user_model().objects.filter(id__in=uids)), enc.empresa, None, "VENCIMIENTO",
                      f"Nueva queja por encuesta: {enc.titulo}", mensaje=(q.cliente or "Cliente"), url="/sgc/quejas")
    return Response({"ok": True, "mensaje": enc.mensaje_gracias})


# ═════════════════════════════════════════════════════════════════════════════
# COMPETENCIAS GRANULARES (7.2)
# ═════════════════════════════════════════════════════════════════════════════
class CompetenciaPerfilViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CompetenciaPerfilSerializer
    filterset_fields = ["perfil", "tipo"]

    def get_queryset(self):
        return CompetenciaPerfil.objects.filter(perfil__empresa__in=_empresas(self.request.user)).select_related("perfil")


class EvaluacionDetalleViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = EvaluacionDetalleSerializer
    filterset_fields = ["evaluacion"]

    def get_queryset(self):
        return EvaluacionDetalle.objects.filter(evaluacion__empresa__in=_empresas(self.request.user)).select_related("evaluacion")

    def perform_create(self, serializer):
        d = serializer.save(); d.evaluacion.recomputar()

    def perform_update(self, serializer):
        d = serializer.save(); d.evaluacion.recomputar()

    def perform_destroy(self, instance):
        ev = instance.evaluacion; instance.delete(); ev.recomputar()
