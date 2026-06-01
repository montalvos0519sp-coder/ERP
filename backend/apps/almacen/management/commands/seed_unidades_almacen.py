"""Siembra las unidades de medida estandar para una o todas las empresas.

Uso:
    python manage.py seed_unidades_almacen              # todas las empresas
    python manage.py seed_unidades_almacen --empresa 1   # solo la empresa id=1

Es idempotente: usa get_or_create por (empresa, codigo), asi que correrlo
varias veces no duplica registros ni pisa los que el usuario haya editado.
"""
from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.almacen.models import UnidadMedida
from apps.core.models import Empresa

# (codigo, nombre, abreviatura, tipo). Catalogo base alineado al uso comun
# en Mexico (compatible con las claves de unidad del SAT mas frecuentes).
UNIDADES = [
    ("PZA",   "Pieza",            "pza", "CANTIDAD"),
    ("SERV",  "Servicio",         "serv", "CANTIDAD"),
    ("CAJA",  "Caja",             "caja", "CANTIDAD"),
    ("PAQ",   "Paquete",          "paq", "CANTIDAD"),
    ("PAR",   "Par",              "par", "CANTIDAD"),
    ("DOC",   "Docena",           "doc", "CANTIDAD"),
    ("KIT",   "Kit",              "kit", "CANTIDAD"),
    ("BULTO", "Bulto",            "bul", "CANTIDAD"),
    ("ROLLO", "Rollo",            "rll", "CANTIDAD"),
    ("KG",    "Kilogramo",        "kg",  "PESO"),
    ("G",     "Gramo",            "g",   "PESO"),
    ("TON",   "Tonelada",         "ton", "PESO"),
    ("LB",    "Libra",            "lb",  "PESO"),
    ("LT",    "Litro",            "lt",  "VOLUMEN"),
    ("ML",    "Mililitro",        "ml",  "VOLUMEN"),
    ("GAL",   "Galon",            "gal", "VOLUMEN"),
    ("M3",    "Metro cubico",     "m3",  "VOLUMEN"),
    ("TAMBO", "Tambor",           "tmb", "VOLUMEN"),
    ("M",     "Metro",            "m",   "LONGITUD"),
    ("CM",    "Centimetro",       "cm",  "LONGITUD"),
    ("MM",    "Milimetro",        "mm",  "LONGITUD"),
    ("M2",    "Metro cuadrado",   "m2",  "AREA"),
    ("HR",    "Hora",             "hr",  "TIEMPO"),
    ("DIA",   "Dia",              "dia", "TIEMPO"),
]


class Command(BaseCommand):
    help = "Crea las unidades de medida estandar del almacen para las empresas."

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

        total_creadas = 0
        for empresa in empresas:
            creadas = 0
            for codigo, nombre, abrev, tipo in UNIDADES:
                _, created = UnidadMedida.objects.get_or_create(
                    empresa=empresa,
                    codigo=codigo,
                    defaults={
                        "nombre": nombre,
                        "abreviatura": abrev,
                        "tipo": tipo,
                        "factor_conversion": 1,
                        "activo": True,
                    },
                )
                creadas += int(created)
            total_creadas += creadas
            self.stdout.write(
                f"  {empresa.nombre_comercial}: {creadas} nuevas "
                f"({len(UNIDADES) - creadas} ya existian)."
            )

        self.stdout.write(self.style.SUCCESS(
            f"Listo. {total_creadas} unidades de medida creadas en total."
        ))
