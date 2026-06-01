"""Carga los catalogos SAT fijos de Complemento Nomina 1.2.

Estos catalogos son chicos (<200 entradas) y rara vez cambian, por eso van
seedeados a codigo en lugar de Excel.

Fuente oficial:
  https://www.sat.gob.mx/sitio_internet/cfd/catalogos/Nomina/catNomina.xsd
"""
from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.catalogos_sat.models import (
    SatBanco,
    SatPeriodicidadPago,
    SatRegimenFiscal,
    SatRiesgoPuesto,
    SatTipoContrato,
    SatTipoDeduccion,
    SatTipoIncapacidad,
    SatTipoJornada,
    SatTipoNomina,
    SatTipoOtroPago,
    SatTipoPercepcion,
    SatTipoRegimen,
    SatUsoCFDI,
)


TIPOS_CONTRATO = [
    ("01", "Contrato de trabajo por tiempo indeterminado"),
    ("02", "Contrato de trabajo para obra determinada"),
    ("03", "Contrato de trabajo por tiempo determinado"),
    ("04", "Contrato de trabajo por temporada"),
    ("05", "Contrato de trabajo sujeto a prueba"),
    ("06", "Contrato de trabajo con capacitacion inicial"),
    ("07", "Modalidad de contratacion por pago de hora laborada"),
    ("08", "Modalidad de trabajo por comision laboral"),
    ("09", "Modalidades de contratacion donde no existe relacion de trabajo"),
    ("10", "Jubilacion, pension, retiro"),
    ("99", "Otro contrato"),
]

TIPOS_JORNADA = [
    ("01", "Diurna"),
    ("02", "Nocturna"),
    ("03", "Mixta"),
    ("04", "Por hora"),
    ("05", "Reducida"),
    ("06", "Continuada"),
    ("07", "Partida"),
    ("08", "Por turnos"),
    ("99", "Otra jornada"),
]

TIPOS_REGIMEN = [
    ("02", "Sueldos y Salarios"),
    ("03", "Jubilados"),
    ("04", "Pensionados"),
    ("05", "Asimilados a salarios, Miembros de las Sociedades Cooperativas de Produccion"),
    ("06", "Asimilados a salarios, Integrantes de Sociedades y Asociaciones Civiles"),
    ("07", "Asimilados a salarios, Miembros de consejos directivos, de vigilancia, consultivos"),
    ("08", "Asimilados a salarios, Actividad empresarial (comisionistas)"),
    ("09", "Asimilados a salarios, Honorarios asimilados a salarios"),
    ("10", "Asimilados a salarios, Ingresos acciones o titulos valor"),
    ("11", "Sindicalizado"),
    ("12", "Asimilados a salarios, Otros"),
    ("13", "Indemnizacion o Separacion"),
    ("99", "Otro Regimen"),
]

RIESGOS_PUESTO = [
    ("1", "Clase I (Riesgo minimo)"),
    ("2", "Clase II (Riesgo bajo)"),
    ("3", "Clase III (Riesgo medio)"),
    ("4", "Clase IV (Riesgo alto)"),
    ("5", "Clase V (Riesgo maximo)"),
    ("99", "No aplica"),
]

PERIODICIDAD_PAGO = [
    ("01", "Diario"),
    ("02", "Semanal"),
    ("03", "Catorcenal"),
    ("04", "Quincenal"),
    ("05", "Mensual"),
    ("06", "Bimestral"),
    ("07", "Unidad obra"),
    ("08", "Comision"),
    ("09", "Precio alzado"),
    ("10", "Decenal"),
    ("99", "Otra Periodicidad"),
]

