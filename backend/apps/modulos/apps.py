from django.apps import AppConfig


class ModulosConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.modulos"
    label = "modulos"

    def ready(self) -> None:
        # Registra los modulos base la primera vez que arranca.
        from django.db.models.signals import post_migrate
        from . import seed

        post_migrate.connect(seed.seed_modulos, sender=self)
