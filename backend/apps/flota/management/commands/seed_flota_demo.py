"""Carga unidades y termos de ejemplo para ver el Tablero Preventivo poblado.

Uso:
    python manage.py seed_flota_demo               # empresa 1 por defecto
    python manage.py seed_flota_demo --empresa 1

Idempotente: get_or_create por (empresa, numero). Genera estados variados
(OK / Próximo / Vencido) para el tablero de mantenimiento preventivo.
"""
from __future__ import annotations

from datetime import date

from django.core.management.base import BaseCommand

from apps.core.models import Empresa
from apps.flota.models import Termo, Unidad

# numero, placas, tipo, km_actual, intervalo_km, km_ultimo_servicio
UNIDADES = [
    ("R-228", "ABC-228", "Tractor", 105691, 10000, 96198),
    ("R-173", "ABC-173", "Tractor", 297080, 20000, 277888),
    ("R-231", "ABC-231", "Tractor", 100547, 10000, 91390),
    ("R-233", "ABC-233", "Tractor",  61991, 15000, 47967),
    ("R-185", "ABC-185", "Tractor", 278311, 20000, 259357),
    ("R-211", "ABC-211", "Tractor", 163418, 10000, 154564),
    ("R-104", "ABC-104", "Tractor",  84258, 10000, 76027),
    ("R-301", "ABC-301", "Tractor",  51000, 10000, 50000),   # OK (lejano)
    ("R-300", "ABC-300", "Tractor", 211000, 10000, 200000),  # VENCIDO
]

# numero, marca, horas_actual, intervalo_horas, horas_ultimo_servicio
TERMOS = [
    ("R-184", "Thermo King T-1090", 21030, 1200, 20000),  # Próximo
    ("R-190", "Thermo King T-1090", 19808, 1200, 18800),  # OK
    ("R-194", "Thermo King T-1090", 17805, 1200, 16800),  # OK
    ("R-151", "Carrier Supra 960",  21055, 1200, 20441),  # OK
    ("R-161", "Carrier Supra 960",  39758, 1200, 39158),  # OK
    ("R-199", "Thermo King T-1090", 13300, 1200, 12000),  # VENCIDO (-100)
]


class Command(BaseCommand):
    help = "Carga unidades y termos demo para el tablero preventivo."

    def add_arguments(self, parser):
        parser.add_argument("--empresa", type=int, default=None)

    def handle(self, *args, **options):
        emp = Empresa.objects.filter(id=options["empresa"]).first() if options["empresa"] else Empresa.objects.first()
        if not emp:
            self.stderr.write(self.style.ERROR("No hay empresa."))
            return

        hoy = date.today()
        nu = nt = 0
        for numero, placas, tipo, actual, intervalo, ultimo in UNIDADES:
            obj, created = Unidad.objects.get_or_create(
                empresa=emp, numero=numero,
                defaults={"placas": placas, "tipo": tipo},
            )
            obj.km_actual = actual
            obj.intervalo_km_preventivo = intervalo
            obj.km_ultimo_servicio = ultimo
            obj.fecha_ultimo_servicio = hoy
            obj.activo = True
            obj.save()
            nu += int(created)

        for numero, marca, actual, intervalo, ultimo in TERMOS:
            obj, created = Termo.objects.get_or_create(
                empresa=emp, numero=numero,
                defaults={"marca": marca},
            )
            obj.marca = marca
            obj.horas_actual = actual
            obj.intervalo_horas_preventivo = intervalo
            obj.horas_ultimo_servicio = ultimo
            obj.fecha_ultimo_servicio = hoy
            obj.activo = True
            obj.save()
            nt += int(created)

        self.stdout.write(self.style.SUCCESS(
            f"Listo en {emp.nombre_comercial}: {len(UNIDADES)} unidades ({nu} nuevas), "
            f"{len(TERMOS)} termos ({nt} nuevos)."
        ))