# Bancos mas comunes en MX (c_Banco SAT). Lista parcial; el catalogo completo
# tiene ~120 entradas y se puede expandir.
BANCOS = [
    ("002", "BANAMEX"),
    ("006", "BANCOMEXT"),
    ("009", "BANOBRAS"),
    ("012", "BBVA MEXICO"),
    ("014", "SANTANDER"),
    ("019", "BANJERCITO"),
    ("021", "HSBC"),
    ("030", "BAJIO"),
    ("032", "IXE"),
    ("036", "INBURSA"),
    ("037", "INTERACCIONES"),
    ("042", "MIFEL"),
    ("044", "SCOTIABANK"),
    ("058", "BANREGIO"),
    ("059", "INVEX"),
    ("060", "BANSI"),
    ("062", "AFIRME"),
    ("072", "BANORTE"),
    ("106", "BANK OF AMERICA"),
    ("108", "MUFG"),
    ("110", "JP MORGAN"),
    ("112", "BMONEX"),
    ("113", "VE POR MAS"),
    ("116", "ING"),
    ("124", "DEUTSCHE"),
    ("126", "CREDIT SUISSE"),
    ("127", "AZTECA"),
    ("128", "AUTOFIN"),
    ("129", "BARCLAYS"),
    ("130", "COMPARTAMOS"),
    ("132", "BMULTIVA"),
    ("133", "ACTINVER"),
    ("135", "NAFIN"),
    ("136", "INTERBANCO"),
    ("137", "BANCOPPEL"),
    ("138", "ABC CAPITAL"),
    ("139", "UBS BANK"),
    ("140", "CONSUBANCO"),
    ("141", "VOLKSWAGEN"),
    ("143", "CIBANCO"),
    ("145", "BBASE"),
    ("147", "BANKAOOL"),
    ("148", "PAGATODO"),
    ("150", "INMOBILIARIO"),
    ("151", "DONDE"),
    ("152", "BANCREA"),
    ("154", "BANCO COVALTO"),
    ("155", "ICBC"),
    ("156", "SABADELL"),
    ("157", "SHINHAN"),
    ("158", "MIZUHO BANK"),
    ("159", "BANK OF CHINA"),
    ("160", "BANCO S3"),
    ("166", "BANSEFI"),
    ("168", "HIPOTECARIA FEDERAL"),
    ("638", "NU MEXICO"),  # Nu Bank
]

TIPOS_PERCEPCION = [
    ("001", "Sueldos, Salarios Rayas y Jornales"),
    ("002", "Gratificacion Anual (Aguinaldo)"),
    ("003", "Participacion de los Trabajadores en las Utilidades PTU"),
    ("004", "Reembolso de Gastos Medicos Dentales y Hospitalarios"),
    ("005", "Fondo de Ahorro"),
    ("006", "Caja de ahorro"),
    ("009", "Contribuciones a Cargo del Trabajador Pagadas por el Patron"),
    ("010", "Premios por puntualidad"),
    ("011", "Prima de Seguro de vida"),
    ("012", "Seguro de Gastos Medicos Mayores"),
    ("013", "Cuotas Sindicales Pagadas por el Patron"),
    ("014", "Subsidios por incapacidad"),
    ("015", "Becas para trabajadores y/o hijos"),
    ("019", "Horas extra"),
    ("020", "Prima dominical"),
    ("021", "Prima vacacional"),
    ("022", "Prima por antiguedad"),
    ("023", "Pagos por separacion"),
    ("024", "Seguro de retiro"),
    ("025", "Indemnizaciones"),
    ("026", "Reembolso por funeral"),
    ("027", "Cuotas de seguridad social pagadas por el patron"),
    ("028", "Comisiones"),
    ("029", "Vales de despensa"),
    ("030", "Vales de restaurante"),
    ("031", "Vales de gasolina"),
    ("032", "Vales de ropa"),
    ("033", "Ayuda para renta"),
    ("034", "Ayuda para articulos escolares"),
    ("035", "Ayuda para anteojos"),
    ("036", "Ayuda para transporte"),
    ("037", "Ayuda para gastos de funeral"),
    ("038", "Otros ingresos por salarios"),
    ("039", "Jubilaciones, pensiones o haberes de retiro"),
    ("044", "Jubilaciones, pensiones o haberes de retiro en parcialidades"),
    ("045", "Ingresos en acciones o titulos valor que representan bienes"),
    ("046", "Ingresos asimilados a salarios"),
    ("047", "Alimentacion"),
    ("048", "Habitacion"),
    ("049", "Premios por asistencia"),
    ("050", "Viaticos (gravados)"),
    ("051", "Pagos por gratificaciones, primas, etc., total separacion"),
    ("052", "Pagos por jubilacion total separacion"),
    ("053", "Pagos por jubilacion en parcialidades"),
]

