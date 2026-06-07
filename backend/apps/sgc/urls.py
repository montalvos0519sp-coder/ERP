from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    EncuestaViewSet, encuesta_publica, responder_encuesta,
    AccionCAPAViewSet, AcuerdoRevisionViewSet, ActividadViewSet, AuditoriaViewSet,
    CapacitacionViewSet, ParticipanteCapacitacionViewSet, ComentarioViewSet,
    DashboardSGCViewSet, ElementoContextoViewSet, EquipoViewSet, EvaluacionCompetenciaViewSet,
    EvaluacionProveedorViewSet, EvaluacionRequisitoViewSet, EvidenciaViewSet, HallazgoViewSet,
    IndicadorKPIViewSet, MedicionKPIViewSet, MiembrosViewSet, MisPendientesViewSet,
    NoConformidadViewSet, NotificacionViewSet, NormaViewSet, ObjetivoCalidadViewSet,
    ParteInteresadaViewSet, PerfilPuestoViewSet, PoliticaCalidadViewSet, ProcesoViewSet,
    QuejaViewSet, RequisitoISOViewSet, RevisionDireccionViewSet, RiesgoViewSet,
    SubtareaImplementacionViewSet, TareaImplementacionViewSet, TareaObjetivoViewSet,
    CompetenciaPerfilViewSet, EvaluacionDetalleViewSet, SalidaNoConformeViewSet,
    PlantillaDocumentoViewSet, HitoCertificacionViewSet, ProgramaAuditoriaViewSet,
    PlantillaChecklistViewSet, ItemChecklistViewSet, RegistroCalidadViewSet,
    GestionCambioViewSet, ComunicacionSGCViewSet, ConocimientoOrganizacionalViewSet,
    OnboardingSGCViewSet,
)

router = DefaultRouter()
router.register(r"normas", NormaViewSet, basename="norma")
router.register(r"requisitos", RequisitoISOViewSet, basename="requisito-iso")
router.register(r"diagnostico", EvaluacionRequisitoViewSet, basename="evaluacion-requisito")
router.register(r"no-conformidades", NoConformidadViewSet, basename="no-conformidad")
router.register(r"auditorias", AuditoriaViewSet, basename="auditoria")
router.register(r"hallazgos", HallazgoViewSet, basename="hallazgo")
router.register(r"riesgos", RiesgoViewSet, basename="riesgo")
router.register(r"kpis", IndicadorKPIViewSet, basename="kpi")
router.register(r"capacitaciones", CapacitacionViewSet, basename="capacitacion")
router.register(r"participantes-capacitacion", ParticipanteCapacitacionViewSet, basename="participante-capacitacion")
router.register(r"equipos", EquipoViewSet, basename="equipo-sgc")
router.register(r"evaluaciones-proveedor", EvaluacionProveedorViewSet, basename="evaluacion-proveedor")
router.register(r"quejas", QuejaViewSet, basename="queja")
router.register(r"politica", PoliticaCalidadViewSet, basename="politica")
router.register(r"objetivos", ObjetivoCalidadViewSet, basename="objetivo")
router.register(r"contexto", ElementoContextoViewSet, basename="contexto")
router.register(r"partes-interesadas", ParteInteresadaViewSet, basename="parte-interesada")
router.register(r"revisiones-direccion", RevisionDireccionViewSet, basename="revision-direccion")
router.register(r"perfiles-puesto", PerfilPuestoViewSet, basename="perfil-puesto")
router.register(r"competencias", EvaluacionCompetenciaViewSet, basename="competencia")
router.register(r"dashboard", DashboardSGCViewSet, basename="dashboard-sgc")
# Colaboración (Pilar 1)
router.register(r"miembros", MiembrosViewSet, basename="miembro-sgc")
router.register(r"comentarios", ComentarioViewSet, basename="comentario-sgc")
router.register(r"actividad", ActividadViewSet, basename="actividad-sgc")
router.register(r"notificaciones", NotificacionViewSet, basename="notificacion-sgc")
router.register(r"mis-pendientes", MisPendientesViewSet, basename="mis-pendientes-sgc")
# Pilar 2 · Implementación (Kanban)
router.register(r"implementacion", TareaImplementacionViewSet, basename="implementacion-sgc")
# Pilar 3 · CAPA avanzado
router.register(r"acciones-capa", AccionCAPAViewSet, basename="accion-capa")
router.register(r"evidencias", EvidenciaViewSet, basename="evidencia-sgc")
# Pilar 4 · Procesos + mediciones KPI
router.register(r"procesos", ProcesoViewSet, basename="proceso-sgc")
router.register(r"mediciones-kpi", MedicionKPIViewSet, basename="medicion-kpi")
router.register(r"tareas-objetivo", TareaObjetivoViewSet, basename="tarea-objetivo")
router.register(r"subtareas-implementacion", SubtareaImplementacionViewSet, basename="subtarea-impl")
router.register(r"acuerdos-revision", AcuerdoRevisionViewSet, basename="acuerdo-revision")
router.register(r"encuestas", EncuestaViewSet, basename="encuesta")
router.register(r"competencias-perfil", CompetenciaPerfilViewSet, basename="competencia-perfil")
router.register(r"evaluacion-detalles", EvaluacionDetalleViewSet, basename="evaluacion-detalle")
router.register(r"salidas-no-conformes", SalidaNoConformeViewSet, basename="salida-no-conforme")
# Ecosistema de certificación
router.register(r"plantillas", PlantillaDocumentoViewSet, basename="plantilla-doc")
router.register(r"roadmap", HitoCertificacionViewSet, basename="hito-certificacion")
router.register(r"programa-auditorias", ProgramaAuditoriaViewSet, basename="programa-auditoria")
router.register(r"checklists", PlantillaChecklistViewSet, basename="checklist-auditoria")
router.register(r"checklist-items", ItemChecklistViewSet, basename="item-checklist")
router.register(r"registros", RegistroCalidadViewSet, basename="registro-calidad")
router.register(r"cambios", GestionCambioViewSet, basename="gestion-cambio")
router.register(r"comunicacion", ComunicacionSGCViewSet, basename="comunicacion-sgc")
router.register(r"conocimiento", ConocimientoOrganizacionalViewSet, basename="conocimiento-sgc")
router.register(r"onboarding", OnboardingSGCViewSet, basename="onboarding-sgc")
urlpatterns = router.urls + [
    # Públicas (sin autenticación): responder por token.
    path("encuesta-publica/<str:token>/", encuesta_publica, name="encuesta-publica"),
    path("encuesta-publica/<str:token>/responder/", responder_encuesta, name="encuesta-responder"),
]
