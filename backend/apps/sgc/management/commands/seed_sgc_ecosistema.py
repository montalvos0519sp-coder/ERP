"""Datos demo del ECOSISTEMA SGC ISO 9001 (módulos nuevos + colaboración total).

Completa lo que faltaba para que el SGC se vea como un ecosistema profesional:
  - Salidas no conformes (8.7) con responsable, disposición y bitácora.
  - Asigna responsable real a KPIs, quejas, contexto FODA y evaluaciones de
    proveedor (los módulos recién hechos colaborativos).
  - Genera notificaciones y actividad para que las bandejas se vean vivas.

Idempotente: no duplica registros si se corre de nuevo.

Uso:  python manage.py seed_sgc_ecosistema [--empresa 1]
"""
from __future__ import annotations

import random
from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.core.models import Empresa, UsuarioEmpresa
from apps.sgc.models import (
    ElementoContexto, EvaluacionProveedor, IndicadorKPI, Queja, SalidaNoConforme,
)
from apps.sgc.servicios import miembros_empresa, notificar, registrar_actividad

User = get_user_model()
RNG = random.Random(11)


class Command(BaseCommand):
    help = "Siembra el ecosistema SGC: salidas no conformes + colaboración en módulos nuevos."

    def add_arguments(self, parser):
        parser.add_argument("--empresa", type=int, default=None)

    def handle(self, *args, **o):
        emp = Empresa.objects.filter(id=o["empresa"]).first() if o["empresa"] else Empresa.objects.first()
        if not emp:
            self.stderr.write(self.style.ERROR("No hay empresa.")); return

        roles = {"admin": "OWNER", "supervisor": "MANAGER", "tecnico1": "USER", "tecnico2": "USER"}
        for un, rol in roles.items():
            u = User.objects.filter(username=un).first()
            if u:
                UsuarioEmpresa.objects.get_or_create(
                    user=u, empresa=emp, defaults={"rol": rol, "activo": True})
        miembros = list(miembros_empresa(emp))
        if not miembros:
            self.stderr.write(self.style.WARNING("Sin miembros; corre seed_demo_all primero.")); return
        admin = User.objects.filter(username="admin").first() or miembros[0]
        hoy = date.today()
        pick = lambda i: miembros[i % len(miembros)]

        # ── 1) Salidas no conformes (8.7) ────────────────────────────────────
        SNC_DEMO = [
            dict(descripcion="Lote 45 de empaque con sellado deficiente detectado en línea.",
                 origen="PROCESO", disposicion="SEGREGACION", cantidad="120 piezas",
                 requisito_incumplido="Especificación de hermeticidad ES-07", estado="EN_TRATAMIENTO"),
            dict(descripcion="Material recibido del proveedor con humedad fuera de rango.",
                 origen="RECEPCION", disposicion="DEVOLUCION", cantidad="3 tarimas",
                 requisito_incumplido="Orden de compra · humedad < 12%", estado="ABIERTA"),
            dict(descripcion="Servicio de transporte entregado con retraso reportado por cliente.",
                 origen="CLIENTE", disposicion="CONCESION", cantidad="1 servicio",
                 requisito_incumplido="SLA de entrega 24h", autorizo_concesion="Dirección de Operaciones",
                 estado="CERRADA"),
            dict(descripcion="Producto terminado con etiquetado incorrecto en inspección final.",
                 origen="FINAL", disposicion="CORRECCION", cantidad="50 piezas",
                 requisito_incumplido="Norma de etiquetado NOM-050", estado="EN_TRATAMIENTO"),
            dict(descripcion="Hallazgo de auditoría: registro de calibración incompleto.",
                 origen="AUDITORIA", disposicion="RECLASIFICACION", cantidad="2 equipos",
                 requisito_incumplido="Procedimiento PR-CAL-01", estado="ABIERTA"),
        ]
        creadas_snc = 0
        for i, d in enumerate(SNC_DEMO):
            if SalidaNoConforme.objects.filter(empresa=emp, descripcion=d["descripcion"]).exists():
                continue
            resp = pick(i + 1)
            snc = SalidaNoConforme.objects.create(
                empresa=emp, responsable_user=resp, creado_por=admin,
                fecha_deteccion=hoy - timedelta(days=RNG.randint(1, 25)),
                fecha_cierre=hoy if d["estado"] == "CERRADA" else None, **d)
            registrar_actividad(snc, admin, "CREO", f"registró salida no conforme {snc.folio}")
            registrar_actividad(snc, admin, "ASIGNO", f"asignó a {resp.get_full_name() or resp.username}")
            notificar([resp], emp, admin, "ASIGNACION",
                      f"Te asignaron la salida no conforme {snc.folio}", obj=snc)
            creadas_snc += 1

        # ── 2) Asignar responsable a módulos recién colaborativos ────────────
        def asignar(qs, campo, verbo_desc):
            n = 0
            objetos = list(qs)
            for i, obj in enumerate(objetos):
                if getattr(obj, f"{campo}_id", None):
                    continue
                u = pick(i)
                setattr(obj, campo, u)
                obj.save(update_fields=[campo])
                registrar_actividad(obj, admin, "ASIGNO", f"asignó a {u.get_full_name() or u.username}")
                notificar([u], emp, admin, "ASIGNACION", f"Te asignaron: {verbo_desc}", obj=obj)
                n += 1
            return n

        asignadas = 0
        asignadas += asignar(IndicadorKPI.objects.filter(empresa=emp), "responsable_user", "un indicador KPI")
        asignadas += asignar(Queja.objects.filter(empresa=emp), "responsable_user", "una queja de cliente")
        asignadas += asignar(ElementoContexto.objects.filter(empresa=emp), "responsable_user", "un factor FODA")

        # ── 3) Evaluaciones de proveedor: responsable + estado + plan ────────
        eval_n = 0
        for i, ev in enumerate(EvaluacionProveedor.objects.filter(empresa=emp)):
            cambios = []
            if not ev.responsable_user_id:
                ev.responsable_user = pick(i); cambios.append("responsable_user")
            if not ev.estado or ev.estado == "EVALUADO":
                ev.estado = "SEGUIMIENTO" if float(ev.puntaje) < 80 else "CERRADO"
                cambios.append("estado")
            if float(ev.puntaje) < 80 and not ev.plan_mejora:
                ev.plan_mejora = "Reunión de retroalimentación y plan de acción a 90 días con seguimiento mensual."
                cambios.append("plan_mejora")
            if cambios:
                ev.save(update_fields=cambios)
                if ev.responsable_user_id:
                    notificar([ev.responsable_user], emp, admin, "ASIGNACION",
                              f"Seguimiento de proveedor: {ev.proveedor.razon_social}", obj=ev)
                eval_n += 1

        self.stdout.write(self.style.SUCCESS(
            f"Ecosistema SGC sembrado: {creadas_snc} salidas no conformes, "
            f"{asignadas} asignaciones (KPI/quejas/FODA), {eval_n} evaluaciones de proveedor."))
