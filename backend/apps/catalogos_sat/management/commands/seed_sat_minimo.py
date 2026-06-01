"""Siembra catalogos SAT pequenos comunes (UsoCFDI, FormaPago, MetodoPago, Moneda,
RegimenFiscal, TipoFigura, TipoPermiso). Datos hardcodeados con los valores oficiales,
para que el ERP funcione sin necesidad de subir Excel para estos catalogos cortos.

Uso:
    python manage.py seed_sat_minimo
"""
from __future__ import annotations

from django.core.management.base import BaseCommand

from apps.catalogos_sat.models import (
    SatConfigVehicular,
    SatFormaPago,
    SatMetodoPago,
    SatMoneda,
    SatRegimenFiscal,
    SatSubTipoRem,
    SatTipoFigura,
    SatTipoPermiso,
    SatUsoCFDI,
)


USOS_CFDI = [
    ("G01", "Adquisicion de mercancias"),
    ("G02", "Devoluciones, descuentos o bonificaciones"),
    ("G03", "Gastos en general"),
    ("I01", "Construcciones"),
    ("I02", "Mobiliario y equipo de oficina por inversiones"),
    ("I03", "Equipo de transporte"),
    ("I04", "Equipo de computo y accesorios"),
    ("I05", "Dados, troqueles, moldes, matrices y herramental"),
    ("I06", "Comunicaciones telefonicas"),
    ("I07", "Comunicaciones satelitales"),
    ("I08", "Otra maquinaria y equipo"),
    ("D01", "Honorarios medicos, dentales y gastos hospitalarios"),
    ("D02", "Gastos medicos por incapacidad o discapacidad"),
    ("D03", "Gastos funerales"),
    ("D04", "Donativos"),
    ("D05", "Intereses reales efectivamente pagados por creditos hipotecarios"),
    ("D06", "Aportaciones voluntarias al SAR"),
    ("D07", "Primas por seguros de gastos medicos"),
    ("D08", "Gastos de transportacion escolar obligatoria"),
    ("D09", "Depositos en cuentas para el ahorro, primas que tengan como base planes de pensiones"),
    ("D10", "Pagos por servicios educativos (colegiaturas)"),
    ("CP01", "Pagos"),
    ("CN01", "Nomina"),
    ("S01", "Sin efectos fiscales"),
]

FORMAS_PAGO = [
    ("01", "Efectivo"),
    ("02", "Cheque nominativo"),
    ("03", "Transferencia electronica de fondos"),
    ("04", "Tarjeta de credito"),
    ("05", "Monedero electronico"),
    ("06", "Dinero electronico"),
    ("08", "Vales de despensa"),
    ("12", "Dacion en pago"),
    ("13", "Pago por subrogacion"),
    ("14", "Pago por consignacion"),
    ("15", "Condonacion"),
    ("17", "Compensacion"),
    ("23", "Novacion"),
    ("24", "Confusion"),
    ("25", "Remision de deuda"),
    ("26", "Prescripcion o caducidad"),
    ("27", "A satisfaccion del acreedor"),
    ("28", "Tarjeta de debito"),
    ("29", "Tarjeta de servicios"),
    ("30", "Aplicacion de anticipos"),
    ("31", "Intermediario pagos"),
    ("99", "Por definir"),
]

METODOS_PAGO = [
    ("PUE", "Pago en una sola exhibicion"),
    ("PPD", "Pago en parcialidades o diferido"),
]

MONEDAS = [
    ("MXN", "Peso Mexicano", 2),
    ("USD", "Dolar americano", 2),
    ("EUR", "Euro", 2),
    ("XXX", "Sin moneda", 0),
]

