# -*- coding: utf-8 -*-
"""Habilita el sistema multi-norma: carga ISO 14001:2015 (ambiental) e
ISO 45001:2018 (seguridad y salud) con sus requisitos por cláusula, para
permitir sistemas de gestión integrados. Idempotente.

Uso:  python manage.py seed_normas_extra
"""
from __future__ import annotations

from django.core.management.base import BaseCommand

from apps.sgc.models import Norma, RequisitoISO

# Requisitos clave (cláusula, título) — estructura de alto nivel común ISO.
REQ_14001 = [
    ("4.1", "Comprensión de la organización y su contexto"),
    ("4.2", "Necesidades y expectativas de las partes interesadas"),
    ("4.3", "Alcance del sistema de gestión ambiental"),
    ("4.4", "Sistema de gestión ambiental"),
    ("5.1", "Liderazgo y compromiso"),
    ("5.2", "Política ambiental"),
    ("5.3", "Roles, responsabilidades y autoridades"),
    ("6.1", "Acciones para abordar riesgos y oportunidades (aspectos ambientales)"),
    ("6.1.2", "Aspectos ambientales"),
    ("6.1.3", "Requisitos legales y otros requisitos"),
    ("6.2", "Objetivos ambientales y planificación"),
    ("7.1", "Recursos"),
    ("7.2", "Competencia"),
    ("7.3", "Toma de conciencia"),
    ("7.4", "Comunicación"),
    ("7.5", "Información documentada"),
    ("8.1", "Planificación y control operacional"),
    ("8.2", "Preparación y respuesta ante emergencias"),
    ("9.1", "Seguimiento, medición, análisis y evaluación"),
    ("9.1.2", "Evaluación del cumplimiento legal"),
    ("9.2", "Auditoría interna"),
    ("9.3", "Revisión por la dirección"),
    ("10.2", "No conformidad y acción correctiva"),
    ("10.3", "Mejora continua"),
]

REQ_45001 = [
    ("4.1", "Comprensión de la organización y su contexto"),
    ("4.2", "Necesidades y expectativas de los trabajadores y partes interesadas"),
    ("4.3", "Alcance del sistema de gestión de SST"),
    ("4.4", "Sistema de gestión de SST"),
    ("5.1", "Liderazgo y compromiso"),
    ("5.2", "Política de SST"),
    ("5.3", "Roles, responsabilidades y autoridades"),
    ("5.4", "Consulta y participación de los trabajadores"),
    ("6.1", "Acciones para abordar riesgos y oportunidades"),
    ("6.1.2", "Identificación de peligros y evaluación de riesgos"),
    ("6.1.3", "Determinación de requisitos legales y otros"),
    ("6.2", "Objetivos de SST y planificación"),
    ("7.1", "Recursos"),
    ("7.2", "Competencia"),
    ("7.3", "Toma de conciencia"),
    ("7.4", "Comunicación"),
    ("7.5", "Información documentada"),
    ("8.1", "Planificación y control operacional"),
    ("8.1.2", "Eliminar peligros y reducir riesgos"),
    ("8.2", "Preparación y respuesta ante emergencias"),
    ("9.1", "Seguimiento, medición, análisis y evaluación del desempeño"),
    ("9.2", "Auditoría interna"),
    ("9.3", "Revisión por la dirección"),
    ("10.2", "Incidentes, no conformidades y acciones correctivas"),
    ("10.3", "Mejora continua"),
]

NORMAS = [
    ("ISO 14001:2015", "Sistemas de gestión ambiental - Requisitos", REQ_14001),
    ("ISO 45001:2018", "Sistemas de gestión de la seguridad y salud en el trabajo", REQ_45001),
]


class Command(BaseCommand):
    help = "Carga ISO 14001 e ISO 45001 (sistema multi-norma)."

    def handle(self, *args, **o):
        total_req = 0
        for codigo, nombre, requisitos in NORMAS:
            norma, _ = Norma.objects.get_or_create(
                codigo=codigo, defaults={"nombre": nombre, "activa": True})
            if not norma.nombre:
                norma.nombre = nombre
                norma.save(update_fields=["nombre"])
            for orden, (clausula, titulo) in enumerate(requisitos):
                _, created = RequisitoISO.objects.get_or_create(
                    norma=norma, clausula=clausula,
                    defaults={"titulo": titulo, "orden": orden})
                if created:
                    total_req += 1
        self.stdout.write(self.style.SUCCESS(
            f"Multi-norma habilitado: ISO 14001 e ISO 45001 cargadas ({total_req} requisitos nuevos)."))
