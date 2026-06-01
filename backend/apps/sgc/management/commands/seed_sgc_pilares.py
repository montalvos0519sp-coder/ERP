"""Datos demo de los Pilares 2-4 del SGC: tablero de implementación,
acciones CAPA, procesos SIPOC y mediciones históricas de KPIs.

Idempotente. Uso:  python manage.py seed_sgc_pilares [--empresa 1]
"""
from __future__ import annotations

import random
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.core.models import Empresa
from apps.sgc.models import (
    AccionCAPA, IndicadorKPI, MedicionKPI, NoConformidad, Proceso, Riesgo,
    RequisitoISO, TareaImplementacion,
)
from apps.sgc.servicios import miembros_empresa, notificar, registrar_actividad

User = get_user_model()
RNG = random.Random(11)


class Command(BaseCommand):
    help = "Siembra datos demo de los pilares 2-4 del SGC."

    def add_arguments(self, parser):
        parser.add_argument("--empresa", type=int, default=None)

    def handle(self, *args, **o):
        emp = Empresa.objects.filter(id=o["empresa"]).first() if o["empresa"] else Empresa.objects.first()
        if not emp:
            self.stderr.write(self.style.ERROR("No hay empresa.")); return
        miembros = list(miembros_empresa(emp))
        admin = User.objects.filter(username="admin").first() or (miembros[0] if miembros else None)
        hoy = date.today()

        # ── Pilar 2 · Tablero de implementación ──
        reqs = list(RequisitoISO.objects.select_related("norma"))
        existentes = set(
            TareaImplementacion.objects.filter(empresa=emp).values_list("requisito_id", flat=True))
        cols = ["POR_HACER", "POR_HACER", "EN_PROCESO", "EN_PROCESO", "IMPLEMENTADO", "VERIFICADO"]
        avance_col = {"POR_HACER": 0, "EN_PROCESO": 50, "IMPLEMENTADO": 90, "VERIFICADO": 100}
        tareas = 0
        for i, req in enumerate(reqs):
            if req.id in existentes:
                continue
            col = RNG.choice(cols)
            u = miembros[i % len(miembros)] if miembros else None
            TareaImplementacion.objects.create(
                empresa=emp, requisito=req, titulo=f"{req.clausula} · {req.titulo}",
                descripcion=f"Implementar el requisito {req.clausula} de {req.norma.codigo}.",
                columna=col, avance=avance_col[col], prioridad=RNG.choice(["ALTA", "MEDIA", "MEDIA", "BAJA"]),
                responsable_user=u, creado_por=admin,
                fecha_limite=hoy + timedelta(days=RNG.randint(10, 90)),
            )
            tareas += 1

        # ── Pilar 3 · Acciones CAPA en las primeras NC ──
        acciones = 0
        descs = [
            "Capacitar al personal en el procedimiento actualizado.",
            "Actualizar el formato y publicarlo en gestión documental.",
            "Implementar verificación doble en el punto crítico.",
            "Revisar y ajustar el control del proceso.",
        ]
        for nc in NoConformidad.objects.filter(empresa=emp)[:6]:
            if nc.acciones.exists():
                continue
            for j in range(RNG.randint(1, 3)):
                u = RNG.choice(miembros) if miembros else None
                est = RNG.choice(["PENDIENTE", "EN_PROCESO", "HECHA", "VERIFICADA"])
                AccionCAPA.objects.create(
                    no_conformidad=nc, descripcion=RNG.choice(descs),
                    tipo=RNG.choice(["INMEDIATA", "CORRECTIVA", "PREVENTIVA"]),
                    responsable_user=u, fecha_compromiso=hoy + timedelta(days=RNG.randint(-10, 30)),
                    fecha_real=hoy if est in ("HECHA", "VERIFICADA") else None,
                    estado=est, eficacia="EFICAZ" if est == "VERIFICADA" else "PENDIENTE", orden=j,
                )
                acciones += 1

        # ── Pilar 4 · Procesos SIPOC ──
        procesos_def = [
            ("PE-01", "Planeación Estratégica", "ESTRATEGICO", "Dirección, mercado", "Análisis FODA, metas", "Definir objetivos y políticas", "Plan estratégico, objetivos", "Toda la organización"),
            ("PC-01", "Gestión Comercial / Ventas", "CLAVE", "Clientes, marketing", "Solicitudes, cotizaciones", "Cotizar, negociar, cerrar", "Pedidos confirmados", "Operaciones, clientes"),
            ("PC-02", "Operación / Transporte", "CLAVE", "Ventas, almacén", "Pedidos, unidades, operadores", "Planear ruta, transportar, entregar", "Servicio entregado", "Clientes"),
            ("PC-03", "Compras y Proveedores", "CLAVE", "Proveedores", "Requisiciones", "Cotizar, ordenar, recibir", "Insumos disponibles", "Operación, mantenimiento"),
            ("PA-01", "Recursos Humanos", "APOYO", "Áreas, candidatos", "Vacantes, perfiles", "Reclutar, capacitar, evaluar", "Personal competente", "Todos los procesos"),
            ("PA-02", "Mantenimiento", "APOYO", "Operación", "Órdenes de servicio", "Diagnosticar, reparar, prevenir", "Equipos operativos", "Operación"),
        ]
        procesos = {}
        for cod, nom, tipo, s, i, p, out, c in procesos_def:
            obj, _ = Proceso.objects.get_or_create(
                empresa=emp, nombre=nom,
                defaults={
                    "codigo": cod, "tipo": tipo, "objetivo": f"Asegurar la eficacia de {nom.lower()}.",
                    "dueno_user": RNG.choice(miembros) if miembros else None,
                    "proveedores": s, "entradas": i, "actividades": p, "salidas": out, "clientes": c,
                },
            )
            procesos[cod] = obj
        # Enlaza KPIs y riesgos a procesos.
        plist = list(procesos.values())
        for k in IndicadorKPI.objects.filter(empresa=emp):
            if not k.proceso_ref_id and plist:
                k.proceso_ref = RNG.choice(plist); k.save(update_fields=["proceso_ref"])
        for r in Riesgo.objects.filter(empresa=emp):
            if not r.proceso_ref_id and plist:
                r.proceso_ref = RNG.choice(plist); r.save(update_fields=["proceso_ref"])

        # ── Pilar 4 · Mediciones históricas de KPIs (tendencia) ──
        mediciones = 0
        for k in IndicadorKPI.objects.filter(empresa=emp):
            if k.mediciones.exists():
                continue
            meta = float(k.meta or 100)
            base = meta * (0.7 if k.sentido == "MAYOR" else 1.3)
            for m in range(6):
                f = (hoy.replace(day=1) - timedelta(days=30 * (5 - m)))
                # Tendencia que converge hacia la meta + ruido.
                val = base + (meta - base) * (m / 5) + RNG.uniform(-meta * 0.05, meta * 0.05)
                MedicionKPI.objects.create(
                    kpi=k, fecha=f, valor=Decimal(str(round(max(val, 0), 2))),
                    registrado_por=admin, nota="Medición demo")
                mediciones += 1
            ultima = k.mediciones.order_by("-fecha").first()
            if ultima:
                k.valor_actual = ultima.valor; k.save(update_fields=["valor_actual"])

        self.stdout.write(self.style.SUCCESS(
            f"Pilares 2-4: {tareas} tarjetas, {acciones} acciones CAPA, "
            f"{len(procesos)} procesos, {mediciones} mediciones KPI."))
