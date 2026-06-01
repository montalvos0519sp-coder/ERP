"""Datos demo del SGC: diagnóstico parcial, NC, riesgos, KPIs, auditorías,
capacitaciones, equipos, evaluaciones de proveedor y quejas. Idempotente."""
from __future__ import annotations

from datetime import date, timedelta

from django.core.management.base import BaseCommand

from apps.core.models import Empresa
from apps.cxp.models import Proveedor
from apps.sgc.models import (
    Auditoria, Capacitacion, Equipo, EvaluacionProveedor, EvaluacionRequisito,
    Hallazgo, IndicadorKPI, NoConformidad, Norma, Queja, RequisitoISO, Riesgo,
)


class Command(BaseCommand):
    help = "Carga datos demo del SGC."

    def add_arguments(self, parser):
        parser.add_argument("--empresa", type=int, default=None)

    def handle(self, *args, **o):
        emp = Empresa.objects.filter(id=o["empresa"]).first() if o["empresa"] else Empresa.objects.first()
        if not emp:
            self.stderr.write(self.style.ERROR("No hay empresa.")); return
        hoy = date.today()

        # Diagnóstico: evaluar ~70% de los requisitos con niveles variados.
        reqs = list(RequisitoISO.objects.all())
        niveles = ["SI", "SI", "PARCIAL", "NO", "SI", "PARCIAL", "SI"]
        for i, r in enumerate(reqs):
            if i % 10 == 9:  # deja algunos sin evaluar
                continue
            EvaluacionRequisito.objects.update_or_create(
                empresa=emp, requisito=r,
                defaults={"cumple": niveles[i % len(niveles)],
                          "observaciones": "Falta evidencia documentada." if niveles[i % len(niveles)] in ("NO", "PARCIAL") else ""},
            )

        # No conformidades
        ncs = [
            ("CORRECTIVA", "AUDITORIA", "Procedimiento de calibración sin registros recientes", "ABIERTA", 10),
            ("PREVENTIVA", "PROCESO", "Riesgo de desabasto de refacciones críticas", "EN_PROCESO", 20),
            ("CORRECTIVA", "QUEJA", "Entrega tardía a cliente por falta de planeación", "CERRADA", -5),
            ("MEJORA", "OTRO", "Digitalizar formatos de inspección", "ABIERTA", 30),
        ]
        for i, (tipo, origen, desc, estado, dias) in enumerate(ncs):
            NoConformidad.objects.get_or_create(
                empresa=emp, folio=f"NC-{i+1:03d}",
                defaults={"tipo": tipo, "origen": origen, "descripcion": desc, "estado": estado,
                          "responsable": "Coordinador de Calidad", "fecha_compromiso": hoy + timedelta(days=dias),
                          "causa_raiz": "Análisis de 5 porqués pendiente." if estado != "CERRADA" else "Falta de seguimiento.",
                          "accion": "Definir e implementar acción."},
            )

        # Riesgos
        riesgos = [
            ("Operaciones", "Falla mecánica de unidad en ruta", 4, 5),
            ("Compras", "Proveedor único de refacción crítica", 3, 4),
            ("Calidad", "Producto no conforme entregado", 2, 5),
            ("RH", "Rotación de personal clave", 3, 3),
            ("TI", "Pérdida de datos por falta de respaldo", 2, 4),
        ]
        for proc, desc, p, imp in riesgos:
            Riesgo.objects.get_or_create(
                empresa=emp, descripcion=desc,
                defaults={"proceso": proc, "probabilidad": p, "impacto": imp,
                          "controles": "Control existente parcial.", "plan_mitigacion": "Plan en definición.",
                          "responsable": "Líder de proceso", "estado": "EN_TRATAMIENTO"},
            )

        # KPIs
        kpis = [
            ("Entregas a tiempo", "Operaciones", "%", 95, 92, "MAYOR"),
            ("Satisfacción del cliente", "Calidad", "%", 90, 94, "MAYOR"),
            ("No conformidades por mes", "Calidad", "NC", 2, 4, "MENOR"),
            ("Disponibilidad de flota", "Mantenimiento", "%", 90, 88, "MAYOR"),
            ("Capacitación completada", "RH", "%", 100, 75, "MAYOR"),
        ]
        for nombre, proc, uni, meta, val, sentido in kpis:
            IndicadorKPI.objects.get_or_create(
                empresa=emp, nombre=nombre,
                defaults={"proceso": proc, "unidad": uni, "meta": meta, "valor_actual": val,
                          "sentido": sentido, "frecuencia": "Mensual", "responsable": "Dueño del proceso"},
            )

        # Auditorías + hallazgos
        norma = Norma.objects.filter(codigo__startswith="ISO 9001").first()
        aud, _ = Auditoria.objects.get_or_create(
            empresa=emp, titulo="Auditoría interna anual 2026",
            defaults={"norma": norma, "tipo": "INTERNA", "alcance": "Todos los procesos del SGC",
                      "auditor_lider": "Aud. Líder Interno", "fecha_programada": hoy + timedelta(days=15), "estado": "PROGRAMADA"},
        )
        if not aud.hallazgos.exists():
            Hallazgo.objects.create(auditoria=aud, tipo="OBSERVACION", descripcion="Actualizar matriz de riesgos.")
            Hallazgo.objects.create(auditoria=aud, tipo="OPORTUNIDAD", descripcion="Automatizar indicadores.")
        Auditoria.objects.get_or_create(
            empresa=emp, titulo="Auditoría de seguimiento Q1",
            defaults={"norma": norma, "tipo": "INTERNA", "fecha_programada": hoy - timedelta(days=30),
                      "fecha_realizada": hoy - timedelta(days=28), "estado": "CERRADA", "auditor_lider": "Aud. Interno"},
        )

        # Capacitaciones
        caps = [
            ("Inducción ISO 9001", hoy - timedelta(days=10), "IMPARTIDA", 95),
            ("Manejo defensivo", hoy + timedelta(days=20), "PROGRAMADA", None),
            ("Primeros auxilios", hoy - timedelta(days=400), "VENCIDA", 88),
        ]
        for curso, f, estado, calif in caps:
            Capacitacion.objects.get_or_create(
                empresa=emp, curso=curso,
                defaults={"fecha": f, "estado": estado, "instructor": "Instructor externo",
                          "participantes": "Operadores y administrativos", "calificacion": calif,
                          "fecha_vencimiento": (f + timedelta(days=365)) if f else None},
            )

        # Equipos / calibración
        equipos = [
            ("EQ-001", "Báscula de plataforma", hoy - timedelta(days=200), 12),
            ("EQ-002", "Manómetro digital", hoy - timedelta(days=400), 12),  # vencido
            ("EQ-003", "Termómetro infrarrojo", hoy - timedelta(days=30), 6),
        ]
        for cod, nom, ult, freq in equipos:
            Equipo.objects.get_or_create(
                empresa=emp, codigo=cod,
                defaults={"nombre": nom, "fecha_ultima_calibracion": ult, "frecuencia_meses": freq,
                          "fecha_proxima_calibracion": ult + timedelta(days=freq * 30), "ubicacion": "Taller"},
            )

        # Evaluación de proveedores
        for prov in Proveedor.objects.filter(empresa=emp)[:4]:
            EvaluacionProveedor.objects.get_or_create(
                empresa=emp, proveedor=prov, periodo="2026-Q1",
                defaults={"calidad": 85, "tiempo_entrega": 80, "servicio": 90, "documentacion": 75,
                          "comentarios": "Cumple en general; mejorar documentación."},
            )

        # Quejas
        quejas = [
            ("QUEJA", "Cliente A", "Producto recibido con daño en empaque", "ABIERTA", None),
            ("FELICITACION", "Cliente B", "Excelente atención del equipo de ventas", "RESUELTA", 5),
            ("RECLAMO", "Cliente C", "Factura con datos incorrectos", "EN_PROCESO", 3),
        ]
        for i, (tipo, cli, desc, estado, sat) in enumerate(quejas):
            Queja.objects.get_or_create(
                empresa=emp, folio=f"Q-{i+1:03d}",
                defaults={"tipo": tipo, "cliente": cli, "descripcion": desc, "estado": estado, "satisfaccion": sat},
            )

        self.stdout.write(self.style.SUCCESS(f"Datos demo del SGC cargados en {emp.nombre_comercial}."))
