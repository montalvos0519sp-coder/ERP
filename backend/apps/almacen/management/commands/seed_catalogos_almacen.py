"""Siembra categorias y marcas base del almacen para una o todas las empresas.

Uso:
    python manage.py seed_catalogos_almacen              # todas las empresas
    python manage.py seed_catalogos_almacen --empresa 1   # solo la empresa id=1

Idempotente: get_or_create por (empresa, codigo). Catalogo orientado a una
operacion de transporte/flota (refacciones, llantas, lubricantes, etc.),
acorde a los modulos del ERP. Ajustable libremente desde el frontend despues.
"""
from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.almacen.models import CategoriaProducto, MarcaProducto
from apps.core.models import Empresa

# (codigo, nombre)
CATEGORIAS = [
    ("REF",    "Refacciones"),
    ("LLANTA", "Llantas y neumaticos"),
    ("LUB",    "Lubricantes y aceites"),
    ("FILTRO", "Filtros"),
    ("FRENOS", "Sistema de frenos"),
    ("ELEC",   "Material electrico"),
    ("HERR",   "Herramienta"),
    ("EPP",    "Equipo de proteccion (EPP)"),
    ("CONS",   "Consumibles"),
    ("LIMP",   "Limpieza"),
    ("PAPEL",  "Papeleria y oficina"),
    ("COMB",   "Combustibles"),
    ("GRAL",   "General / Otros"),
]

# (codigo, nombre)
MARCAS = [
    ("GEN",    "Generico"),
    ("BOSCH",  "Bosch"),
    ("MICH",   "Michelin"),
    ("GY",     "Goodyear"),
    ("BRIDG",  "Bridgestone"),
    ("SHELL",  "Shell"),
    ("MOBIL",  "Mobil"),
    ("CASTROL","Castrol"),
    ("FLEET",  "Fleetguard"),
    ("WIX",    "WIX Filters"),
    ("MERCEDES","Mercedes-Benz"),
    ("VOLVO",  "Volvo"),
    ("KENW",   "Kenworth"),
    ("FREIGHT","Freightliner"),
    ("CAT",    "Caterpillar"),
    ("CUMMINS","Cummins"),
    ("3M",     "3M"),
    ("TRUPER", "Truper"),
]


class Command(BaseCommand):
    help = "Crea categorias y marcas base del almacen para las empresas."

    def add_arguments(self, parser):
        parser.add_argument(
            "--empresa", type=int, default=None,
            help="ID de empresa especifica. Si se omite, aplica a todas.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        empresas = Empresa.objects.all()
        if options["empresa"]:
            empresas = empresas.filter(id=options["empresa"])
        if not empresas.exists():
            self.stderr.write(self.style.ERROR("No hay empresas que coincidan."))
            return

        tot_cat = tot_marca = 0
        for empresa in empresas:
            cat_n = marca_n = 0
            for codigo, nombre in CATEGORIAS:
                _, created = CategoriaProducto.objects.get_or_create(
                    empresa=empresa, codigo=codigo,
                    defaults={"nombre": nombre, "activo": True},
                )
                cat_n += int(created)
            for codigo, nombre in MARCAS:
                _, created = MarcaProducto.objects.get_or_create(
                    empresa=empresa, codigo=codigo,
                    defaults={"nombre": nombre, "activo": True},
                )
                marca_n += int(created)
            tot_cat += cat_n
            tot_marca += marca_n
            self.stdout.write(
                f"  {empresa.nombre_comercial}: "
                f"{cat_n} categorias y {marca_n} marcas nuevas."
            )

        self.stdout.write(self.style.SUCCESS(
            f"Listo. {tot_cat} categorias y {tot_marca} marcas creadas en total."
        ))
