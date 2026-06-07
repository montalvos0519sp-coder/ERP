# -*- coding: utf-8 -*-
"""Carga la biblioteca de plantillas ISO 9001 globales (empresa=None) y una
lista de verificación de auditoría reutilizable. Plantillas de nivel
profesional: con encabezado de control documental, estructura formal por
cláusula y secciones completas listas para personalizar. Idempotente.

Uso:  python manage.py seed_sgc_plantillas
"""
from __future__ import annotations

from django.core.management.base import BaseCommand

from apps.sgc.models import (
    PlantillaDocumento, PlantillaChecklist, ItemChecklist, Norma,
)


def encabezado(codigo, titulo, categoria):
    """Bloque de control documental común a todas las plantillas (ISO 7.5.2)."""
    return (
        "═══════════════════════════════════════════════════════════════════\n"
        f"  {{{{empresa}}}}\n"
        f"  {titulo.upper()}\n"
        "───────────────────────────────────────────────────────────────────\n"
        f"  Código: {codigo}        Versión: 1.0        Fecha: {{{{fecha}}}}\n"
        f"  Tipo: {categoria}        Clasificación: Controlado\n"
        "───────────────────────────────────────────────────────────────────\n"
        "  Elaboró: ____________   Revisó: ____________   Aprobó: ____________\n"
        "  (Nombre y puesto)       (Responsable Calidad)  (Dirección)\n"
        "═══════════════════════════════════════════════════════════════════\n\n"
        "CONTROL DE CAMBIOS\n"
        "  Versión | Fecha       | Descripción del cambio        | Autor\n"
        "  1.0     | {{fecha}}   | Emisión inicial               | ______\n\n"
    )


