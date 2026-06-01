"""Carga la norma ISO 9001:2015 y sus requisitos (cláusulas 4-10) para el
diagnóstico / gap analysis. Idempotente."""
from __future__ import annotations

from django.core.management.base import BaseCommand

from apps.sgc.models import Norma, RequisitoISO

# (clausula, titulo)
REQUISITOS = [
    ("4.1", "Comprensión de la organización y su contexto"),
    ("4.2", "Comprensión de las necesidades y expectativas de las partes interesadas"),
    ("4.3", "Determinación del alcance del SGC"),
    ("4.4", "Sistema de gestión de la calidad y sus procesos"),
    ("5.1", "Liderazgo y compromiso"),
    ("5.2", "Política de calidad"),
    ("5.3", "Roles, responsabilidades y autoridades"),
    ("6.1", "Acciones para abordar riesgos y oportunidades"),
    ("6.2", "Objetivos de la calidad y planificación para lograrlos"),
    ("6.3", "Planificación de los cambios"),
    ("7.1", "Recursos (personas, infraestructura, ambiente, seguimiento y medición)"),
    ("7.2", "Competencia"),
    ("7.3", "Toma de conciencia"),
    ("7.4", "Comunicación"),
    ("7.5", "Información documentada"),
    ("8.1", "Planificación y control operacional"),
    ("8.2", "Requisitos para los productos y servicios"),
    ("8.3", "Diseño y desarrollo de productos y servicios"),
    ("8.4", "Control de procesos, productos y servicios suministrados externamente"),
    ("8.5", "Producción y provisión del servicio"),
    ("8.6", "Liberación de los productos y servicios"),
    ("8.7", "Control de las salidas no conformes"),
    ("9.1", "Seguimiento, medición, análisis y evaluación"),
    ("9.2", "Auditoría interna"),
    ("9.3", "Revisión por la dirección"),
    ("10.1", "Mejora — generalidades"),
    ("10.2", "No conformidad y acción correctiva"),
    ("10.3", "Mejora continua"),
]


class Command(BaseCommand):
    help = "Carga ISO 9001:2015 y sus requisitos para el diagnóstico."

    def handle(self, *args, **options):
        norma, _ = Norma.objects.get_or_create(
            codigo="ISO 9001:2015",
            defaults={"nombre": "Sistemas de gestión de la calidad — Requisitos"},
        )
        creados = 0
        for i, (clausula, titulo) in enumerate(REQUISITOS):
            _, c = RequisitoISO.objects.get_or_create(
                norma=norma, clausula=clausula,
                defaults={"titulo": titulo, "orden": i},
            )
            creados += int(c)
        self.stdout.write(self.style.SUCCESS(
            f"ISO 9001:2015 lista: {len(REQUISITOS)} requisitos ({creados} nuevos)."
        ))
