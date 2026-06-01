"""Datos demo de la capa de colaboración del SGC (Pilar 1).

Da de alta a los usuarios demo como miembros de la empresa, reparte registros
del SGC (NC, riesgos, objetivos, auditorías, capacitaciones, calibraciones)
entre usuarios reales, y genera bitácora + comentarios + notificaciones para
que las bandejas 'Mis pendientes' y la campana se vean pobladas.

Idempotente: no duplica asignaciones ni comentarios si se corre de nuevo.

Uso:  python manage.py seed_sgc_colaboracion [--empresa 1]
"""
from __future__ import annotations

import random

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.core.models import Empresa, UsuarioEmpresa
from apps.sgc.models import (
    Auditoria, Capacitacion, ComentarioSGC, Equipo, NoConformidad, ObjetivoCalidad, Riesgo,
)
from apps.sgc.servicios import miembros_empresa, notificar, registrar_actividad

User = get_user_model()
RNG = random.Random(7)


class Command(BaseCommand):
    help = "Siembra asignaciones, comentarios y notificaciones demo del SGC."

    def add_arguments(self, parser):
        parser.add_argument("--empresa", type=int, default=None)

    def handle(self, *args, **o):
        emp = Empresa.objects.filter(id=o["empresa"]).first() if o["empresa"] else Empresa.objects.first()
        if not emp:
            self.stderr.write(self.style.ERROR("No hay empresa.")); return

        # 1) Alta de miembros demo (si existen los usuarios del seed general).
        roles = {"admin": "OWNER", "supervisor": "MANAGER", "tecnico1": "USER", "tecnico2": "USER"}
        for un, rol in roles.items():
            u = User.objects.filter(username=un).first()
            if u:
                UsuarioEmpresa.objects.get_or_create(
                    user=u, empresa=emp, defaults={"rol": rol, "activo": True})
        miembros = list(miembros_empresa(emp))
        if len(miembros) < 2:
            self.stderr.write(self.style.WARNING("Pocos miembros; corre primero seed_demo_all."));
        admin = User.objects.filter(username="admin").first() or (miembros[0] if miembros else None)

        def repartir(qs, campo, verbo_desc):
            n = 0
            for i, obj in enumerate(qs):
                if getattr(obj, f"{campo}_id", None):
                    continue
                u = miembros[i % len(miembros)] if miembros else None
                if not u:
                    break
                setattr(obj, campo, u)
                obj.save(update_fields=[campo])
                registrar_actividad(obj, admin, "ASIGNO", f"asignó a {u.get_full_name() or u.username}")
                notificar([u], emp, admin, "ASIGNACION", f"Te asignaron: {verbo_desc}", obj=obj)
                n += 1
            return n

        asignadas = 0
        asignadas += repartir(NoConformidad.objects.filter(empresa=emp), "responsable_user", "una no conformidad")
        asignadas += repartir(Riesgo.objects.filter(empresa=emp), "responsable_user", "un riesgo")
        asignadas += repartir(ObjetivoCalidad.objects.filter(empresa=emp), "responsable_user", "un objetivo de calidad")
        asignadas += repartir(Auditoria.objects.filter(empresa=emp), "auditor_lider_user", "una auditoría")
        asignadas += repartir(Capacitacion.objects.filter(empresa=emp), "responsable_user", "una capacitación")
        asignadas += repartir(Equipo.objects.filter(empresa=emp, requiere_calibracion=True), "responsable_user", "una calibración")

        # 2) Comentarios demo con @menciones en las primeras NC.
        frases = [
            "Ya revisé la evidencia, falta el soporte fotográfico. @{m}",
            "Propongo cerrar esto la próxima semana. @{m} ¿lo validas?",
            "Actualicé el análisis de causa raíz, favor de revisar.",
            "Coordinemos con producción antes de implementar la acción. @{m}",
        ]
        coment = 0
        ncs = list(NoConformidad.objects.filter(empresa=emp)[:4])
        otros = [u for u in miembros if admin and u.id != admin.id]
        from django.contrib.contenttypes.models import ContentType
        ct_nc = ContentType.objects.get_for_model(NoConformidad)
        for nc in ncs:
            if ComentarioSGC.objects.filter(content_type=ct_nc, object_id=nc.id).exists():
                continue
            mention = RNG.choice(otros) if otros else None
            texto = RNG.choice(frases).format(m=mention.username if mention else "equipo")
            c = ComentarioSGC.objects.create(
                empresa=emp, content_type=ct_nc, object_id=nc.id,
                autor=admin, texto=texto)
            if mention and "@" + mention.username in texto:
                c.menciones.set([mention])
                notificar([mention], emp, admin, "MENCION",
                          "Te mencionaron en un comentario", mensaje=texto[:140], obj=nc)
            registrar_actividad(nc, admin, "COMENTO", "comentó")
            coment += 1

        self.stdout.write(self.style.SUCCESS(
            f"Colaboración SGC: {len(miembros)} miembros, {asignadas} asignaciones, {coment} comentarios."))