# (codigo, nombre, categoria, clausula, descripcion, obligatoria, cuerpo)
def _plantillas():
    P = []

    P.append(("PL-CAL-01", "Política de Calidad", "POLITICA", "5.2",
        "Declaración del compromiso de la alta dirección con la calidad y la mejora continua.", True,
        encabezado("PL-CAL-01", "Política de Calidad", "Política") +
        "1. DECLARACIÓN DE LA POLÍTICA\n"
        "En {{empresa}} estamos comprometidos a proporcionar productos y servicios que "
        "satisfagan plena y consistentemente los requisitos de nuestros clientes y de las "
        "partes interesadas, cumpliendo los requisitos legales y reglamentarios aplicables, "
        "y mejorando continuamente la eficacia de nuestro Sistema de Gestión de Calidad "
        "conforme a la norma ISO 9001:2015.\n\n"
        "2. COMPROMISOS\n"
        "Para cumplir esta política, la dirección se compromete a:\n"
        "  a) Comprender y satisfacer las necesidades y expectativas de nuestros clientes.\n"
        "  b) Cumplir los requisitos legales, reglamentarios y los propios del cliente.\n"
        "  c) Establecer, revisar y dar seguimiento a objetivos de calidad medibles.\n"
        "  d) Desarrollar la competencia, participación y toma de conciencia del personal.\n"
        "  e) Proporcionar los recursos necesarios para la operación y mejora del SGC.\n"
        "  f) Mejorar continuamente la eficacia de nuestros procesos.\n\n"
        "3. MARCO PARA LOS OBJETIVOS DE CALIDAD\n"
        "Esta política proporciona el marco de referencia para establecer y revisar los "
        "objetivos de calidad, los cuales se definen en el documento correspondiente y se "
        "evalúan en la revisión por la dirección.\n\n"
        "4. COMUNICACIÓN Y DISPONIBILIDAD\n"
        "Esta política se comunica, se entiende y se aplica dentro de la organización, está "
        "disponible para las partes interesadas pertinentes y se revisa para su continua "
        "adecuación.\n\n"
        "_______________________________\n"
        "Dirección General — {{empresa}}\n"
        "Fecha de aprobación: {{fecha}}"))

    P.append(("MN-CAL-01", "Manual de Calidad", "MANUAL", "4.4",
        "Documento que describe el alcance, los procesos y la estructura del SGC.", False,
        encabezado("MN-CAL-01", "Manual de Calidad", "Manual") +
        "1. OBJETO Y CAMPO DE APLICACIÓN\n"
        "Este manual describe el Sistema de Gestión de Calidad (SGC) de {{empresa}}, "
        "establecido conforme a la norma ISO 9001:2015, y aplica a todos los procesos "
        "involucrados en [definir productos/servicios y sitios incluidos en el alcance].\n\n"
        "2. REFERENCIAS NORMATIVAS\n"
        "  • ISO 9001:2015 — Sistemas de gestión de la calidad. Requisitos.\n"
        "  • ISO 9000:2015 — Fundamentos y vocabulario.\n\n"
        "3. TÉRMINOS Y DEFINICIONES\n"
        "Se aplican los términos y definiciones de la norma ISO 9000:2015.\n\n"
        "4. CONTEXTO DE LA ORGANIZACIÓN\n"
        "  4.1 Cuestiones internas y externas: se determinan mediante análisis FODA.\n"
        "  4.2 Partes interesadas: se identifican junto con sus requisitos pertinentes.\n"
        "  4.3 Alcance del SGC: [definir]. Exclusiones justificadas: [si aplica].\n"
        "  4.4 Procesos: la organización opera bajo un enfoque a procesos (ver mapa de procesos).\n\n"
        "5. LIDERAZGO\n"
        "  5.1 La alta dirección demuestra liderazgo y compromiso con el SGC.\n"
        "  5.2 Se establece y comunica la política de calidad (ver PL-CAL-01).\n"
        "  5.3 Se asignan roles, responsabilidades y autoridades.\n\n"
        "6. PLANIFICACIÓN\n"
        "  6.1 Se determinan riesgos y oportunidades y se planifican acciones.\n"
        "  6.2 Se establecen objetivos de calidad medibles y planes para lograrlos.\n"
        "  6.3 Los cambios al SGC se planifican de manera controlada.\n\n"
        "7. APOYO\n"
        "  7.1 Recursos  7.2 Competencia  7.3 Toma de conciencia  7.4 Comunicación  "
        "7.5 Información documentada.\n\n"
        "8. OPERACIÓN\n"
        "  Planificación y control operacional, requisitos para productos y servicios, "
        "diseño y desarrollo, control de proveedores externos, producción y prestación del "
        "servicio, liberación, y control de salidas no conformes.\n\n"
        "9. EVALUACIÓN DEL DESEMPEÑO\n"
        "  Seguimiento, medición, análisis y evaluación; satisfacción del cliente; "
        "auditoría interna; revisión por la dirección.\n\n"
        "10. MEJORA\n"
        "  No conformidad y acción correctiva; mejora continua del SGC."))

    P.append(("PR-DOC-01", "Procedimiento de Control de Información Documentada", "PROCEDIMIENTO", "7.5", "", True,
        encabezado("PR-DOC-01", "Control de Información Documentada", "Procedimiento") +
        "1. OBJETIVO\n"
        "Establecer la metodología para crear, actualizar, aprobar, distribuir, controlar y "
        "conservar la información documentada del SGC de {{empresa}}.\n\n"
        "2. ALCANCE\n"
        "Aplica a todos los documentos y registros del Sistema de Gestión de Calidad, de "
        "origen interno y externo.\n\n"
        "3. RESPONSABILIDADES\n"
        "  • Responsable de Calidad: administra la lista maestra y controla las versiones.\n"
        "  • Dueños de proceso: elaboran y mantienen sus documentos.\n"
        "  • Dirección: aprueba la información documentada antes de su emisión.\n\n"
        "4. DESARROLLO\n"
        "  4.1 Identificación: cada documento lleva código, título, versión y fecha.\n"
        "  4.2 Revisión y aprobación: se aprueba la idoneidad antes de su uso.\n"
        "  4.3 Distribución: solo se ponen a disposición versiones vigentes.\n"
        "  4.4 Control de cambios: los cambios se gestionan mediante nuevas versiones, "
        "conservando el historial.\n"
        "  4.5 Documentos obsoletos: se retiran de los puntos de uso o se identifican como "
        "tales si se conservan.\n"
        "  4.6 Documentos de origen externo: se identifican y se controla su distribución.\n"
        "  4.7 Conservación: se define el tiempo de retención (ver lista maestra de registros).\n\n"
        "5. DOCUMENTOS Y REGISTROS RELACIONADOS\n"
        "  • Lista maestra de documentos.  • Lista maestra de registros.\n\n"
        "6. ANEXOS\n  N/A"))

    P.append(("PR-NC-01", "Procedimiento de No Conformidades y Acción Correctiva", "PROCEDIMIENTO", "10.2", "", True,
        encabezado("PR-NC-01", "No Conformidades y Acción Correctiva", "Procedimiento") +
        "1. OBJETIVO\n"
        "Definir el tratamiento de las no conformidades y la implementación de acciones "
        "correctivas para eliminar sus causas y prevenir su recurrencia en {{empresa}}.\n\n"
        "2. ALCANCE\n"
        "Aplica a todas las no conformidades detectadas en el producto, el servicio o el SGC, "
        "provenientes de auditorías, quejas, procesos, proveedores u otras fuentes.\n\n"
        "3. DEFINICIONES\n"
        "  • No conformidad: incumplimiento de un requisito.\n"
        "  • Corrección: acción para eliminar una no conformidad detectada.\n"
        "  • Acción correctiva: acción para eliminar la causa de una no conformidad.\n\n"
        "4. DESARROLLO\n"
        "  4.1 Identificación y registro de la no conformidad (folio, descripción, origen).\n"
        "  4.2 Corrección / contención inmediata para controlar y corregir.\n"
        "  4.3 Evaluación de la necesidad de acción correctiva.\n"
        "  4.4 Análisis de causa raíz (5 porqués / diagrama de Ishikawa).\n"
        "  4.5 Plan de acción correctiva con responsables y fechas compromiso.\n"
        "  4.6 Implementación de las acciones.\n"
        "  4.7 Verificación de la eficacia de las acciones tomadas.\n"
        "  4.8 Cierre y actualización de riesgos/oportunidades si procede.\n\n"
        "5. REGISTROS\n"
        "  • Reporte de no conformidad (FR-NC-01).  • Registro CAPA.\n\n"
        "6. INDICADOR\n"
        "  % de acciones correctivas eficaces / total de acciones cerradas."))

    P.append(("PR-AUD-01", "Procedimiento de Auditoría Interna", "PROCEDIMIENTO", "9.2", "", True,
        encabezado("PR-AUD-01", "Auditoría Interna", "Procedimiento") +
        "1. OBJETIVO\n"
        "Establecer la metodología para planificar y ejecutar las auditorías internas que "
        "determinen si el SGC de {{empresa}} es conforme y se mantiene de manera eficaz.\n\n"
        "2. ALCANCE\nAplica a todos los procesos del SGC.\n\n"
        "3. RESPONSABILIDADES\n"
        "  • Responsable de Calidad: elabora el programa anual y designa auditores.\n"
        "  • Auditores: planifican y ejecutan la auditoría con imparcialidad.\n"
        "  • Auditados: facilitan la información y atienden los hallazgos.\n\n"
        "4. DESARROLLO\n"
        "  4.1 Programa anual de auditorías (frecuencia, métodos, responsabilidades).\n"
        "  4.2 Selección de auditores: competencia, objetividad e imparcialidad "
        "(los auditores no auditan su propio trabajo).\n"
        "  4.3 Plan de auditoría y lista de verificación por cláusula.\n"
        "  4.4 Reunión de apertura, ejecución y registro de evidencias.\n"
        "  4.5 Clasificación de hallazgos (NC mayor, NC menor, observación, oportunidad).\n"
        "  4.6 Informe de auditoría y reunión de cierre.\n"
        "  4.7 Seguimiento de las acciones correctivas derivadas.\n\n"
        "5. REGISTROS\n"
        "  • Programa anual (PN-AUD-01).  • Plan de auditoría (FR-AUD-01).  "
        "• Lista de verificación.  • Informe de auditoría."))

    P.append(("PR-RD-01", "Procedimiento de Revisión por la Dirección", "PROCEDIMIENTO", "9.3", "", False,
        encabezado("PR-RD-01", "Revisión por la Dirección", "Procedimiento") +
        "1. OBJETIVO\n"
        "Asegurar la conveniencia, adecuación, eficacia y alineación continua del SGC de "
        "{{empresa}} con la dirección estratégica de la organización.\n\n"
        "2. FRECUENCIA\nAl menos una vez al año, o cuando la dirección lo determine.\n\n"
        "3. ENTRADAS (9.3.2)\n"
        "  a) Estado de las acciones de revisiones previas.\n"
        "  b) Cambios en cuestiones internas y externas pertinentes.\n"
        "  c) Información del desempeño: satisfacción del cliente, objetivos, conformidad de "
        "producto/servicio, no conformidades y acciones correctivas, seguimiento y medición, "
        "resultados de auditorías y desempeño de proveedores externos.\n"
        "  d) Adecuación de los recursos.\n"
        "  e) Eficacia de las acciones para abordar riesgos y oportunidades.\n"
        "  f) Oportunidades de mejora.\n\n"
        "4. SALIDAS (9.3.3)\n"
        "  • Oportunidades de mejora.\n"
        "  • Necesidades de cambio en el SGC.\n"
        "  • Necesidades de recursos.\n\n"
        "5. REGISTRO\nActa de revisión por la dirección (FR-RD-01) con acuerdos, responsables "
        "y fechas compromiso."))

    P.append(("PR-RIE-01", "Procedimiento de Gestión de Riesgos y Oportunidades", "PROCEDIMIENTO", "6.1", "", False,
        encabezado("PR-RIE-01", "Gestión de Riesgos y Oportunidades", "Procedimiento") +
        "1. OBJETIVO\n"
        "Establecer el método para identificar, evaluar y tratar los riesgos y oportunidades "
        "que pueden afectar la conformidad de los productos/servicios y la satisfacción del "
        "cliente en {{empresa}}.\n\n"
        "2. ALCANCE\nAplica a todos los procesos del SGC.\n\n"
        "3. DESARROLLO\n"
        "  3.1 Identificación de riesgos y oportunidades por proceso.\n"
        "  3.2 Evaluación: nivel = probabilidad (1-5) × impacto (1-5).\n"
        "  3.3 Determinación de la severidad (bajo, medio, alto, crítico).\n"
        "  3.4 Planificación del tratamiento (evitar, reducir, transferir, aceptar).\n"
        "  3.5 Integración de las acciones en los procesos del SGC.\n"
        "  3.6 Seguimiento de la eficacia de las acciones.\n\n"
        "4. CRITERIOS DE EVALUACIÓN\n"
        "  Probabilidad: 1 Raro · 2 Improbable · 3 Posible · 4 Probable · 5 Casi seguro.\n"
        "  Impacto: 1 Insignificante · 2 Menor · 3 Moderado · 4 Mayor · 5 Catastrófico.\n\n"
        "5. REGISTRO\nMatriz de riesgos y oportunidades (MZ-RIE-01)."))

    P.append(("PR-COMP-01", "Procedimiento de Competencia, Formación y Toma de Conciencia", "PROCEDIMIENTO", "7.2", "", False,
        encabezado("PR-COMP-01", "Competencia, Formación y Toma de Conciencia", "Procedimiento") +
        "1. OBJETIVO\n"
        "Asegurar que el personal que afecta el desempeño del SGC sea competente con base en "
        "educación, formación, habilidades y experiencia apropiadas en {{empresa}}.\n\n"
        "2. ALCANCE\nAplica a todo el personal cuyo trabajo afecta la calidad.\n\n"
        "3. DESARROLLO\n"
        "  3.1 Definición de perfiles de puesto y competencias requeridas.\n"
        "  3.2 Evaluación de competencias y detección de brechas.\n"
        "  3.3 Elaboración del plan de capacitación.\n"
        "  3.4 Ejecución de la formación y conservación de evidencia.\n"
        "  3.5 Evaluación de la eficacia de la formación.\n"
        "  3.6 Toma de conciencia: política, objetivos, su contribución y las implicaciones "
        "de no cumplir los requisitos.\n\n"
        "4. REGISTROS\n  • Perfiles de puesto.  • Evaluaciones de competencia.  "
        "• Registros de capacitación y evaluación de eficacia."))

    P.append(("PR-PROV-01", "Procedimiento de Compras y Evaluación de Proveedores", "PROCEDIMIENTO", "8.4", "", False,
        encabezado("PR-PROV-01", "Compras y Evaluación de Proveedores", "Procedimiento") +
        "1. OBJETIVO\n"
        "Asegurar que los procesos, productos y servicios suministrados externamente cumplan "
        "los requisitos especificados por {{empresa}}.\n\n"
        "2. ALCANCE\nAplica a los proveedores externos que afectan la calidad del producto/servicio.\n\n"
        "3. DESARROLLO\n"
        "  3.1 Selección y homologación de proveedores con base en criterios definidos.\n"
        "  3.2 Tipo y alcance del control aplicado según el impacto del suministro.\n"
        "  3.3 Información para los proveedores (requisitos del producto, competencia, etc.).\n"
        "  3.4 Evaluación periódica: calidad, tiempo de entrega, servicio y documentación.\n"
        "  3.5 Reevaluación y planes de mejora para proveedores críticos.\n\n"
        "4. CRITERIOS DE EVALUACIÓN (0-100)\n"
        "  Calidad 40% · Tiempo de entrega 30% · Servicio 20% · Documentación 10%.\n"
        "  Clasificación: A (≥90) · B (80-89) · C (70-79) · D (<70, requiere plan de mejora).\n\n"
        "5. REGISTRO\nEvaluación de proveedores."))

    P.append(("PR-CAL-01", "Procedimiento de Control de Equipos de Seguimiento y Medición", "PROCEDIMIENTO", "7.1.5", "", False,
        encabezado("PR-CAL-01", "Control de Equipos de Seguimiento y Medición", "Procedimiento") +
        "1. OBJETIVO\n"
        "Asegurar la validez y fiabilidad de los resultados cuando se realiza seguimiento o "
        "medición para verificar la conformidad en {{empresa}}.\n\n"
        "2. ALCANCE\nAplica a todos los equipos de seguimiento y medición que afectan la calidad.\n\n"
        "3. DESARROLLO\n"
        "  3.1 Inventario e identificación de los equipos.\n"
        "  3.2 Calibración o verificación contra patrones trazables a patrones nacionales o "
        "internacionales (o registro de la base usada cuando no existan).\n"
        "  3.3 Identificación del estado de calibración.\n"
        "  3.4 Protección contra ajustes, daño o deterioro.\n"
        "  3.5 Determinación de la frecuencia de calibración.\n"
        "  3.6 Acciones cuando un equipo se encuentra fuera de calibración (evaluar validez "
        "de mediciones previas y actuar).\n\n"
        "4. REGISTRO\nControl de equipos y certificados de calibración."))

    P.append(("PR-SNC-01", "Procedimiento de Control de Salidas No Conformes", "PROCEDIMIENTO", "8.7", "", False,
        encabezado("PR-SNC-01", "Control de Salidas No Conformes", "Procedimiento") +
        "1. OBJETIVO\n"
        "Asegurar que las salidas que no cumplen los requisitos se identifiquen y controlen "
        "para prevenir su uso o entrega no intencionada en {{empresa}}.\n\n"
        "2. ALCANCE\nAplica a las salidas no conformes detectadas en cualquier etapa.\n\n"
        "3. DESARROLLO\n"
        "  3.1 Identificación y segregación de la salida no conforme.\n"
        "  3.2 Determinación de la disposición:\n"
        "      • Corrección / reproceso.  • Segregación / contención.  "
        "• Devolución al proveedor.  • Aceptación bajo concesión (con autorización).  "
        "• Reclasificación.  • Desecho.\n"
        "  3.3 Autorización de la concesión por persona facultada o por el cliente cuando aplique.\n"
        "  3.4 Verificación de la conformidad tras la corrección.\n"
        "  3.5 Conservación de la información: descripción, disposición, concesiones y "
        "responsable.\n\n"
        "4. REGISTRO\nRegistro de salidas no conformes (SNC)."))

    P.append(("FR-AUD-01", "Formato: Plan de Auditoría Interna", "FORMATO", "9.2", "", False,
        encabezado("FR-AUD-01", "Plan de Auditoría Interna", "Formato") +
        "DATOS GENERALES\n"
        "  Proceso/área auditada: ______________________________\n"
        "  Auditor líder: ______________   Equipo auditor: ______________\n"
        "  Criterios de auditoría: ISO 9001:2015 y documentación interna\n"
        "  Objetivo: ____________________________________________\n"
        "  Alcance: _____________________________________________\n"
        "  Fecha: {{fecha}}\n\n"
        "AGENDA\n"
        "  Hora    | Proceso / Cláusula        | Auditor       | Auditado\n"
        "  --------|---------------------------|---------------|-----------\n"
        "          |                           |               |\n"
        "          |                           |               |\n\n"
        "DISTRIBUCIÓN: auditado, dueño del proceso, responsable de calidad.\n\n"
        "Elaboró: ______________   Aprobó: ______________"))

    P.append(("FR-NC-01", "Formato: Reporte de No Conformidad", "FORMATO", "10.2", "", False,
        encabezado("FR-NC-01", "Reporte de No Conformidad", "Formato") +
        "IDENTIFICACIÓN\n"
        "  Folio: __________   Fecha de detección: {{fecha}}\n"
        "  Origen: ☐ Auditoría  ☐ Queja  ☐ Proceso  ☐ Proveedor  ☐ Otro\n"
        "  Detectó: ______________   Proceso afectado: ______________\n\n"
        "DESCRIPCIÓN DE LA NO CONFORMIDAD\n  __________________________________________________\n\n"
        "REQUISITO INCUMPLIDO (norma / documento / cliente)\n  ________________________________\n\n"
        "CORRECCIÓN / CONTENCIÓN INMEDIATA\n  __________________________________________________\n\n"
        "ANÁLISIS DE CAUSA RAÍZ (5 porqués / Ishikawa)\n  ___________________________________\n\n"
        "ACCIÓN CORRECTIVA   |  Responsable  |  Fecha compromiso\n"
        "  __________________|_______________|__________________\n\n"
        "VERIFICACIÓN DE EFICACIA: ☐ Eficaz  ☐ No eficaz   Fecha: __________\n"
        "Cierre autorizado por: ______________"))

    P.append(("FR-RD-01", "Formato: Acta de Revisión por la Dirección", "FORMATO", "9.3", "", False,
        encabezado("FR-RD-01", "Acta de Revisión por la Dirección", "Formato") +
        "DATOS DE LA REUNIÓN\n"
        "  Fecha: {{fecha}}   Periodo revisado: ______________\n"
        "  Participantes: ___________________________________\n\n"
        "ENTRADAS REVISADAS (9.3.2)\n"
        "  a) Estado de acciones de revisiones previas: ____________________\n"
        "  b) Cambios internos/externos pertinentes: ______________________\n"
        "  c) Desempeño del SGC:\n"
        "     • Satisfacción del cliente: ______   • Objetivos de calidad: ______\n"
        "     • No conformidades y acciones correctivas: ______\n"
        "     • Resultados de auditoría: ______   • Desempeño de proveedores: ______\n"
        "  d) Adecuación de recursos: ______________________\n"
        "  e) Eficacia de acciones de riesgos y oportunidades: ______________\n"
        "  f) Oportunidades de mejora: ______________________\n\n"
        "SALIDAS / ACUERDOS (9.3.3)\n"
        "  Acuerdo                         | Responsable   | Fecha\n"
        "  --------------------------------|---------------|--------\n"
        "                                  |               |\n\n"
        "Próxima revisión: __________   Firma dirección: ______________"))

    P.append(("MZ-COM-01", "Matriz de Comunicación", "MATRIZ", "7.4", "", False,
        encabezado("MZ-COM-01", "Matriz de Comunicación", "Matriz") +
        "MATRIZ DE COMUNICACIONES INTERNAS Y EXTERNAS (7.4)\n\n"
        "  Qué se comunica        | Dir.(I/E) | Cuándo        | A quién            | Cómo (canal)       | Responsable\n"
        "  -----------------------|-----------|---------------|--------------------|--------------------|------------\n"
        "  Política de calidad    | Interna   | Ingreso/anual | Todo el personal   | Inducción, tablero | RH\n"
        "  Objetivos y KPIs       | Interna   | Mensual       | Dueños de proceso  | Reunión            | Calidad\n"
        "  Cambios del SGC        | Interna   | Al ocurrir    | Personal afectado  | Comunicado         | Calidad\n"
        "  Requisitos a proveedor | Externa   | Por compra    | Proveedores        | Orden de compra    | Compras\n"
        "  Quejas y respuestas    | Externa   | Al ocurrir    | Clientes           | Correo/teléfono    | Atención\n\n"
        "  (Agrega las filas que apliquen a tu organización.)"))

    P.append(("MZ-RIE-01", "Matriz de Riesgos y Oportunidades", "MATRIZ", "6.1", "", False,
        encabezado("MZ-RIE-01", "Matriz de Riesgos y Oportunidades", "Matriz") +
        "MATRIZ DE RIESGOS Y OPORTUNIDADES (6.1)\n"
        "  Nivel = Probabilidad (1-5) × Impacto (1-5).  Severidad: Bajo<4, Medio 4-7, Alto 8-14, Crítico ≥15.\n\n"
        "  Proceso     | Riesgo / Oportunidad        | P | I | Nivel | Control actual   | Plan de tratamiento | Responsable\n"
        "  ------------|-----------------------------|---|---|-------|------------------|---------------------|------------\n"
        "              |                             |   |   |       |                  |                     |\n"
        "              |                             |   |   |       |                  |                     |\n\n"
        "  (Completa una fila por cada riesgo/oportunidad identificado por proceso.)"))

    P.append(("PN-AUD-01", "Programa Anual de Auditorías", "PLAN", "9.2", "", False,
        encabezado("PN-AUD-01", "Programa Anual de Auditorías", "Plan") +
        "PROGRAMA ANUAL DE AUDITORÍAS INTERNAS — AÑO {{anio}}\n\n"
        "  Objetivo: Verificar la conformidad y eficacia del SGC respecto a ISO 9001:2015 y la "
        "documentación interna.\n"
        "  Criterios: ISO 9001:2015 y documentos del SGC.\n"
        "  Alcance: Todos los procesos del SGC.\n\n"
        "  Proceso / Cláusula | E | F | M | A | M | J | J | A | S | O | N | D | Auditor\n"
        "  -------------------|---|---|---|---|---|---|---|---|---|---|---|---|--------\n"
        "  Dirección / 5,9.3  |   |   | X |   |   |   |   |   |   |   |   |   |\n"
        "  Compras / 8.4      |   |   |   |   | X |   |   |   |   |   |   |   |\n"
        "  Operación / 8      |   |   |   |   |   | X |   |   |   |   |   |   |\n"
        "  Calidad / 9,10     |   |   |   |   |   |   |   |   | X |   |   |   |\n\n"
        "  Elaboró: ______________   Aprobó (Dirección): ______________   Fecha: {{fecha}}"))

    # ── Documentos fundacionales del contexto (cláusula 4) ──────────────────
    P.append(("OT-ALC-01", "Declaración del Alcance del SGC", "OTRO", "4.3",
        "Define los límites y la aplicabilidad del Sistema de Gestión de Calidad.", True,
        encabezado("OT-ALC-01", "Alcance del Sistema de Gestión de Calidad", "Declaración") +
        "1. PROPÓSITO\n"
        "Establecer los límites y la aplicabilidad del SGC de {{empresa}}, conforme al "
        "requisito 4.3 de ISO 9001:2015.\n\n"
        "2. ALCANCE DECLARADO\n"
        "El Sistema de Gestión de Calidad de {{empresa}} aplica al diseño, producción y/o "
        "prestación de [productos/servicios] en [sitios/ubicaciones], considerando el contexto "
        "de la organización, las partes interesadas pertinentes y los productos y servicios "
        "ofrecidos.\n\n"
        "3. UNIDADES Y PROCESOS INCLUIDOS\n"
        "  • [Proceso/área 1]   • [Proceso/área 2]   • [Proceso/área 3]\n\n"
        "4. EXCLUSIONES / NO APLICABILIDAD (justificadas)\n"
        "  Requisito: [p. ej. 8.3 Diseño y desarrollo]\n"
        "  Justificación: [por qué no aplica sin afectar la capacidad de cumplir requisitos].\n\n"
        "5. DISPONIBILIDAD\n"
        "El alcance se mantiene como información documentada y está disponible para las partes "
        "interesadas pertinentes.\n\n"
        "Aprobó (Dirección): ______________   Fecha: {{fecha}}"))

    P.append(("MZ-CTX-01", "Análisis de Contexto (FODA)", "MATRIZ", "4.1",
        "Determina las cuestiones internas y externas mediante un análisis FODA.", False,
        encabezado("MZ-CTX-01", "Análisis de Contexto de la Organización (FODA)", "Matriz") +
        "ANÁLISIS DEL CONTEXTO — CUESTIONES INTERNAS Y EXTERNAS (4.1)\n\n"
        "FACTORES INTERNOS\n"
        "  FORTALEZAS (capitalizar)            | DEBILIDADES (corregir)\n"
        "  ------------------------------------|------------------------------------\n"
        "  •                                   | •\n"
        "  •                                   | •\n\n"
        "FACTORES EXTERNOS\n"
        "  OPORTUNIDADES (aprovechar)          | AMENAZAS (mitigar)\n"
        "  ------------------------------------|------------------------------------\n"
        "  •                                   | •\n"
        "  •                                   | •\n\n"
        "ESTRATEGIAS DERIVADAS\n"
        "  • FO (fortaleza+oportunidad): ____________________________________\n"
        "  • DO (debilidad+oportunidad): ____________________________________\n"
        "  • FA (fortaleza+amenaza): ________________________________________\n"
        "  • DA (debilidad+amenaza): ________________________________________\n\n"
        "Cada cuestión relevante debe vincularse a un riesgo u oportunidad (6.1).\n"
        "Revisó: ______________   Fecha: {{fecha}}"))

    P.append(("MZ-PI-01", "Matriz de Partes Interesadas", "MATRIZ", "4.2",
        "Identifica las partes interesadas, sus necesidades y el seguimiento aplicado.", False,
        encabezado("MZ-PI-01", "Matriz de Partes Interesadas", "Matriz") +
        "PARTES INTERESADAS PERTINENTES Y SUS REQUISITOS (4.2)\n\n"
        "  Parte interesada     | Tipo        | Necesidades / expectativas      | Influencia(1-5) | Cómo se da seguimiento\n"
        "  ---------------------|-------------|---------------------------------|-----------------|------------------------\n"
        "  Clientes             | Cliente     | Calidad, entrega, servicio      | 5               | Encuestas, quejas\n"
        "  Proveedores          | Proveedor   | Pedidos claros, pago puntual    | 3               | Evaluación de proveedor\n"
        "  Colaboradores        | Empleado    | Seguridad, desarrollo           | 4               | Clima, capacitación\n"
        "  Dirección/Accionistas| Accionista  | Rentabilidad, bajo riesgo       | 5               | Revisión por la dirección\n"
        "  Autoridades          | Autoridad   | Cumplimiento legal              | 4               | Matriz de requisitos legales\n\n"
        "  (Agrega/ajusta filas según tu organización. Revisa esta matriz al menos una vez al año.)\n"
        "Revisó: ______________   Fecha: {{fecha}}"))

    P.append(("FR-PROC-01", "Caracterización de Proceso (SIPOC)", "FORMATO", "4.4",
        "Ficha de proceso con enfoque SIPOC: proveedores, entradas, actividades, salidas y clientes.", False,
        encabezado("FR-PROC-01", "Caracterización de Proceso (SIPOC)", "Formato") +
        "FICHA DE CARACTERIZACIÓN DE PROCESO (4.4)\n\n"
        "  Nombre del proceso: ______________________   Código: ______________\n"
        "  Dueño del proceso: ______________________   Tipo: ☐ Estratégico ☐ Clave ☐ Apoyo\n"
        "  Objetivo del proceso: _______________________________________________\n\n"
        "  PROVEEDORES → ENTRADAS → ACTIVIDADES (PHVA) → SALIDAS → CLIENTES\n"
        "  ----------------------------------------------------------------------\n"
        "  S (Supplier) | I (Input) | P (Process)        | O (Output) | C (Customer)\n"
        "  -------------|-----------|--------------------|------------|-------------\n"
        "               |           | P: planear         |            |\n"
        "               |           | H: hacer           |            |\n"
        "               |           | V: verificar       |            |\n"
        "               |           | A: actuar          |            |\n\n"
        "  RECURSOS: ______________   DOCUMENTOS/REGISTROS: ______________\n"
        "  INDICADORES (KPI): nombre | fórmula | meta | frecuencia\n"
        "  RIESGOS Y OPORTUNIDADES del proceso: ______________________\n\n"
        "Elaboró: ______________   Aprobó: ______________   Fecha: {{fecha}}"))

    # ── Planificación (cláusula 6) ──────────────────────────────────────────
    P.append(("PN-OBJ-01", "Objetivos de Calidad y Plan de Acción", "PLAN", "6.2",
        "Objetivos medibles alineados a la política, con metas, recursos y seguimiento.", True,
        encabezado("PN-OBJ-01", "Objetivos de Calidad y Plan de Acción", "Plan") +
        "OBJETIVOS DE CALIDAD — AÑO {{anio}} (6.2)\n\n"
        "Los objetivos son medibles, coherentes con la política, se les da seguimiento, se "
        "comunican y se actualizan según corresponda.\n\n"
        "  Objetivo              | Indicador / fórmula      | Meta  | Recursos     | Responsable | Plazo  | Avance\n"
        "  ----------------------|--------------------------|-------|--------------|-------------|--------|-------\n"
        "  Satisfacción cliente  | % CSAT                    | ≥ 90% | Encuestas    |             | Anual  |\n"
        "  Entregas a tiempo     | % OTD                     | ≥ 95% | Logística    |             | Mensual|\n"
        "  No conformidades      | # NC / mes                | ↓ 20% | CAPA         |             | Mensual|\n"
        "  Competencia personal  | % plan capacitación       | 100%  | RH           |             | Anual  |\n\n"
        "Para cada objetivo: qué se hará, qué recursos, quién, cuándo y cómo se evaluarán los "
        "resultados.\n"
        "Aprobó (Dirección): ______________   Fecha: {{fecha}}"))

    P.append(("FR-CAM-01", "Solicitud de Cambio del SGC (RFC)", "FORMATO", "6.3",
        "Formato para planificar cambios al SGC: propósito, consecuencias, recursos e integridad.", False,
        encabezado("FR-CAM-01", "Solicitud de Cambio del SGC", "Formato") +
        "SOLICITUD DE CAMBIO PLANIFICADO (6.3)\n\n"
        "  Folio: __________   Fecha: {{fecha}}   Solicita: ______________\n"
        "  Tipo: ☐ Proceso ☐ Documento ☐ Infraestructura ☐ Proveedor ☐ Organizacional ☐ Tecnológico\n"
        "  Prioridad: ☐ Baja ☐ Media ☐ Alta ☐ Crítica\n\n"
        "  1. DESCRIPCIÓN DEL CAMBIO: ___________________________________________\n"
        "  2. PROPÓSITO Y CONSECUENCIAS (6.3 a): _______________________________\n"
        "  3. INTEGRIDAD DEL SGC (6.3 b): cómo se preserva la coherencia ________\n"
        "  4. RECURSOS NECESARIOS (6.3 c): ______________________________________\n"
        "  5. RESPONSABILIDADES Y AUTORIDADES (6.3 d): ________________________\n\n"
        "  EVALUACIÓN DE RIESGO: Probabilidad (1-5) ___ × Impacto (1-5) ___ = Nivel ___\n"
        "  PLAN DE IMPLEMENTACIÓN (tareas/fechas): _____________________________\n\n"
        "  Autoriza: ______________   Estado: ☐ Propuesto ☐ Aprobado ☐ Implementado ☐ Rechazado"))

    # ── Apoyo (cláusula 7) ──────────────────────────────────────────────────
    P.append(("FR-LMD-01", "Lista Maestra de Documentos", "FORMATO", "7.5",
        "Inventario controlado de la información documentada vigente del SGC.", False,
        encabezado("FR-LMD-01", "Lista Maestra de Documentos", "Formato") +
        "LISTA MAESTRA DE INFORMACIÓN DOCUMENTADA (7.5)\n\n"
        "  Código     | Documento                       | Tipo        | Ver. | Fecha     | Responsable | Ubicación\n"
        "  -----------|---------------------------------|-------------|------|-----------|-------------|----------\n"
        "  PL-CAL-01  | Política de Calidad             | Política    | 1.0  | {{fecha}} | Calidad     | SGC\n"
        "  MN-CAL-01  | Manual de Calidad               | Manual      | 1.0  | {{fecha}} | Calidad     | SGC\n"
        "  PR-DOC-01  | Control de Información Document. | Procedimiento| 1.0 | {{fecha}} | Calidad     | SGC\n\n"
        "  (Registra cada documento vigente. Los obsoletos se retiran o se identifican como tales.)\n"
        "Mantiene: Responsable de Calidad   Fecha de actualización: {{fecha}}"))

    P.append(("FR-LMR-01", "Lista Maestra de Registros", "FORMATO", "7.5.3",
        "Control de registros: soporte, ubicación, retención y disposición.", False,
        encabezado("FR-LMR-01", "Lista Maestra de Registros", "Formato") +
        "LISTA MAESTRA DE REGISTROS (7.5.3)\n\n"
        "  Código     | Registro                        | Proceso     | Soporte | Ubicación   | Retención | Disposición\n"
        "  -----------|---------------------------------|-------------|---------|-------------|-----------|------------\n"
        "  REG-CAL-01 | Inspección de entrada           | Compras     | Ambos   | SGC         | 24 meses  | Archivar\n"
        "  REG-CAL-02 | No conformidades                | Calidad     | Digital | SGC         | 36 meses  | Conservar\n"
        "  REG-CAL-03 | Calibración de equipos          | Laboratorio | Ambos   | Metrología  | 60 meses  | Conservar\n\n"
        "  Disposición al vencer la retención: Eliminar / Archivar / Conservar.\n"
        "Mantiene: Responsable de Calidad   Fecha: {{fecha}}"))

    P.append(("FR-PERF-01", "Descripción de Puesto y Perfil de Competencias", "FORMATO", "7.2",
        "Define funciones, requisitos y competencias requeridas por puesto.", False,
        encabezado("FR-PERF-01", "Descripción de Puesto y Perfil de Competencias", "Formato") +
        "DESCRIPCIÓN DE PUESTO (7.2)\n\n"
        "  Puesto: ______________________   Área: ______________________\n"
        "  Reporta a: ____________________   Personal a cargo: ___________\n\n"
        "  MISIÓN DEL PUESTO: ___________________________________________\n"
        "  FUNCIONES Y RESPONSABILIDADES:\n"
        "    1. _______________________________________________________\n"
        "    2. _______________________________________________________\n\n"
        "  REQUISITOS\n"
        "    Escolaridad: ____________   Experiencia: ____________\n"
        "    Formación/certificaciones: __________________________\n\n"
        "  COMPETENCIAS REQUERIDAS (nivel 1 Básico — 4 Experto)\n"
        "    Competencia                  | Tipo        | Nivel req. | Obligatoria\n"
        "    -----------------------------|-------------|-----------|------------\n"
        "                                 |             |           |\n\n"
        "Elaboró (RH): ______________   Aprobó: ______________   Fecha: {{fecha}}"))

    P.append(("PN-CAP-01", "Plan Anual de Capacitación", "PLAN", "7.2",
        "Programa de formación derivado de las brechas de competencia.", False,
        encabezado("PN-CAP-01", "Plan Anual de Capacitación", "Plan") +
        "PLAN ANUAL DE CAPACITACIÓN — AÑO {{anio}} (7.2)\n\n"
        "  Curso / tema             | Dirigido a       | Modalidad | Mes  | Horas | Proveedor | Eficacia\n"
        "  -------------------------|------------------|-----------|------|-------|-----------|----------\n"
        "  Inducción al SGC         | Personal nuevo   | Interna   |      |       |           | ☐\n"
        "  Auditor interno ISO 9001 | Equipo de calidad| Externa   |      |       |           | ☐\n"
        "  Análisis de causa raíz   | Líderes de área  | Interna   |      |       |           | ☐\n\n"
        "  La eficacia de la formación se evalúa tras el curso (examen, observación o "
        "desempeño) y se registra en la evaluación de competencias.\n"
        "Elaboró (RH): ______________   Aprobó: ______________   Fecha: {{fecha}}"))

    # ── Operación y evaluación (cláusulas 8-9) ──────────────────────────────
    P.append(("IT-GEN-01", "Instructivo de Trabajo (plantilla)", "INSTRUCTIVO", "8.5",
        "Estructura base para instructivos de operación paso a paso.", False,
        encabezado("IT-GEN-01", "Instructivo de Trabajo", "Instructivo") +
        "1. OBJETIVO\nDescribir paso a paso cómo realizar [actividad] de forma segura y consistente.\n\n"
        "2. ALCANCE\nAplica a [operación / equipo / estación] en {{empresa}}.\n\n"
        "3. MATERIALES Y EQUIPO\n  • ______________   • ______________   • ______________\n\n"
        "4. SEGURIDAD (antes de iniciar)\n  • EPP requerido: ______________   • Precauciones: ______________\n\n"
        "5. PROCEDIMIENTO PASO A PASO\n"
        "  Paso | Actividad                          | Punto de control / criterio\n"
        "  -----|------------------------------------|----------------------------\n"
        "   1   |                                    |\n"
        "   2   |                                    |\n"
        "   3   |                                    |\n\n"
        "6. QUÉ HACER SI ALGO SALE MAL\n  ______________________________________________\n\n"
        "7. REGISTROS GENERADOS\n  ______________________________________________\n\n"
        "Elaboró: ______________   Aprobó: ______________   Fecha: {{fecha}}"))

    P.append(("FR-SAT-01", "Encuesta de Satisfacción del Cliente", "FORMATO", "9.1.2",
        "Instrumento para medir la percepción del cliente (CSAT / NPS).", False,
        encabezado("FR-SAT-01", "Encuesta de Satisfacción del Cliente", "Formato") +
        "ENCUESTA DE SATISFACCIÓN DEL CLIENTE (9.1.2)\n\n"
        "  Cliente: ______________________   Fecha: {{fecha}}\n"
        "  Producto/servicio evaluado: ______________________\n\n"
        "  Califica del 1 (muy malo) al 5 (excelente):\n"
        "    1. Calidad del producto/servicio ............ ☐1 ☐2 ☐3 ☐4 ☐5\n"
        "    2. Cumplimiento de tiempos de entrega ....... ☐1 ☐2 ☐3 ☐4 ☐5\n"
        "    3. Atención y servicio ...................... ☐1 ☐2 ☐3 ☐4 ☐5\n"
        "    4. Relación valor / precio .................. ☐1 ☐2 ☐3 ☐4 ☐5\n\n"
        "  NPS — ¿Qué tan probable es que nos recomiendes? (0 a 10): ______\n\n"
        "  ¿Qué podemos mejorar? ________________________________________\n"
        "  ¿Tuviste algún problema? ☐ No  ☐ Sí → describe: ______________\n\n"
        "  (Tabula los resultados en el módulo de Quejas y Satisfacción para obtener CSAT/NPS.)"))

    return P