REGIMENES = [
    ("601", "General de Ley Personas Morales", False, True),
    ("603", "Personas Morales con Fines no Lucrativos", False, True),
    ("605", "Sueldos y Salarios e Ingresos Asimilados a Salarios", True, False),
    ("606", "Arrendamiento", True, False),
    ("607", "Regimen de Enajenacion o Adquisicion de Bienes", True, False),
    ("608", "Demas ingresos", True, False),
    ("609", "Consolidacion", False, True),
    ("610", "Residentes en el Extranjero sin Establecimiento Permanente en Mexico", True, True),
    ("611", "Ingresos por Dividendos (socios y accionistas)", True, False),
    ("612", "Personas Fisicas con Actividades Empresariales y Profesionales", True, False),
    ("614", "Ingresos por intereses", True, False),
    ("615", "Regimen de los ingresos por obtencion de premios", True, False),
    ("616", "Sin obligaciones fiscales", True, False),
    ("620", "Sociedades Cooperativas de Produccion que optan por diferir sus ingresos", False, True),
    ("621", "Incorporacion Fiscal", True, False),
    ("622", "Actividades Agricolas, Ganaderas, Silvicolas y Pesqueras", False, True),
    ("623", "Opcional para Grupos de Sociedades", False, True),
    ("624", "Coordinados", False, True),
    ("625", "Regimen de las Actividades Empresariales con ingresos a traves de Plataformas Tecnologicas", True, False),
    ("626", "Regimen Simplificado de Confianza", True, True),
]

TIPOS_FIGURA = [
    ("01", "Operador"),
    ("02", "Propietario"),
    ("03", "Arrendador"),
    ("04", "Notificado"),
]

TIPOS_PERMISO = [
    ("TPAF01", "Autotransporte Federal de carga general"),
    ("TPAF02", "Transporte privado de carga"),
    ("TPAF03", "Autotransporte Federal de Carga Especializada de materiales y residuos peligrosos"),
    ("TPAF04", "Transporte de automoviles sin rodar en vehiculo tipo gondola"),
    ("TPAF05", "Transporte de carga de gran peso y/o volumen de hasta 90 toneladas"),
    ("TPAF06", "Transporte de carga especializada de fondos y valores"),
    ("TPAF07", "Transporte de gruas de arrastre y gruas de arrastre y salvamento y deposito de vehiculos"),
    ("TPAF08", "Servicio auxiliar de arrastre en las vias generales de comunicacion"),
    ("TPAF09", "Servicio auxiliar de servicios de arrastre, arrastre y salvamento y deposito de vehiculos"),
    ("TPAF10", "Servicio de paqueteria y mensajeria"),
    ("TPAF11", "Transporte especial para el transito terrestre transfronterizo"),
    ("TPAF12", "Servicio federal para empresas comercializadoras de servicios de transporte federal"),
    ("TPAF13", "Transporte de materiales y residuos peligrosos"),
]


class Command(BaseCommand):
    help = "Siembra catalogos SAT pequenos (UsoCFDI, FormaPago, etc) sin necesidad de Excel."

    def handle(self, *args, **opts):
        for clave, desc in USOS_CFDI:
            SatUsoCFDI.objects.update_or_create(clave=clave, defaults={"descripcion": desc})
        self.stdout.write(self.style.SUCCESS(f"UsoCFDI: {len(USOS_CFDI)}"))

        for clave, desc in FORMAS_PAGO:
            SatFormaPago.objects.update_or_create(clave=clave, defaults={"descripcion": desc})
        self.stdout.write(self.style.SUCCESS(f"FormaPago: {len(FORMAS_PAGO)}"))

        for clave, desc in METODOS_PAGO:
            SatMetodoPago.objects.update_or_create(clave=clave, defaults={"descripcion": desc})
        self.stdout.write(self.style.SUCCESS(f"MetodoPago: {len(METODOS_PAGO)}"))

        for clave, desc, dec in MONEDAS:
            SatMoneda.objects.update_or_create(clave=clave, defaults={"descripcion": desc, "decimales": dec})
        self.stdout.write(self.style.SUCCESS(f"Moneda: {len(MONEDAS)}"))

        for clave, desc, fis, mor in REGIMENES:
            SatRegimenFiscal.objects.update_or_create(
                clave=clave, defaults={"descripcion": desc, "fisica": fis, "moral": mor},
            )
        self.stdout.write(self.style.SUCCESS(f"RegimenFiscal: {len(REGIMENES)}"))

        for clave, desc in TIPOS_FIGURA:
            SatTipoFigura.objects.update_or_create(clave=clave, defaults={"descripcion": desc})
        self.stdout.write(self.style.SUCCESS(f"TipoFigura: {len(TIPOS_FIGURA)}"))

        for clave, desc in TIPOS_PERMISO:
            SatTipoPermiso.objects.update_or_create(clave=clave, defaults={"descripcion": desc})
        self.stdout.write(self.style.SUCCESS(f"TipoPermiso: {len(TIPOS_PERMISO)}"))
