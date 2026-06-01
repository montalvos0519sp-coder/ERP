import json
from decimal import Decimal

from django.db.models import Q
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from apps.flota.models import Termo, Unidad
from .models import (
    CampoChecklist, EjecucionProceso, EtapaEjecucion, FlujoChecklist,
    OrdenMantenimiento, Proceso, RefaccionUsada, RespuestaChecklist, ValorCampo,
)
from .serializers import (
    EjecucionProcesoSerializer, FlujoChecklistSerializer,
    OrdenMantenimientoSerializer, ProcesoSerializer,
    RefaccionUsadaSerializer, RespuestaChecklistSerializer,
)


def _notificar_etapa(etapa_ej):
    """Crea una notificacion (campana) para cada tecnico de una etapa activada."""
    try:
        from apps.rh.models import Notificacion
    except Exception:
        return
    ejec = etapa_ej.ejecucion
    etiqueta = f" · {ejec.etiqueta}" if ejec.etiqueta else ""
    objs = [
        Notificacion(
            empresa_id=ejec.proceso.empresa_id, user_id=uid, tipo="INFO",
            titulo=f"Etapa pendiente: {etapa_ej.nombre}",
            mensaje=f"Flujo '{ejec.proceso.nombre}'{etiqueta}. Te toca llenar este checklist.",
            enlace="/mantenimiento/pendientes",
        )
        for uid in etapa_ej.tecnicos.values_list("id", flat=True)
    ]
    if objs:
        Notificacion.objects.bulk_create(objs)


def _notificar_proceso_completado(ejec):
    """Avisa al creador del proceso y a quien lo inicio que el flujo termino."""
    try:
        from apps.rh.models import Notificacion
    except Exception:
        return
    destinatarios = {ejec.proceso.creado_por_id, ejec.iniciado_por_id}
    destinatarios.discard(None)
    etiqueta = f" · {ejec.etiqueta}" if ejec.etiqueta else ""
    objs = [
        Notificacion(
            empresa_id=ejec.proceso.empresa_id, user_id=uid, tipo="INFO",
            titulo=f"Flujo completado: {ejec.proceso.nombre}",
            mensaje=f"El flujo '{ejec.proceso.nombre}'{etiqueta} completo todas sus etapas.",
            enlace="/mantenimiento/procesos",
        )
        for uid in destinatarios
    ]
    if objs:
        Notificacion.objects.bulk_create(objs)


def _completar_etapa_ejecucion(etapa_ej, respuesta, user):
    """Marca una etapa de ejecucion como COMPLETADA y habilita la siguiente.
    Si ya no quedan etapas pendientes, marca la ejecucion como COMPLETADO."""
    etapa_ej.estado = EtapaEjecucion.COMPLETADA
    etapa_ej.respuesta = respuesta
    etapa_ej.completado_por = user
    etapa_ej.completado_en = timezone.now()
    etapa_ej.save(update_fields=["estado", "respuesta", "completado_por", "completado_en"])
    ejec = etapa_ej.ejecucion
    siguiente = ejec.etapas.filter(estado=EtapaEjecucion.PENDIENTE).order_by("orden", "id").first()
    if siguiente:
        siguiente.estado = EtapaEjecucion.ACTIVA
        siguiente.save(update_fields=["estado"])
        _notificar_etapa(siguiente)  # avisa a los responsables de la nueva etapa
    elif not ejec.etapas.exclude(estado=EtapaEjecucion.COMPLETADA).exists():
        ejec.estado = EjecucionProceso.COMPLETADO
        ejec.save(update_fields=["estado"])
        _notificar_proceso_completado(ejec)  # avisa que el flujo termino


class OrdenMantenimientoViewSet(viewsets.ModelViewSet):
    queryset = OrdenMantenimiento.objects.select_related("unidad").prefetch_related("refacciones")
    serializer_class = OrdenMantenimientoSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["unidad", "estado", "tipo"]


class RefaccionUsadaViewSet(viewsets.ModelViewSet):
    queryset = RefaccionUsada.objects.select_related("orden", "producto")
    serializer_class = RefaccionUsadaSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["orden"]