# Lista de verificación de auditoría por cláusula (reutilizable).
CHECKLIST_ITEMS = [
    ("4.1", "¿Se han determinado las cuestiones internas y externas pertinentes?", "Análisis FODA / contexto documentado."),
    ("4.2", "¿Se identificaron las partes interesadas y sus requisitos?", "Listado de partes interesadas y necesidades."),
    ("4.3", "¿Está definido y documentado el alcance del SGC?", "Documento de alcance."),
    ("5.2", "¿Existe una política de calidad comunicada y entendida?", "Política firmada y evidencia de difusión."),
    ("6.1", "¿Se identifican y tratan riesgos y oportunidades?", "Matriz de riesgos con planes."),
    ("6.2", "¿Hay objetivos de calidad medibles con seguimiento?", "Objetivos con metas y avance."),
    ("7.2", "¿El personal es competente y se evalúa?", "Perfiles, evaluaciones y capacitación."),
    ("7.5", "¿La información documentada está controlada?", "Lista maestra; versiones; documentos vigentes."),
    ("8.4", "¿Se controlan y evalúan los proveedores externos?", "Evaluaciones de proveedor."),
    ("8.7", "¿Se controlan las salidas no conformes?", "Registro de salidas no conformes y disposición."),
    ("9.1", "¿Se realiza seguimiento, medición y análisis?", "KPIs con mediciones y análisis."),
    ("9.2", "¿Se ejecutan auditorías internas planificadas?", "Programa, planes, informes y hallazgos."),
    ("9.3", "¿La dirección revisa el SGC periódicamente?", "Actas de revisión por la dirección."),
    ("10.2", "¿Las no conformidades generan acción correctiva eficaz?", "Registro CAPA con verificación de eficacia."),
]


