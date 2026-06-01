"""Bootstrap inicial del ERP. Crea una empresa demo, un usuario superadmin y le
asigna todos los modulos para que el sistema sea utilizable inmediatamente.

Uso:
    python manage.py bootstrap                       # demo empresa, admin/admin12345
    python manage.py bootstrap --user mario --pass xxxx
"""
from __future__ import annotations

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from apps.core.models import ConfiguracionEmpresa, Empresa, UsuarioEmpresa
from apps.modulos.models import AsignacionModulo, Modulo, ModuloEmpresa


class Command(BaseCommand):
    help = "Crea empresa demo + superadmin + activa todos los modulos."

    def add_arguments(self, parser):
        parser.add_argument("--user", default="admin")
        parser.add_argument("--pass", default="admin12345", dest="password")
        parser.add_argument("--email", default="admin@erp.local")
        parser.add_argument("--rfc", default="DEMO010101AAA")
        parser.add_argument("--empresa", default="ERP Profesional Demo")

    def handle(self, *args, **opts):
        # ── Empresa demo ──
        empresa, creada = Empresa.objects.get_or_create(
            rfc=opts["rfc"],
            defaults={
                "nombre_comercial": opts["empresa"],
                "razon_social": opts["empresa"].upper(),
                "regimen_fiscal": "601",
                "cp_fiscal": "00000",
            },
        )
        self.stdout.write(self.style.SUCCESS(f"Empresa: {empresa.nombre_comercial} (nueva={creada})"))

        # ── Configuracion default (PAC manual) ──
        ConfiguracionEmpresa.objects.get_or_create(empresa=empresa)
        empresa.config.pac_proveedor = "manual"
        empresa.config.emisor_rfc = empresa.rfc
        empresa.config.emisor_nombre = empresa.razon_social
        empresa.config.emisor_cp = empresa.cp_fiscal
        empresa.config.save()

        # ── Superadmin ──
        user, creado_u = User.objects.get_or_create(
            username=opts["user"],
            defaults={"email": opts["email"], "is_staff": True, "is_superuser": True},
        )
        user.set_password(opts["password"])
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.save()
        self.stdout.write(self.style.SUCCESS(f"Usuario: {user.username} (nuevo={creado_u})"))

        # ── Membresia con rol OWNER ──
        UsuarioEmpresa.objects.update_or_create(
            user=user, empresa=empresa,
            defaults={"rol": "OWNER", "activo": True},
        )

        # ── Activa todos los modulos en la empresa ──
        for m in Modulo.objects.all():
            ModuloEmpresa.objects.update_or_create(
                empresa=empresa, modulo=m, defaults={"activo": True, "activado_por": user},
            )
            AsignacionModulo.objects.update_or_create(
                user=user, empresa=empresa, modulo=m,
                defaults={"activo": True, "asignado_por": user},
            )

        # Apunta empresa activa en el perfil del usuario.
        perfil = user.perfil
        perfil.empresa_activa = empresa
        perfil.save()

        self.stdout.write(self.style.SUCCESS(
            f"\nBootstrap OK. Entra con:  usuario='{opts['user']}'  password='{opts['password']}'"
        ))
