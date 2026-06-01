"""Carga clientes y proveedores ficticios para demo.

Uso:
    python manage.py seed_clientes_proveedores_demo [--empresa 1]

Idempotente: get_or_create por (empresa, rfc). El domicilio de los clientes se
autocompleta con datos reales del catálogo SAT a partir del C.P.
"""
from __future__ import annotations

from django.core.management.base import BaseCommand

from apps.core.models import Empresa
from apps.cxp.models import Proveedor
from apps.facturacion.models import Cliente
from apps.catalogos_sat.models import SatCodigoPostal, SatColonia, SatEstado, SatMunicipio

# rfc, razon_social, regimen, cp, uso, calle, num_ext, email, tel
CLIENTES = [
    ("CDC130711RV2", "CADENA DE COMIDA MEXICANA", "601", "64480", "G03", "Calle Edison", "1235", "compras@cadenacomida.mx", "8181234567"),
    ("ABC010203AB1", "ABARROTES DEL NORTE SA DE CV", "601", "64000", "G03", "Av. Constitución", "450", "pagos@abarrotesnorte.mx", "8189876543"),
    ("XYZ980512QW3", "TRANSPORTES Y LOGISTICA XYZ", "626", "44100", "G03", "Av. Vallarta", "1200", "admin@logisticaxyz.mx", "3331112233"),
    ("COM050607ER4", "COMERCIALIZADORA CENTRAL", "601", "06600", "G01", "Río Lerma", "232", "facturas@comcentral.mx", "5544556677"),
    ("IND070809TY5", "INDUSTRIAL CHIHUAHUA SA", "601", "31000", "G03", "Av. Universidad", "33", "cuentas@indchihuahua.mx", "6141234567"),
    ("SER111213UI6", "SERVICIOS PROFESIONALES SP", "612", "64640", "G03", "Av. Gómez Morín", "955", "contacto@serviciospro.mx", "8112223344"),
]

# rfc, razon_social, nombre_comercial, banco, cuenta, clabe, dias_credito, saldo_favor, autorizado, requiere_xml, email, tel
PROVEEDORES = [
    ("REF150101AA1", "REFACCIONES DIESEL DEL NORTE SA", "RefiDiesel", "BBVA", "0123456789", "012580001234567890", 30, 0, True, True, "ventas@refidiesel.mx", "8181000001"),
    ("LLA160202BB2", "LLANTAS Y SERVICIOS MONTERREY", "LlanServ", "Banorte", "9876543210", "072580009876543210", 15, 1500.50, True, False, "cotizaciones@llanserv.mx", "8181000002"),
    ("LUB170303CC3", "LUBRICANTES INDUSTRIALES SA", "LubInd", "Santander", "4455667788", "014580004455667788", 0, 0, False, False, "pedidos@lubind.mx", "8181000003"),
    ("HER180404DD4", "HERRAMIENTAS Y EQUIPO PRO", "HerraPro", "HSBC", "1122334455", "021580001122334455", 45, 0, True, True, "ventas@herrapro.mx", "8181000004"),
    ("ELE190505EE5", "ELECTRICOS Y FRENOS GARCIA", "FrenosGarcia", "Banamex", "5566778899", "002580005566778899", 7, 320, False, False, "garcia@frenos.mx", "8181000005"),
    ("PAP200606FF6", "PAPELERIA Y OFICINA TOTAL", "OfiTotal", "BBVA", "6677889900", "012580006677889900", 0, 0, True, False, "ventas@ofitotal.mx", "8181000006"),
]


