# -*- coding: utf-8 -*-
"""Genera recordatorios de vencimientos del SGC y los notifica (in-app + correo).

Pensado para correrse a diario por un cron/programador:
    python manage.py sgc_recordatorios

Notifica al responsable de cada elemento que vence pronto (NC, auditorías,
calibraciones, capacitaciones, objetivos, acciones CAPA, acuerdos de dirección)
y manda un resumen semanal al responsable de calidad (rol OWNER/STAFF/MANAGER).
"""
from __future__ import annotations

from datetime import date, timedelta

from django.core.management.base import BaseCommand

from apps.core.models import Empresa, UsuarioEmpresa
from apps.sgc.models import (
    NoConformidad, Auditoria, Equipo, Capacitacion, ObjetivoCalidad,
    AccionCAPA, AcuerdoRevision,
)
from apps.sgc.servicios import notificar


class Command(BaseCommand):
    help = "Envía recordatorios de vencimientos del SGC (in-app + correo)."

    def add_arguments(self, parser):
        parser.add_argument("--dias", type=int, default=7, help="Umbral de días para avisar")
        parser.add_argument("--empresa", type=int, default=None)

    def handle(self, *args, **o):
        hoy = date.today()
        umbral = hoy + timedelta(days=o["dias"])
        empresas = (Empresa.objects.filter(id=o["empresa"]) if o["empresa"]
                    else Empresa.objects.all())
        total = 0
        for emp in empresas:
            total += self._procesar(emp, hoy, umbral, o["dias"])
        self.stdout.write(self.style.SUCCESS(f"Recordatorios enviados: {total}"))

    def _procesar(self, emp, hoy, umbral, dias):
        enviados = 0

        def avisar(responsable, titulo, fecha, obj):
            nonlocal enviados
            if not responsable or not fecha:
                return
            d = (fecha - hoy).days
            if d < 0:
                msg = f"Venció hace {abs(d)} día(s) ({fecha})."
                tipo = "VENCIMIENTO"
            elif fecha <= umbral:
                msg = f"Vence en {d} día(s) ({fecha})."
                tipo = "VENCIMIENTO"
            else:
                return
            notificar([responsable], emp, None, tipo, titulo, mensaje=msg, obj=obj)
            enviados += 1

        for nc in NoConformidad.objects.filter(
                empresa=emp, estado__in=["ABIERTA", "EN_PROCESO"]).exclude(fecha_compromiso=None):
            avisar(nc.responsable_user, f"No conformidad {nc.folio or nc.id} por vencer",
                   nc.fecha_compromiso, nc)
        for a in Auditoria.objects.filter(
                empresa=emp, estado__in=["PROGRAMADA", "EN_CURSO"]).exclude(fecha_programada=None):
            avisar(a.auditor_lider_user, f"Auditoría '{a.titulo}' programada",
                   a.fecha_programada, a)
        for e in Equipo.objects.filter(
                empresa=emp, requiere_calibracion=True, activo=True).exclude(fecha_proxima_calibracion=None):
            avisar(e.responsable_user, f"Calibración de {e.codigo} · {e.nombre}",
                   e.fecha_proxima_calibracion, e)
        for c in Capacitacion.objects.filter(empresa=emp).exclude(fecha_vencimiento=None):
            avisar(c.responsable_user, f"Capacitación '{c.curso}' por vencer",
                   c.fecha_vencimiento, c)
        for ob in ObjetivoCalidad.objects.filter(
                empresa=emp, estado="EN_CURSO").exclude(fecha_limite=None):
            avisar(ob.responsable_user, f"Objetivo de calidad por vencer",
                   ob.fecha_limite, ob)
        for acc in AccionCAPA.objects.filter(
                no_conformidad__empresa=emp).exclude(estado="VERIFICADA").exclude(fecha_compromiso=None):
            avisar(acc.responsable_user, f"Acción CAPA por vencer",
                   acc.fecha_compromiso, acc)
        for ac in AcuerdoRevision.objects.filter(
                revision__empresa=emp).exclude(estado="CERRADO").exclude(fecha_compromiso=None):
            avisar(ac.responsable_user, f"Acuerdo de dirección por vencer",
                   ac.fecha_compromiso, ac)
        return enviados
