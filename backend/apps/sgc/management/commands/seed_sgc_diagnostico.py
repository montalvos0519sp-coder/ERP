"""Completa el diagnóstico ISO 9001 evaluando TODOS los requisitos (cláusulas
4-10) con un perfil realista por capítulo, para que el radar de madurez y el
cumplimiento por capítulo se vean completos.

Idempotente: actualiza la evaluación existente o la crea.

Uso:  python manage.py seed_sgc_diagnostico [--empresa 1]
"""
from __future__ import annotations

import random

from django.core.management.base import BaseCommand

from apps.core.models import Empresa
from apps.sgc.models import EvaluacionRequisito, RequisitoISO

RNG = random.Random(23)

# Distribución de niveles por capítulo ISO (probabilidades SI/PARCIAL/NO).
# Refleja un SGC en marcha: fuerte en contexto y operación, más débil donde
# suele faltar evidencia (planificación de cambios, evaluación, mejora).
PERFIL = {
    "4": [("SI", 0.7), ("PARCIAL", 0.25), ("NO", 0.05)],   # Contexto
    "5": [("SI", 0.6), ("PARCIAL", 0.3), ("NO", 0.1)],     # Liderazgo
    "6": [("SI", 0.45), ("PARCIAL", 0.4), ("NO", 0.15)],   # Planificación
    "7": [("SI", 0.55), ("PARCIAL", 0.35), ("NO", 0.1)],   # Apoyo
    "8": [("SI", 0.6), ("PARCIAL", 0.3), ("NO", 0.1)],     # Operación
    "9": [("SI", 0.5), ("PARCIAL", 0.35), ("NO", 0.15)],   # Evaluación
    "10": [("SI", 0.5), ("PARCIAL", 0.35), ("NO", 0.15)],  # Mejora
}
EVIDENCIA = {
    "SI": "Proceso documentado e implementado; evidencia disponible y vigente.",
    "PARCIAL": "Implementado parcialmente; falta formalizar o actualizar evidencia.",
    "NO": "Pendiente de definir e implementar.",
}


def elegir(cap: str) -> str:
    dist = PERFIL.get(cap, PERFIL["7"])
    r = RNG.random()
    acc = 0.0
    for nivel, p in dist:
        acc += p
        if r <= acc:
            return nivel
    return dist[-1][0]


class Command(BaseCommand):
    help = "Completa el diagnóstico ISO evaluando todos los requisitos por capítulo."

    def add_arguments(self, parser):
        parser.add_argument("--empresa", type=int, default=None)

    def handle(self, *args, **o):
        emp = Empresa.objects.filter(id=o["empresa"]).first() if o["empresa"] else Empresa.objects.first()
        if not emp:
            self.stderr.write(self.style.ERROR("No hay empresa.")); return

        reqs = list(RequisitoISO.objects.select_related("norma").all())
        if not reqs:
            self.stderr.write(self.style.WARNING("No hay requisitos ISO. Corre seed_iso9001 primero.")); return

        creados = actualizados = 0
        por_cap: dict[str, int] = {}
        for r in reqs:
            cap = (r.clausula or "0").split(".")[0]
            nivel = elegir(cap)
            por_cap[cap] = por_cap.get(cap, 0) + 1
            _, created = EvaluacionRequisito.objects.update_or_create(
                empresa=emp, requisito=r,
                defaults={"cumple": nivel, "evidencia": EVIDENCIA[nivel],
                          "observaciones": "" if nivel == "SI" else "Acción requerida para cerrar la brecha."},
            )
            if created:
                creados += 1
            else:
                actualizados += 1

        resumen = ", ".join(f"cap {k}: {v}" for k, v in sorted(por_cap.items(), key=lambda x: int(x[0])))
        self.stdout.write(self.style.SUCCESS(
            f"Diagnóstico completo: {creados} creados, {actualizados} actualizados ({len(reqs)} requisitos). {resumen}"))
