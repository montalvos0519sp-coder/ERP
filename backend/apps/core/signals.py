"""Signals del modulo core. Crea PerfilUsuario y ConfiguracionEmpresa por defecto."""
from django.conf import settings
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import ConfiguracionEmpresa, Empresa, PerfilUsuario


@receiver(post_save, sender=User)
def crear_perfil_usuario(sender, instance, created, **kwargs):
    if created:
        PerfilUsuario.objects.get_or_create(user=instance)


@receiver(post_save, sender=Empresa)
def crear_configuracion_empresa(sender, instance, created, **kwargs):
    if created:
        ConfiguracionEmpresa.objects.get_or_create(empresa=instance)