_ESTADOS_MX = {
    "AGU": "Aguascalientes", "BCN": "Baja California", "BCS": "Baja California Sur",
    "CAM": "Campeche", "CHP": "Chiapas", "CHH": "Chihuahua", "COA": "Coahuila",
    "COL": "Colima", "CMX": "Ciudad de Mexico", "DIF": "Ciudad de Mexico",
    "DUR": "Durango", "GUA": "Guanajuato", "GRO": "Guerrero", "HID": "Hidalgo",
    "JAL": "Jalisco", "MEX": "Mexico", "MIC": "Michoacan", "MOR": "Morelos",
    "NAY": "Nayarit", "NLE": "Nuevo Leon", "OAX": "Oaxaca", "PUE": "Puebla",
    "QUE": "Queretaro", "ROO": "Quintana Roo", "SLP": "San Luis Potosi",
    "SIN": "Sinaloa", "SON": "Sonora", "TAB": "Tabasco", "TAM": "Tamaulipas",
    "TLA": "Tlaxcala", "VER": "Veracruz", "YUC": "Yucatan", "ZAC": "Zacatecas",
}


def _domicilio(cp: str) -> dict:
    row = SatCodigoPostal.objects.filter(codigo_postal=cp).first()
    if not row:
        return {"estado": "", "municipio": "", "colonia": "", "pais": "MEX"}
    db_nombre = SatEstado.objects.filter(clave=row.estado).values_list("nombre", flat=True).first() or ""
    # Si el catálogo se cargó sin nombres legibles (nombre == clave), usar fallback.
    estado = db_nombre if (db_nombre and db_nombre != row.estado) else _ESTADOS_MX.get(row.estado, db_nombre or row.estado)
    muni = SatMunicipio.objects.filter(estado=row.estado, clave=row.municipio).values_list("nombre", flat=True).first() or ""
    colonia = SatColonia.objects.filter(codigo_postal=cp).order_by("nombre").values_list("nombre", flat=True).first() or ""
    return {"estado": estado, "municipio": muni, "colonia": colonia, "pais": "MEX"}


class Command(BaseCommand):
    help = "Crea clientes y proveedores ficticios de demostración."

    def add_arguments(self, parser):
        parser.add_argument("--empresa", type=int, default=None)

    def handle(self, *args, **options):
        emp = Empresa.objects.filter(id=options["empresa"]).first() if options["empresa"] else Empresa.objects.first()
        if not emp:
            self.stderr.write(self.style.ERROR("No hay empresa."))
            return

        nc = 0
        for rfc, razon, regimen, cp, uso, calle, num, email, tel in CLIENTES:
            dom = _domicilio(cp)
            obj, created = Cliente.objects.get_or_create(empresa=emp, rfc=rfc, defaults={"razon_social": razon})
            obj.razon_social = razon
            obj.regimen_fiscal = regimen
            obj.cp_fiscal = cp
            obj.uso_cfdi_default = uso
            obj.calle = calle
            obj.num_ext = num
            obj.email = email
            obj.telefono = tel
            obj.colonia = dom["colonia"]
            obj.municipio = dom["municipio"]
            obj.estado = dom["estado"]
            obj.pais = dom["pais"]
            obj.direccion = f"{calle} {num}, {dom['colonia']}, {dom['municipio']}, {dom['estado']}"
            obj.activo = True
            obj.save()
            nc += int(created)

        npv = 0
        for rfc, razon, ncomercial, banco, cuenta, clabe, dias, saldo, autoriza, xml, email, tel in PROVEEDORES:
            obj, created = Proveedor.objects.get_or_create(empresa=emp, rfc=rfc, defaults={"razon_social": razon})
            obj.razon_social = razon
            obj.nombre_comercial = nomerc = ncomercial
            obj.banco = banco
            obj.cuenta = cuenta
            obj.clabe = clabe
            obj.dias_credito = dias
            obj.saldo_a_favor = saldo
            obj.autorizado = autoriza
            obj.requiere_xml = xml
            obj.email = email
            obj.telefono = tel
            obj.activo = True
            obj.save()
            npv += int(created)

        self.stdout.write(self.style.SUCCESS(
            f"Listo en {emp.nombre_comercial}: {len(CLIENTES)} clientes ({nc} nuevos), "
            f"{len(PROVEEDORES)} proveedores ({npv} nuevos)."
        ))