TIPOS_DEDUCCION = [
    ("001", "Seguridad social"),
    ("002", "ISR"),
    ("003", "Aportaciones a retiro, cesantia en edad avanzada y vejez."),
    ("004", "Otros"),
    ("005", "Aportaciones a Fondo de vivienda"),
    ("006", "Descuento por incapacidad"),
    ("007", "Pension alimenticia"),
    ("008", "Renta"),
    ("009", "Prestamos provenientes del Fondo Nacional de la Vivienda para los Trabajadores"),
    ("010", "Pago por credito de vivienda"),
    ("011", "Pago de abonos INFONACOT"),
    ("012", "Anticipo de salarios"),
    ("013", "Pagos hechos con exceso al trabajador"),
    ("014", "Errores"),
    ("015", "Perdidas"),
    ("016", "Averias"),
    ("017", "Adquisicion de articulos producidos por la empresa o establecimiento"),
    ("018", "Cuotas para la constitucion y fomento de sociedades cooperativas y de cajas de ahorro"),
    ("019", "Cuotas sindicales"),
    ("020", "Ausencia (Ausentismo)"),
    ("021", "Cuotas obrero patronales"),
    ("022", "Impuestos Locales"),
    ("023", "Aportaciones voluntarias"),
    ("024", "Ajuste en Gratificacion Anual (Aguinaldo) Exento"),
    ("025", "Ajuste en Gratificacion Anual (Aguinaldo) Gravado"),
    ("026", "Ajuste en Participacion de los Trabajadores en las Utilidades PTU Exento"),
    ("027", "Ajuste en Participacion de los Trabajadores en las Utilidades PTU Gravado"),
    ("028", "Ajuste en Reembolso de Gastos Medicos Dentales y Hospitalarios Exento"),
    ("029", "Ajuste en Fondo de ahorro Exento"),
    ("030", "Ajuste en Caja de ahorro Exento"),
    ("031", "Ajuste en Contribuciones a Cargo del Trabajador Pagadas por el Patron Exento"),
    ("032", "Ajuste en Premios por puntualidad Gravado"),
    ("033", "Ajuste en Prima de Seguro de vida Exento"),
    ("034", "Ajuste en Seguro de Gastos Medicos Mayores Exento"),
    ("081", "Ajuste en Subsidio para el empleo (efectivamente entregado al trabajador)"),
    ("100", "Subsidio para el empleo entregado al trabajador (no aplica como dedudccion)"),
]

TIPOS_OTRO_PAGO = [
    ("001", "Reintegro de ISR pagado en exceso"),
    ("002", "Subsidio para el empleo"),
    ("003", "Viaticos (entregados al trabajador)"),
    ("004", "Aplicacion de saldo a favor por compensacion anual"),
    ("005", "Reintegro de ISR retenido en exceso de ejercicio anterior"),
    ("999", "Pagos distintos a los listados y que no deben considerarse como ingreso por sueldos, salarios o ingresos asimilados"),
]

TIPOS_NOMINA = [
    ("O", "Ordinaria"),
    ("E", "Extraordinaria"),
]

TIPOS_INCAPACIDAD = [
    ("01", "Riesgo de trabajo"),
    ("02", "Enfermedad en general"),
    ("03", "Maternidad"),
]

# Catalogos minimos que tambien usa la nomina
REGIMENES_FISCALES_MIN = [
    ("605", "Sueldos y Salarios e Ingresos Asimilados a Salarios"),
    ("601", "General de Ley Personas Morales"),
    ("612", "Personas Fisicas con Actividades Empresariales y Profesionales"),
    ("621", "Incorporacion Fiscal"),
    ("626", "Regimen Simplificado de Confianza"),
]

USOS_CFDI_MIN = [
    ("CN01", "Nomina"),
    ("G03",  "Gastos en general"),
    ("I08",  "Otra maquinaria y equipo"),
    ("S01",  "Sin efectos fiscales"),
]


class Command(BaseCommand):
    help = "Seedea los catalogos SAT fijos del complemento de nomina."

    @transaction.atomic
    def handle(self, *args, **opts):
        def _bulk(model, items, name_field="descripcion"):
            n = 0
            for clave, desc in items:
                model.objects.update_or_create(clave=clave, defaults={name_field: desc})
                n += 1
            self.stdout.write(self.style.SUCCESS(f"  -> {model.__name__}: {n}"))

        self.stdout.write(self.style.NOTICE("Seedeando catalogos SAT de nomina..."))
        _bulk(SatTipoContrato, TIPOS_CONTRATO)
        _bulk(SatTipoJornada, TIPOS_JORNADA)
        _bulk(SatTipoRegimen, TIPOS_REGIMEN)
        _bulk(SatRiesgoPuesto, RIESGOS_PUESTO)
        _bulk(SatPeriodicidadPago, PERIODICIDAD_PAGO)
        _bulk(SatTipoPercepcion, TIPOS_PERCEPCION)
        _bulk(SatTipoDeduccion, TIPOS_DEDUCCION)
        _bulk(SatTipoOtroPago, TIPOS_OTRO_PAGO)
        _bulk(SatTipoNomina, TIPOS_NOMINA)
        _bulk(SatTipoIncapacidad, TIPOS_INCAPACIDAD)
        # Bancos: usar campo `razon_social` en lugar de `descripcion`
        n = 0
        for clave, razon in BANCOS:
            SatBanco.objects.update_or_create(clave=clave, defaults={"razon_social": razon})
            n += 1
        self.stdout.write(self.style.SUCCESS(f"  -> SatBanco: {n}"))
        _bulk(SatRegimenFiscal, REGIMENES_FISCALES_MIN)
        _bulk(SatUsoCFDI, USOS_CFDI_MIN)
        self.stdout.write(self.style.SUCCESS("OK catalogos nomina seedeados."))
