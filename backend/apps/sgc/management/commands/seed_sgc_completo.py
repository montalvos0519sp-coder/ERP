"""Completa TODOS los apartados del SGC que aún estaban vacíos para que el
sistema se vea poblado de extremo a extremo:

  - Contexto FODA (4.1) y Partes interesadas (4.2)
  - Perfiles de puesto + competencias + evaluaciones con brechas (7.2)
  - Gestión de cambios (6.3) con tipo, prioridad, riesgo y plan de acción
  - Matriz de comunicación (7.4)
  - Base de conocimiento organizacional (7.1.6)
  - Lista maestra de registros (7.5.3)
  - Revisión por la dirección (9.3)
  - Programa anual de auditorías (9.2)

Idempotente: no duplica registros si se corre de nuevo.

Uso:  python manage.py seed_sgc_completo [--empresa 1]
"""
from __future__ import annotations

import random
from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.core.models import Empresa
from apps.sgc.models import (
    CompetenciaPerfil, ComunicacionSGC, ConocimientoOrganizacional, ElementoContexto,
    EvaluacionCompetencia, EvaluacionDetalle, GestionCambio, ParteInteresada,
    PerfilPuesto, ProgramaAuditoria, RegistroCalidad, RevisionDireccion,
)

try:
    from apps.sgc.servicios import miembros_empresa
except Exception:  # pragma: no cover
    miembros_empresa = None

User = get_user_model()
RNG = random.Random(7)


