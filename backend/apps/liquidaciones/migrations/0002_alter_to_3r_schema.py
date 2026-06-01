"""Renombra y agrega campos para alinear LiquidacionOperador / ConceptoLiquidacion
con el esquema esperado por el frontend de 3rrecycling-next-main.
"""
from decimal import Decimal

from django.db import migrations, models
from django.utils import timezone


class Migration(migrations.Migration):

    dependencies = [
        ("liquidaciones", "0001_initial"),
    ]

    operations = [
        # ── LiquidacionOperador ────────────────────────────────────────
        # Renombrar campos viejos
        migrations.RenameField(
            model_name="liquidacionoperador",
            old_name="notas",
            new_name="observaciones",
        ),
        migrations.RenameField(
            model_name="liquidacionoperador",
            old_name="bonos",
            new_name="total_extras",
        ),
        migrations.RenameField(
            model_name="liquidacionoperador",
            old_name="descuentos",
            new_name="total_descuentos",
        ),
        migrations.RenameField(
            model_name="liquidacionoperador",
            old_name="total",
            new_name="total_pagar",
        ),
        # El campo viejo `total_viajes` era PositiveIntegerField (count).
        # Lo borramos y lo recreamos como Decimal (monto). Como es DEV
        # asumimos que no hay datos a preservar — si existen, perderan el conteo.
        migrations.RemoveField(model_name="liquidacionoperador", name="total_viajes"),
        migrations.RemoveField(model_name="liquidacionoperador", name="monto_viajes"),
        migrations.AddField(
            model_name="liquidacionoperador",
            name="total_viajes",
            field=models.DecimalField(default=Decimal("0"), max_digits=14, decimal_places=2),
        ),
        # Campos nuevos
        migrations.AddField(
            model_name="liquidacionoperador",
            name="fecha_pago",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="liquidacionoperador",
            name="creado_en",
            field=models.DateTimeField(default=timezone.now),
            preserve_default=False,
        ),
        migrations.AlterModelOptions(
            name="liquidacionoperador",
            options={"ordering": ["-creado_en"]},
        ),

        # ── ConceptoLiquidacion ─────────────────────────────────────────
        # Cambiar choices del campo tipo: BONO→EXTRA, DESC→DESCUENTO
        # Como es CharField, los datos viejos quedan pero los nuevos usan
        # los valores nuevos. Esto es DEV, no hace falta data migration.
        migrations.AlterField(
            model_name="conceptoliquidacion",
            name="tipo",
            field=models.CharField(max_length=10, choices=[
                ("VIAJE", "Viaje"),
                ("EXTRA", "Bono / extra"),
                ("DESCUENTO", "Descuento"),
            ]),
        ),
        migrations.AlterField(
            model_name="conceptoliquidacion",
            name="monto",
            field=models.DecimalField(default=Decimal("0"), max_digits=12, decimal_places=2),
        ),
        # related_name nuevo para el FK a Viaje
        migrations.AlterField(
            model_name="conceptoliquidacion",
            name="viaje",
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=models.SET_NULL,
                to="viajes.viaje",
                related_name="liquidacion_conceptos",
            ),
        ),
        migrations.AlterModelOptions(
            name="conceptoliquidacion",
            options={"ordering": ["tipo", "id"]},
        ),
    ]