class Command(BaseCommand):
    help = "Carga las plantillas ISO globales (profesionales) y el checklist de auditoría."

    def handle(self, *args, **o):
        plantillas = _plantillas()
        creadas = actualizadas = 0
        for orden, (codigo, nombre, cat, clausula, desc, oblig, cuerpo) in enumerate(plantillas):
            descripcion = desc or f"{nombre} conforme a ISO 9001:2015, cláusula {clausula}."
            _, created = PlantillaDocumento.objects.update_or_create(
                empresa=None, codigo=codigo,
                defaults=dict(nombre=nombre, categoria=cat, clausula=clausula,
                              descripcion=descripcion, obligatoria=oblig, contenido=cuerpo,
                              orden=orden, activa=True),
            )
            if created:
                creadas += 1
            else:
                actualizadas += 1

        norma = Norma.objects.filter(codigo__icontains="9001").first()
        chk, _ = PlantillaChecklist.objects.get_or_create(
            empresa=None, nombre="Lista de verificación ISO 9001:2015",
            defaults=dict(descripcion="Checklist base por cláusula para auditoría interna.", norma=norma))
        items = 0
        for orden, (clausula, pregunta, guia) in enumerate(CHECKLIST_ITEMS):
            _, created = ItemChecklist.objects.get_or_create(
                checklist=chk, pregunta=pregunta,
                defaults=dict(clausula=clausula, guia=guia, orden=orden))
            if created:
                items += 1

        self.stdout.write(self.style.SUCCESS(
            f"Plantillas ISO profesionales: {len(plantillas)} ({creadas} nuevas, {actualizadas} actualizadas). "
            f"Checklist con {items} items nuevos."))