class Command(BaseCommand):
    help = "Llena de datos todos los apartados del SGC que estaban vacíos."

    def add_arguments(self, parser):
        parser.add_argument("--empresa", type=int, default=None)

    def handle(self, *args, **o):
        emp = Empresa.objects.filter(id=o["empresa"]).first() if o["empresa"] else Empresa.objects.first()
        if not emp:
            self.stderr.write(self.style.ERROR("No hay empresa.")); return
        hoy = date.today()
        anio = hoy.year

        miembros = []
        if miembros_empresa:
            try:
                miembros = list(miembros_empresa(emp))
            except Exception:
                miembros = []
        if not miembros:
            miembros = list(User.objects.all()[:5])
        admin = User.objects.filter(username="admin").first() or (miembros[0] if miembros else None)
        pick = (lambda i: miembros[i % len(miembros)]) if miembros else (lambda i: None)
        n = dict(foda=0, partes=0, perfiles=0, evals=0, cambios=0, comu=0, conoc=0, reg=0, rev=0, prog=0)

        # ── 1) Contexto FODA (4.1) ──────────────────────────────────────────
        FODA = [
            ("F", "Personal técnico con amplia experiencia en el sector.", "Capitalizar el conocimiento en nuevos proyectos y capacitación interna."),
            ("F", "Cartera de clientes consolidada y recurrente.", "Programas de fidelización y referidos."),
            ("F", "Procesos documentados y certificables.", "Avanzar hacia la certificación ISO 9001."),
            ("D", "Dependencia de pocos proveedores clave.", "Homologar proveedores alternativos."),
            ("D", "Rotación de personal en áreas operativas.", "Plan de retención y desarrollo de talento."),
            ("D", "Indicadores no siempre medidos a tiempo.", "Automatizar la captura de KPIs."),
            ("O", "Demanda creciente de soluciones digitales.", "Desarrollar nueva línea de servicio."),
            ("O", "Apoyos y certificaciones que abren mercado.", "Gestionar la certificación para licitaciones."),
            ("A", "Competencia con precios agresivos.", "Diferenciación por calidad y servicio."),
            ("A", "Cambios regulatorios frecuentes.", "Vigilancia normativa y adaptación rápida."),
        ]
        for i, (tipo, desc, estr) in enumerate(FODA):
            if ElementoContexto.objects.filter(empresa=emp, descripcion=desc).exists():
                continue
            ElementoContexto.objects.create(
                empresa=emp, tipo=tipo, descripcion=desc, estrategia=estr,
                responsable_user=pick(i))
            n["foda"] += 1

        # ── 2) Partes interesadas (4.2) ─────────────────────────────────────
        PARTES = [
            ("Clientes", "CLIENTE", "Calidad constante, entregas a tiempo y buen servicio postventa.", 5, "Encuestas de satisfacción y revisión de quejas."),
            ("Proveedores", "PROVEEDOR", "Pedidos claros, pagos puntuales y relación a largo plazo.", 3, "Evaluación y reuniones de seguimiento."),
            ("Colaboradores", "EMPLEADO", "Ambiente seguro, desarrollo profesional y estabilidad.", 4, "Encuestas de clima y plan de capacitación."),
            ("Accionistas / Dirección", "ACCIONISTA", "Rentabilidad, crecimiento sostenible y bajo riesgo.", 5, "Revisión por la dirección trimestral."),
            ("Autoridades regulatorias", "AUTORIDAD", "Cumplimiento legal y normativo.", 4, "Matriz de requisitos legales y auditorías."),
            ("Comunidad local", "COMUNIDAD", "Operación responsable y respeto al entorno.", 2, "Buenas prácticas ambientales y de seguridad."),
        ]
        for nombre, tipo, nec, infl, seg in PARTES:
            if ParteInteresada.objects.filter(empresa=emp, nombre=nombre).exists():
                continue
            ParteInteresada.objects.create(
                empresa=emp, nombre=nombre, tipo=tipo, necesidades=nec,
                influencia=infl, seguimiento=seg)
            n["partes"] += 1

        # ── 3) Perfiles de puesto + competencias + evaluaciones (7.2) ───────
        PERFILES = [
            dict(puesto="Gerente de Calidad", area="Calidad",
                 funciones="Liderar el SGC, planear auditorías y asegurar la mejora continua.",
                 escolaridad="Licenciatura en Ingeniería", experiencia="3 años en sistemas de gestión",
                 comps=[("ISO 9001:2015", "CONOCIMIENTO", 4, True), ("Auditoría interna", "TECNICA", 3, True),
                        ("Liderazgo de equipos", "BLANDA", 3, True), ("Gestión de riesgos", "CONOCIMIENTO", 3, False),
                        ("Lead Auditor", "CERTIFICACION", 2, False)]),
            dict(puesto="Analista de Procesos", area="Operaciones",
                 funciones="Mapear y optimizar procesos, analizar indicadores.",
                 escolaridad="Ingeniería Industrial", experiencia="1 año en mejora de procesos",
                 comps=[("Mapeo de procesos (SIPOC)", "TECNICA", 3, True), ("Excel avanzado", "TECNICA", 3, True),
                        ("Análisis de datos", "CONOCIMIENTO", 3, True), ("Comunicación efectiva", "BLANDA", 2, False)]),
            dict(puesto="Supervisor de Producción", area="Producción",
                 funciones="Supervisar la operación diaria y asegurar el cumplimiento de estándares.",
                 escolaridad="Técnico / Ingeniería", experiencia="2 años supervisando equipos",
                 comps=[("Control de producción", "CONOCIMIENTO", 3, True), ("Liderazgo de equipos", "BLANDA", 3, True),
                        ("Seguridad industrial", "CONOCIMIENTO", 3, True), ("Lean / 5S", "TECNICA", 2, False)]),
            dict(puesto="Técnico de Laboratorio", area="Calidad",
                 funciones="Realizar mediciones, calibraciones y ensayos de calidad.",
                 escolaridad="Técnico en Química/Metrología", experiencia="1 año en laboratorio",
                 comps=[("Metrología", "TECNICA", 3, True), ("Calibración de equipos", "TECNICA", 3, True),
                        ("Normas de ensayo", "CONOCIMIENTO", 2, True), ("Manejo de instrumentos", "EXPERIENCIA", 3, False)]),
        ]
        perfiles_obj = []
        for i, pd in enumerate(PERFILES):
            perfil = PerfilPuesto.objects.filter(empresa=emp, puesto=pd["puesto"]).first()
            if not perfil:
                perfil = PerfilPuesto.objects.create(
                    empresa=emp, puesto=pd["puesto"], area=pd["area"], funciones=pd["funciones"],
                    escolaridad=pd["escolaridad"], experiencia=pd["experiencia"])
                n["perfiles"] += 1
            if perfil.competencias.count() == 0:
                for j, (nom, tipo, niv, oblig) in enumerate(pd["comps"]):
                    CompetenciaPerfil.objects.create(
                        perfil=perfil, nombre=nom, tipo=tipo, nivel_requerido=niv,
                        obligatoria=oblig, orden=j)
            perfiles_obj.append(perfil)

        # Evaluaciones: una persona por perfil (con brechas realistas).
        for i, perfil in enumerate(perfiles_obj):
            u = pick(i)
            persona_nombre = (u.get_full_name() or u.username) if u else f"Colaborador {i + 1}"
            if EvaluacionCompetencia.objects.filter(empresa=emp, perfil=perfil, persona=persona_nombre).exists():
                continue
            ev = EvaluacionCompetencia.objects.create(
                empresa=emp, persona=persona_nombre, persona_user=u, perfil=perfil)
            for c in perfil.competencias.all():
                # Nivel real: a veces cumple, a veces queda corto (genera brecha).
                actual = max(0, min(4, c.nivel_requerido - RNG.choice([0, 0, 1, 1, 2])))
                EvaluacionDetalle.objects.create(
                    evaluacion=ev, competencia=c, nombre=c.nombre, tipo=c.tipo,
                    nivel_requerido=c.nivel_requerido, nivel_actual=actual,
                    obligatoria=c.obligatoria, orden=c.orden)
            try:
                ev.recomputar()
            except Exception:
                pass
            n["evals"] += 1

        # ── 4) Gestión de cambios (6.3) ─────────────────────────────────────
        CAMBIOS = [
            dict(titulo="Cambio de proveedor de materia prima", tipo="PROVEEDOR", prioridad="ALTA",
                 descripcion="Sustituir al proveedor actual por uno homologado con mejor cumplimiento.",
                 justificacion="El proveedor actual ha incumplido plazos y especificaciones.",
                 consecuencias="Posible variación inicial en el producto; requiere validación de lotes piloto.",
                 recursos="Equipo de compras y calidad; validación de 3 lotes.",
                 impacto_integridad="Se actualizan especificaciones y se valida antes de liberar.",
                 rp=3, ri=4, estado="EN_PROCESO",
                 plan=[("Homologar proveedor alterno", True), ("Validar 3 lotes piloto", True),
                       ("Actualizar especificación", False), ("Liberar en producción", False)]),
            dict(titulo="Implementación de captura digital de KPIs", tipo="TECNOLOGICO", prioridad="MEDIA",
                 descripcion="Automatizar la captura de indicadores desde el ERP.",
                 justificacion="Reducir errores y retrasos en la medición de KPIs.",
                 consecuencias="Curva de aprendizaje del personal; mejora la oportunidad de los datos.",
                 recursos="Soporte de TI y capacitación a responsables.",
                 impacto_integridad="Se mantiene la trazabilidad de las mediciones.",
                 rp=2, ri=2, estado="APROBADO",
                 plan=[("Configurar tableros", True), ("Capacitar responsables", False), ("Piloto 1 mes", False)]),
            dict(titulo="Actualización del procedimiento de auditorías", tipo="DOCUMENTO", prioridad="MEDIA",
                 descripcion="Revisar el PR de auditorías internas conforme a la nueva estructura.",
                 justificacion="Alinear con el programa anual y los checklists nuevos.",
                 consecuencias="Requiere difusión y capacitación a auditores.",
                 recursos="Tiempo del equipo de calidad.",
                 impacto_integridad="Control de versiones documental.",
                 rp=1, ri=2, estado="PROPUESTO",
                 plan=[("Redactar borrador", False), ("Revisar con auditores", False)]),
            dict(titulo="Reorganización del área de producción", tipo="ORGANIZACIONAL", prioridad="ALTA",
                 descripcion="Redistribuir responsabilidades y turnos en planta.",
                 justificacion="Mejorar la eficiencia y la cobertura de supervisión.",
                 consecuencias="Impacto en clima laboral; requiere comunicación cuidadosa.",
                 recursos="RH y supervisión.",
                 impacto_integridad="Se actualizan perfiles de puesto y matriz de responsabilidades.",
                 rp=3, ri=3, estado="IMPLEMENTADO",
                 plan=[("Definir nuevo organigrama", True), ("Comunicar al personal", True), ("Actualizar perfiles", True)]),
            dict(titulo="Migración de servidor de respaldos", tipo="INFRAESTRUCTURA", prioridad="CRITICA",
                 descripcion="Mover los respaldos a una infraestructura más confiable.",
                 justificacion="Riesgo de pérdida de información con el equipo actual.",
                 consecuencias="Ventana de mantenimiento; riesgo durante la migración.",
                 recursos="TI y proveedor de servicios.",
                 impacto_integridad="Se preservan los registros del SGC y su retención.",
                 rp=2, ri=5, estado="PROPUESTO",
                 plan=[("Inventariar respaldos", False), ("Plan de rollback", False), ("Ejecutar migración", False)]),
        ]
        for cd in CAMBIOS:
            if GestionCambio.objects.filter(empresa=emp, titulo=cd["titulo"]).exists():
                continue
            plan = [{"texto": t, "hecho": h} for t, h in cd["plan"]]
            impl = hoy - timedelta(days=RNG.randint(1, 20)) if cd["estado"] == "IMPLEMENTADO" else None
            GestionCambio.objects.create(
                empresa=emp, titulo=cd["titulo"], descripcion=cd["descripcion"], tipo=cd["tipo"],
                prioridad=cd["prioridad"], justificacion=cd["justificacion"], consecuencias=cd["consecuencias"],
                recursos=cd["recursos"], impacto_integridad=cd["impacto_integridad"],
                riesgo_probabilidad=cd["rp"], riesgo_impacto=cd["ri"], plan_accion=plan,
                estado=cd["estado"], responsable_user=pick(CAMBIOS.index(cd)), autorizado_por="Dirección General",
                fecha_objetivo=hoy + timedelta(days=RNG.randint(15, 60)), fecha_implementacion=impl,
                creado_por=admin)
            n["cambios"] += 1

        # ── 5) Matriz de comunicación (7.4) ─────────────────────────────────
        COMU = [
            ("Política y objetivos de calidad", "INTERNA", "Al ingresar y en cada actualización", "Todo el personal", "Inducción y carteles"),
            ("Resultados de indicadores (KPIs)", "INTERNA", "Mensual", "Responsables de proceso", "Reunión de seguimiento"),
            ("No conformidades y acciones", "INTERNA", "Al detectarse", "Responsables y dirección", "Sistema SGC y correo"),
            ("Requisitos y quejas de clientes", "EXTERNA", "Permanente", "Clientes", "Correo, teléfono y portal"),
            ("Cambios en especificaciones", "AMBAS", "Cuando aplique", "Clientes y proveedores", "Oficio / correo"),
            ("Resultados de auditorías", "INTERNA", "Tras cada auditoría", "Áreas auditadas y dirección", "Informe de auditoría"),
        ]
        for que, direc, cuando, quien, como in COMU:
            if ComunicacionSGC.objects.filter(empresa=emp, que=que).exists():
                continue
            ComunicacionSGC.objects.create(
                empresa=emp, que=que, direccion=direc, cuando=cuando, a_quien=quien,
                como=como, responsable_user=pick(COMU.index((que, direc, cuando, quien, como))), activo=True)
            n["comu"] += 1

        # ── 6) Base de conocimiento (7.1.6) ─────────────────────────────────
        CONOC = [
            ("Lección: retraso por proveedor único", "LECCION", "Compras",
             "Depender de un solo proveedor provocó un paro de línea. Se homologaron alternos y se definió stock de seguridad.", "NC-2024-08", "proveedores, riesgo"),
            ("Mejor práctica: checklist de liberación", "MEJOR_PRACTICA", "Producción",
             "Un checklist de liberación final redujo las salidas no conformes en inspección.", "Mejora interna", "calidad, producción"),
            ("Experiencia: implementación de 5S", "EXPERIENCIA", "Operaciones",
             "La implementación de 5S mejoró tiempos de búsqueda y seguridad. Clave: auditorías cortas y constantes.", "Proyecto 5S", "lean, orden"),
            ("Fuente externa: guía de auditorías ISO 19011", "FUENTE_EXTERNA", "Calidad",
             "Resumen aplicable de ISO 19011 para planear y ejecutar auditorías internas.", "ISO 19011:2018", "auditoría, norma"),
            ("Lección: calibración vencida en equipo crítico", "LECCION", "Laboratorio",
             "Un equipo con calibración vencida generó un hallazgo. Se implementaron alertas automáticas de vencimiento.", "Auditoría interna", "metrología, equipos"),
        ]
        for titulo, tipo, area, contenido, origen, etiq in CONOC:
            if ConocimientoOrganizacional.objects.filter(empresa=emp, titulo=titulo).exists():
                continue
            ConocimientoOrganizacional.objects.create(
                empresa=emp, titulo=titulo, tipo=tipo, area=area, contenido=contenido,
                origen=origen, etiquetas=etiq, autor_user=pick(CONOC.index((titulo, tipo, area, contenido, origen, etiq))))
            n["conoc"] += 1

        # ── 7) Lista maestra de registros (7.5.3) ───────────────────────────
        REG = [
            ("REG-CAL-01", "Registro de inspección de entrada", "Compras", "AMBOS", "Carpeta Calidad / ERP", 24, "ARCHIVAR"),
            ("REG-CAL-02", "Registro de no conformidades", "Calidad", "DIGITAL", "Sistema SGC", 36, "CONSERVAR"),
            ("REG-CAL-03", "Registro de calibración de equipos", "Laboratorio", "AMBOS", "Carpeta Metrología", 60, "CONSERVAR"),
            ("REG-RH-01", "Registros de capacitación", "Recursos Humanos", "DIGITAL", "Expediente digital", 36, "ARCHIVAR"),
            ("REG-AUD-01", "Informes de auditoría interna", "Calidad", "DIGITAL", "Sistema SGC", 36, "CONSERVAR"),
            ("REG-PRD-01", "Bitácora de producción", "Producción", "FISICO", "Archivo de planta", 12, "ELIMINAR"),
            ("REG-COM-01", "Encuestas de satisfacción", "Comercial", "DIGITAL", "Sistema SGC", 24, "ARCHIVAR"),
            ("REG-DIR-01", "Actas de revisión por la dirección", "Dirección", "AMBOS", "Carpeta Dirección", 60, "CONSERVAR"),
        ]
        for cod, nombre, proceso, soporte, ubic, ret, disp in REG:
            if RegistroCalidad.objects.filter(empresa=emp, codigo=cod).exists():
                continue
            RegistroCalidad.objects.create(
                empresa=emp, codigo=cod, nombre=nombre, proceso=proceso, soporte=soporte,
                ubicacion=ubic, retencion_meses=ret, disposicion=disp, activo=True,
                responsable_user=pick(REG.index((cod, nombre, proceso, soporte, ubic, ret, disp))))
            n["reg"] += 1

        # ── 8) Revisión por la dirección (9.3) ──────────────────────────────
        if not RevisionDireccion.objects.filter(empresa=emp).exists():
            RevisionDireccion.objects.create(
                empresa=emp, fecha=hoy - timedelta(days=30), periodo=f"1er semestre {anio}",
                participantes="Dirección General, Gerente de Calidad, Jefes de área.",
                entradas=("Estado de acciones previas: 80% cerradas. Desempeño de KPIs: 4 de 5 en meta. "
                          "NC del periodo: 15 (12 cerradas). Auditorías internas: 2 realizadas. "
                          "Satisfacción del cliente: 88%. Evaluación de proveedores: 7 evaluados."),
                conclusiones=("El SGC es adecuado y eficaz. Se requiere reforzar la captura oportuna de KPIs "
                              "y cerrar las brechas de competencia detectadas."),
                acuerdos=("1) Automatizar captura de KPIs (responsable TI). 2) Ejecutar plan de capacitación. "
                          "3) Homologar proveedores alternos. 4) Preparar auditoría de certificación."),
                proxima_fecha=hoy + timedelta(days=150),
                metricas={"kpis_en_meta": 4, "kpis_total": 5, "nc_cerradas": 12, "nc_total": 15,
                          "satisfaccion": 88, "auditorias": 2},
                creado_por=admin)
            n["rev"] += 1

        # ── 9) Programa anual de auditorías (9.2) ───────────────────────────
        if not ProgramaAuditoria.objects.filter(empresa=emp, anio=anio).exists():
            ProgramaAuditoria.objects.create(
                empresa=emp, anio=anio, nombre=f"Programa de Auditorías Internas {anio}",
                objetivo="Verificar la conformidad y eficacia del SGC respecto a ISO 9001:2015 y los requisitos propios.",
                alcance="Todos los procesos del SGC: dirección, comercial, compras, producción, calidad y RH.",
                criterios="ISO 9001:2015, manual de calidad y procedimientos vigentes.",
                responsable_user=pick(0), aprobado=True)
            n["prog"] += 1

        self.stdout.write(self.style.SUCCESS(
            f"SGC completo en «{emp}»: FODA {n['foda']}, partes {n['partes']}, "
            f"perfiles {n['perfiles']}, evaluaciones {n['evals']}, cambios {n['cambios']}, "
            f"comunicación {n['comu']}, conocimiento {n['conoc']}, registros {n['reg']}, "
            f"revisión {n['rev']}, programa auditorías {n['prog']}."))