def _empresa_activa(request):
    perfil = getattr(request.user, "perfil", None)
    return getattr(perfil, "empresa_activa", None)


class FlujoChecklistViewSet(viewsets.ModelViewSet):
    """Constructor de checklists/flujos de mantenimiento.

    - Encargados (acceso al modulo) crean/editan flujos y asignan tecnicos.
    - Tecnicos ven sus flujos asignados (`mis-flujos`) y los llenan (`responder`).
    """
    serializer_class = FlujoChecklistSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        u = self.request.user
        qs = FlujoChecklist.objects.prefetch_related("campos", "tecnicos").select_related("creado_por")
        empresa = _empresa_activa(self.request)
        if empresa is not None:
            qs = qs.filter(Q(empresa=empresa) | Q(empresa__isnull=True))
        if u.is_superuser:
            return qs
        # Ve los que creo, en los que es tecnico asignado, o los que debe llenar
        # como parte de una etapa de proceso ACTIVA que le toca.
        return qs.filter(
            Q(creado_por=u) | Q(tecnicos=u)
            | Q(etapas_ejecucion__estado=EtapaEjecucion.ACTIVA, etapas_ejecucion__tecnicos=u)
        ).distinct()

    def perform_create(self, serializer):
        serializer.save(creado_por=self.request.user, empresa=_empresa_activa(self.request))

    @action(detail=False, methods=["get"], url_path="mis-flujos")
    def mis_flujos(self, request):
        """Flujos activos asignados al usuario (vista del tecnico)."""
        qs = FlujoChecklist.objects.filter(
            tecnicos=request.user, activo=True,
        ).prefetch_related("campos").distinct().order_by("-actualizado")
        data = FlujoChecklistSerializer(qs, many=True, context={"request": request}).data
        return Response({"count": len(data), "results": data})

    @action(detail=True, methods=["post"], url_path="responder")
    def responder(self, request, pk=None):
        """El tecnico envia una respuesta (llenado) del flujo.

        Acepta multipart/form-data:
          - valores: JSON string [{"campo": <id>, "texto"|"numero"|"booleano": ...}]
          - foto_<campoId>: archivo, por cada campo tipo=foto
          - nota, orden (opcionales)
        Valida obligatorios y rangos (min/max) de los campos numero.
        """
        flujo = self.get_object()
        u = request.user
        es_tecnico = flujo.tecnicos.filter(pk=u.id).exists()
        # Etapa de proceso activa para este checklist (si se respondio desde un flujo).
        etapa_ej_id = request.data.get("etapa_ejecucion")
        etapa_ej = None
        if etapa_ej_id:
            etapa_ej = EtapaEjecucion.objects.filter(
                pk=etapa_ej_id, estado=EtapaEjecucion.ACTIVA, checklist=flujo,
            ).first()
        es_etapa = bool(etapa_ej and etapa_ej.tecnicos.filter(pk=u.id).exists())
        if not (u.is_superuser or es_tecnico or flujo.creado_por_id == u.id or es_etapa):
            return Response({"detail": "No tienes este flujo asignado."}, status=403)

        # Parseo de valores (JSON string o ya-lista si vino como form).
        raw = request.data.get("valores", "[]")
        try:
            valores_in = json.loads(raw) if isinstance(raw, str) else raw
        except (ValueError, TypeError):
            return Response({"detail": "El campo 'valores' no es un JSON valido."}, status=400)
        por_campo = {int(v.get("campo")): v for v in valores_in if v.get("campo") is not None}

        campos = list(flujo.campos.all())
        por_clave = {c.clave: c for c in campos if c.clave}

        def _valor_norm(campo):
            v = por_campo.get(campo.id, {})
            if campo.tipo == CampoChecklist.TIPO_BOOLEANO:
                b = v.get("booleano")
                return None if b is None else ("si" if b else "no")
            if campo.tipo == CampoChecklist.TIPO_NUMERO:
                return None if v.get("numero") in (None, "") else str(v.get("numero"))
            return str(v.get("texto", "")).strip()

        def _visible(campo, _d=0):
            if not campo.depende_de or _d > 10:
                return True
            ctrl = por_clave.get(campo.depende_de)
            if ctrl is None:
                return True
            if not _visible(ctrl, _d + 1):
                return False
            return _valor_norm(ctrl) == campo.mostrar_si

        def _foto_aplica(campo):
            # Foto adjunta a un campo no-foto, segun su valor actual.
            if campo.tipo == CampoChecklist.TIPO_FOTO or not campo.foto_aplica:
                return False
            if campo.foto_aplica == CampoChecklist.FOTO_SIEMPRE:
                return True
            valor = _valor_norm(campo)  # "si"/"no" para booleanos
            if campo.foto_aplica == CampoChecklist.FOTO_SI_SI:
                return valor == "si"
            if campo.foto_aplica == CampoChecklist.FOTO_SI_NO:
                return valor == "no"
            return False

        errores = {}
        for campo in campos:
            if not _visible(campo):
                continue  # campo oculto por condicion: no se valida
            v = por_campo.get(campo.id, {})
            archivo = request.FILES.get(f"foto_{campo.id}")
            numericos = (CampoChecklist.TIPO_NUMERO, CampoChecklist.TIPO_KM_UNIDAD,
                         CampoChecklist.TIPO_HORAS_TERMO, CampoChecklist.TIPO_UNIDAD,
                         CampoChecklist.TIPO_TERMO)
            if campo.tipo == CampoChecklist.TIPO_FOTO:
                tiene = bool(archivo)
            elif campo.tipo == CampoChecklist.TIPO_BOOLEANO:
                tiene = v.get("booleano") is not None
            elif campo.tipo in numericos:
                tiene = v.get("numero") not in (None, "")
            else:
                tiene = bool(str(v.get("texto", "")).strip())
            if campo.obligatorio and not tiene:
                errores[str(campo.id)] = f"'{campo.etiqueta}' es obligatorio."
                continue
            # Foto adjunta obligatoria (cuando aplica segun la respuesta).
            if campo.foto_obligatoria and _foto_aplica(campo) and not archivo:
                errores[f"{campo.id}_foto"] = f"Falta la foto de '{campo.etiqueta}'."
            # Validacion de rango para numeros (condicional mayor/menor).
            if campo.tipo in (CampoChecklist.TIPO_NUMERO, CampoChecklist.TIPO_KM_UNIDAD,
                              CampoChecklist.TIPO_HORAS_TERMO) and tiene:
                try:
                    num = float(v.get("numero"))
                except (ValueError, TypeError):
                    errores[str(campo.id)] = f"'{campo.etiqueta}' debe ser un numero."
                    continue
                if campo.min_valor is not None and num < campo.min_valor:
                    errores[str(campo.id)] = f"'{campo.etiqueta}' debe ser mayor o igual a {campo.min_valor}."
                if campo.max_valor is not None and num > campo.max_valor:
                    errores[str(campo.id)] = f"'{campo.etiqueta}' debe ser menor o igual a {campo.max_valor}."
        if errores:
            return Response({"detail": "Hay campos invalidos.", "errores": errores}, status=400)

        orden_id = request.data.get("orden") or None
        respuesta = RespuestaChecklist.objects.create(
            flujo=flujo, tecnico=u,
            orden_id=orden_id if orden_id not in ("", "0") else None,
            nota=(request.data.get("nota") or "")[:400],
        )
        for campo in campos:
            if not _visible(campo):
                continue  # campo oculto por condicion: no se guarda
            v = por_campo.get(campo.id, {})
            archivo = request.FILES.get(f"foto_{campo.id}")
            kwargs = {}
            if campo.tipo == CampoChecklist.TIPO_FOTO:
                if archivo:
                    kwargs["foto"] = archivo
            elif campo.tipo == CampoChecklist.TIPO_BOOLEANO:
                if v.get("booleano") is not None:
                    kwargs["booleano"] = bool(v.get("booleano"))
            elif campo.tipo in (CampoChecklist.TIPO_NUMERO, CampoChecklist.TIPO_KM_UNIDAD,
                                CampoChecklist.TIPO_HORAS_TERMO, CampoChecklist.TIPO_UNIDAD,
                                CampoChecklist.TIPO_TERMO):
                if v.get("numero") not in (None, ""):
                    kwargs["numero"] = float(v.get("numero"))
                # Las unidades/termos tambien guardan su etiqueta legible.
                if v.get("texto"):
                    kwargs["texto"] = str(v.get("texto"))[:500]
            else:
                texto = str(v.get("texto", "")).strip()
                if texto:
                    kwargs["texto"] = texto
            # Foto adjunta a un campo no-foto cuando aplica segun su respuesta.
            if campo.tipo != CampoChecklist.TIPO_FOTO and archivo and _foto_aplica(campo):
                kwargs["foto"] = archivo
            if kwargs:
                ValorCampo.objects.create(respuesta=respuesta, campo=campo, **kwargs)

        # ── Actualiza el catalogo de flota segun los campos especiales ──────────
        unidad_id = km_val = termo_id = horas_val = None
        for campo in campos:
            if not _visible(campo):
                continue
            v = por_campo.get(campo.id, {})
            num = v.get("numero")
            if campo.tipo == CampoChecklist.TIPO_UNIDAD and num not in (None, ""):
                unidad_id = int(float(num))
            elif campo.tipo == CampoChecklist.TIPO_KM_UNIDAD and num not in (None, ""):
                km_val = float(num)
            elif campo.tipo == CampoChecklist.TIPO_TERMO and num not in (None, ""):
                termo_id = int(float(num))
            elif campo.tipo == CampoChecklist.TIPO_HORAS_TERMO and num not in (None, ""):
                horas_val = float(num)

        from apps.flota.models import Termo, Unidad
        if unidad_id:
            unidad = Unidad.objects.filter(pk=unidad_id).first()
            if unidad:
                respuesta.unidad = unidad
                if km_val is not None:
                    unidad.km_actual = km_val
                    unidad.save(update_fields=["km_actual", "actualizado"])
                if not termo_id and unidad.termo_id:
                    termo_id = unidad.termo_id  # usa el termo fijo de la unidad
        if termo_id:
            termo = Termo.objects.filter(pk=termo_id).first()
            if termo:
                respuesta.termo = termo
                if horas_val is not None:
                    termo.horas_actual = horas_val
                    termo.save(update_fields=["horas_actual"])
        if respuesta.unidad_id or respuesta.termo_id:
            respuesta.save(update_fields=["unidad", "termo"])

        # Si esta respuesta completa una etapa de un proceso, avanza el flujo.
        if etapa_ej and (u.is_superuser or es_etapa):
            _completar_etapa_ejecucion(etapa_ej, respuesta, u)

        data = RespuestaChecklistSerializer(respuesta, context={"request": request}).data
        return Response(data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="respuestas")
    def respuestas(self, request, pk=None):
        """Respuestas resguardadas de un flujo (consulta del encargado)."""
        flujo = self.get_object()
        qs = flujo.respuestas.select_related("tecnico").prefetch_related("valores__campo")
        data = RespuestaChecklistSerializer(qs, many=True, context={"request": request}).data
        return Response({"count": len(data), "results": data})


class RespuestaChecklistViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = RespuestaChecklistSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        u = self.request.user
        qs = RespuestaChecklist.objects.select_related("tecnico", "flujo").prefetch_related("valores__campo")
        if u.is_superuser:
            return qs
        return qs.filter(Q(flujo__creado_por=u) | Q(tecnico=u)).distinct()


class ProcesoViewSet(viewsets.ModelViewSet):
    """Flujos multi-etapa: secuencia de checklists que se habilitan en orden."""
    serializer_class = ProcesoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        u = self.request.user
        qs = Proceso.objects.prefetch_related(
            "etapas__tecnicos", "etapas__checklist",
        ).select_related("creado_por")
        empresa = _empresa_activa(self.request)
        if empresa is not None:
            qs = qs.filter(Q(empresa=empresa) | Q(empresa__isnull=True))
        if u.is_superuser:
            return qs
        return qs.filter(Q(creado_por=u) | Q(etapas__tecnicos=u)).distinct()

    def perform_create(self, serializer):
        serializer.save(creado_por=self.request.user, empresa=_empresa_activa(self.request))

    @action(detail=True, methods=["post"], url_path="iniciar")
    def iniciar(self, request, pk=None):
        """Inicia una ejecucion del proceso: crea las etapas y activa la primera."""
        proceso = self.get_object()
        etapas = list(proceso.etapas.all())
        if not etapas:
            return Response({"detail": "El proceso no tiene etapas."}, status=400)
        ejec = EjecucionProceso.objects.create(
            proceso=proceso, etiqueta=(request.data.get("etiqueta") or "")[:200],
            iniciado_por=request.user,
        )
        primera = None
        for i, et in enumerate(etapas):
            ee = EtapaEjecucion.objects.create(
                ejecucion=ejec, etapa=et, orden=et.orden,
                nombre=et.nombre or (et.checklist.nombre if et.checklist else ""),
                checklist=et.checklist,
                estado=EtapaEjecucion.ACTIVA if i == 0 else EtapaEjecucion.PENDIENTE,
            )
            ee.tecnicos.set(et.tecnicos.all())
            if i == 0:
                primera = ee
        if primera:
            _notificar_etapa(primera)  # avisa a los responsables de la 1a etapa
        data = EjecucionProcesoSerializer(ejec, context={"request": request}).data
        return Response(data, status=status.HTTP_201_CREATED)


class EjecucionProcesoViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = EjecucionProcesoSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["proceso", "estado"]

    def get_queryset(self):
        u = self.request.user
        qs = EjecucionProceso.objects.select_related("proceso", "iniciado_por").prefetch_related(
            "etapas__tecnicos", "etapas__checklist",
        )
        if u.is_superuser:
            return qs
        return qs.filter(
            Q(proceso__creado_por=u) | Q(iniciado_por=u) | Q(etapas__tecnicos=u)
        ).distinct()

    @action(detail=False, methods=["get"], url_path="mis-etapas")
    def mis_etapas(self, request):
        """Bandeja del usuario: etapas ACTIVAS que le toca llenar."""
        qs = EtapaEjecucion.objects.filter(
            estado=EtapaEjecucion.ACTIVA, tecnicos=request.user,
            ejecucion__estado=EjecucionProceso.EN_CURSO,
        ).select_related("ejecucion__proceso", "checklist").distinct().order_by("-ejecucion__creado", "orden")
        data = [{
            "id": ee.id,
            "ejecucion": ee.ejecucion_id,
            "proceso_nombre": ee.ejecucion.proceso.nombre,
            "etiqueta": ee.ejecucion.etiqueta,
            "orden": ee.orden,
            "nombre": ee.nombre,
            "checklist": ee.checklist_id,
            "checklist_nombre": ee.checklist.nombre if ee.checklist else "",
        } for ee in qs]
        return Response({"count": len(data), "results": data})

    @action(detail=True, methods=["post"], url_path="cancelar")
    def cancelar(self, request, pk=None):
        ejec = self.get_object()
        ejec.estado = EjecucionProceso.CANCELADO
        ejec.save(update_fields=["estado"])
        return Response(EjecucionProcesoSerializer(ejec, context={"request": request}).data)


