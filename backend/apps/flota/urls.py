from rest_framework.routers import DefaultRouter
from .views import CargaCombustibleViewSet, TermoViewSet, UnidadViewSet

router = DefaultRouter()
router.register(r"unidades", UnidadViewSet, basename="unidad")
router.register(r"termos", TermoViewSet, basename="termo")
router.register(r"cargas", CargaCombustibleViewSet, basename="carga-combustible")
urlpatterns = router.urls
