from django.urls import path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("conversaciones", views.ConversationViewSet, basename="chat-conv")

urlpatterns = [
    path("no-leidos/", views.no_leidos, name="chat-no-leidos"),
    path("usuarios/", views.usuarios, name="chat-usuarios"),
]
urlpatterns += router.urls