# ---------------------------------------------------------------------------
# Tablero Preventivo (por km para motor, por horas para Thermo King)
# ---------------------------------------------------------------------------

_ZERO = Decimal("0")


def _estado_preventivo(pendientes: Decimal, intervalo: Decimal) -> str:
    """VENCIDO si ya pasó el servicio, PROXIMO si está dentro del 15% del
    intervalo, OK en cualquier otro caso."""
    umbral = (intervalo or _ZERO) * Decimal("0.15")
    if pendientes <= 0:
        return "VENCIDO"
    if pendientes <= umbral:
        return "PROXIMO"
    return "OK"


class PreventivoViewSet(viewsets.ViewSet):
    """Tablero de mantenimiento preventivo y configuración de intervalos.

    El km/horas "actual" sale de Unidad.km_actual / Termo.horas_actual (que se
    alimentan de cargas de combustible, checklists, etc.). El próximo servicio
    se calcula como (último servicio + intervalo configurado).
    """
    permission_classes = [permissions.IsAuthenticated]

    def _empresas(self):
        u = self.request.user
        if u.is_superuser:
            return None
        return list(u.empresas.filter(activo=True).values_list("empresa_id", flat=True))

    def _scope(self, qs):
        ids = self._empresas()
        if ids is not None:
            qs = qs.filter(empresa_id__in=ids)
        return qs.filter(activo=True)

    @action(detail=False, methods=["get"])
    def motor(self, request):
        filas = []
        total_km = _ZERO
        for u in self._scope(Unidad.objects.all()).order_by("numero"):
            actual = u.km_actual or _ZERO
            base = u.km_ultimo_servicio or _ZERO
            intervalo = u.intervalo_km_preventivo or _ZERO
            prox = base + intervalo
            pendientes = prox - actual
            total_km += actual
            filas.append({
                "id": u.id, "unidad": u.numero, "placas": u.placas, "tipo": u.tipo,
                "km_base": float(base), "intervalo": float(intervalo),
                "km_prox": float(prox), "km_actual": float(actual),
                "km_pendientes": float(pendientes),
                "fecha_ultimo_servicio": u.fecha_ultimo_servicio,
                "estado": _estado_preventivo(pendientes, intervalo),
            })
        filas.sort(key=lambda f: f["km_pendientes"])
        return Response({
            "km_totales_flota": float(total_km),
            "top5": filas[:5],
            "unidades": filas,
        })

    @action(detail=False, methods=["get"])
    def thermo(self, request):
        filas = []
        total_hrs = _ZERO
        for t in self._scope(Termo.objects.all()).order_by("numero"):
            actual = t.horas_actual or _ZERO
            base = t.horas_ultimo_servicio or _ZERO
            intervalo = t.intervalo_horas_preventivo or _ZERO
            prox = base + intervalo
            pendientes = prox - actual
            total_hrs += actual
            filas.append({
                "id": t.id, "unidad": t.numero, "marca": t.marca, "observacion": t.notas,
                "hrs_base": float(base), "intervalo": float(intervalo),
                "hrs_prox": float(prox), "hrs_actual": float(actual),
                "hrs_pendientes": float(pendientes),
                "fecha_ultimo_servicio": t.fecha_ultimo_servicio,
                "estado": _estado_preventivo(pendientes, intervalo),
            })
        filas.sort(key=lambda f: f["hrs_pendientes"])
        return Response({
            "hrs_totales_flota": float(total_hrs),
            "top5": filas[:5],
            "termos": filas,
        })

    @action(detail=False, methods=["post"], url_path="configurar-unidad")
    def configurar_unidad(self, request):
        u = self._scope(Unidad.objects.all()).filter(id=request.data.get("id")).first()
        if not u:
            return Response({"detail": "Unidad no encontrada."}, status=404)
        d = request.data
        if d.get("intervalo_km_preventivo") not in (None, ""):
            u.intervalo_km_preventivo = Decimal(str(d["intervalo_km_preventivo"]))
        if d.get("km_ultimo_servicio") not in (None, ""):
            u.km_ultimo_servicio = Decimal(str(d["km_ultimo_servicio"]))
        if d.get("km_actual") not in (None, ""):
            u.km_actual = Decimal(str(d["km_actual"]))
        if "fecha_ultimo_servicio" in d:
            u.fecha_ultimo_servicio = d.get("fecha_ultimo_servicio") or None
        u.save()
        return Response({"ok": True})

    @action(detail=False, methods=["post"], url_path="configurar-termo")
    def configurar_termo(self, request):
        t = self._scope(Termo.objects.all()).filter(id=request.data.get("id")).first()
        if not t:
            return Response({"detail": "Termo no encontrado."}, status=404)
        d = request.data
        if d.get("intervalo_horas_preventivo") not in (None, ""):
            t.intervalo_horas_preventivo = Decimal(str(d["intervalo_horas_preventivo"]))
        if d.get("horas_ultimo_servicio") not in (None, ""):
            t.horas_ultimo_servicio = Decimal(str(d["horas_ultimo_servicio"]))
        if d.get("horas_actual") not in (None, ""):
            t.horas_actual = Decimal(str(d["horas_actual"]))
        if "fecha_ultimo_servicio" in d:
            t.fecha_ultimo_servicio = d.get("fecha_ultimo_servicio") or None
        t.save()
        return Response({"ok": True})
