"""Genera datos de prueba transaccionales en TODO el ERP.

Cubre los modulos que no tienen seed propio: RH (empleados, vacaciones,
prestamos, solicitudes), Nomina (periodos + recibos), Almacen (productos,
almacenes, existencias), CxP (proveedores + facturas + pagos), Ordenes de
compra, Facturacion (clientes, series, facturas), Viajes (carta porte:
ubicaciones, autotransportes, operadores), Mantenimiento (ordenes + refacciones)
y Flota (cargas de combustible).

Es idempotente: usa get_or_create/update_or_create con llaves estables, asi que
correrlo varias veces no duplica registros. Cada seccion va en su propio try
para que un fallo aislado no tumbe el resto.

Uso:
    python manage.py seed_demo_all                 # primera empresa
    python manage.py seed_demo_all --empresa 1
"""
from __future__ import annotations

import random
import traceback
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.core.models import Empresa

RNG = random.Random(20260530)
D = lambda v: Decimal(str(v))  # noqa: E731


def dt(d: date, h: int = 8) -> datetime:
    return timezone.make_aware(datetime.combine(d, time(hour=h)))


class Command(BaseCommand):
    help = "Carga datos de prueba transaccionales en todos los modulos del ERP."

    def add_arguments(self, parser):
        parser.add_argument("--empresa", type=int, default=None)

    def handle(self, *args, **opts):
        emp = (
            Empresa.objects.filter(id=opts["empresa"]).first()
            if opts["empresa"]
            else Empresa.objects.first()
        )
        if not emp:
            self.stderr.write(self.style.ERROR("No hay empresa. Corre primero: manage.py bootstrap"))
            return
        self.emp = emp
        self.hoy = date.today()
        self.admin = User.objects.filter(is_superuser=True).first()
        self.stdout.write(self.style.MIGRATE_HEADING(f"Sembrando datos demo en: {emp.nombre_comercial}\n"))

        for nombre, fn in [
            ("Usuarios (tecnicos)", self.seed_usuarios),
            ("RH: departamentos/puestos/empleados", self.seed_rh_base),
            ("RH: solicitudes/vacaciones/prestamos", self.seed_rh_transac),
            ("Nomina: periodos + recibos", self.seed_nomina),
            ("Almacen: productos/almacenes/existencias", self.seed_almacen),
            ("CxP: proveedores + facturas + pagos", self.seed_cxp),
            ("Ordenes de compra", self.seed_ordenes_compra),
            ("Facturacion: clientes/series/facturas", self.seed_facturacion),
            ("Viajes (carta porte)", self.seed_viajes),
            ("Mantenimiento: ordenes + refacciones", self.seed_mantenimiento),
            ("Flota: cargas de combustible", self.seed_combustible),
        ]:
            try:
                n = fn()
                self.stdout.write(self.style.SUCCESS(f"  OK  {nombre}: {n}"))
            except Exception as e:  # noqa: BLE001
                self.stderr.write(self.style.ERROR(f"  ERR {nombre}: {e}"))
                traceback.print_exc()

        self.stdout.write(self.style.MIGRATE_HEADING("\nListo. Datos demo generados."))

    # ─────────────────────────────────────────── Usuarios
    def seed_usuarios(self):
        creados = 0
        self.tecnicos = []
        for u in ["tecnico1", "tecnico2", "supervisor"]:
            user, c = User.objects.get_or_create(
                username=u, defaults={"email": f"{u}@erp.local", "is_staff": True}
            )
            if c:
                user.set_password("demo12345")
                user.save()
                creados += 1
            self.tecnicos.append(user)
        return f"{creados} nuevos"

    # ─────────────────────────────────────────── RH base
    def seed_rh_base(self):
        from apps.rh.models import Departamento, Empleado, Puesto

        deptos = {}
        for nom in ["Operaciones", "Administracion", "Mantenimiento", "Ventas", "Recursos Humanos"]:
            d, _ = Departamento.objects.get_or_create(empresa=self.emp, nombre=nom)
            deptos[nom] = d

        puestos_def = [
            ("Operador de Trailer", "Operaciones", 9000),
            ("Chofer Local", "Operaciones", 7500),
            ("Auxiliar Administrativo", "Administracion", 8000),
            ("Contador", "Administracion", 18000),
            ("Mecanico", "Mantenimiento", 11000),
            ("Jefe de Taller", "Mantenimiento", 20000),
            ("Ejecutivo de Ventas", "Ventas", 12000),
            ("Gerente de RH", "Recursos Humanos", 25000),
        ]
        puestos = {}
        for nom, dep, sal in puestos_def:
            p, _ = Puesto.objects.get_or_create(
                empresa=self.emp, nombre=nom,
                defaults={"departamento": deptos[dep], "salario_base": D(sal)},
            )
            puestos[nom] = p

        nombres = [
            "Juan Perez Garcia", "Maria Lopez Hernandez", "Carlos Sanchez Ramirez",
            "Ana Torres Flores", "Luis Martinez Cruz", "Sofia Ramos Gonzalez",
            "Jorge Diaz Morales", "Laura Jimenez Reyes", "Miguel Vargas Castro",
            "Elena Ruiz Mendoza", "Roberto Gomez Aguilar", "Patricia Nunez Silva",
            "Fernando Rios Delgado", "Gabriela Ortiz Pena", "Ricardo Mejia Soto",
        ]
        self.empleados = []
        creados = 0
        for i, full in enumerate(nombres, 1):
            puesto = list(puestos.values())[i % len(puestos)]
            sal_diario = (puesto.salario_base / D(30)).quantize(D("0.01"))
            ingreso = self.hoy - timedelta(days=RNG.randint(120, 2000))
            emp_obj, c = Empleado.objects.get_or_create(
                empresa=self.emp, numero_empleado=f"EMP{i:03d}",
                defaults={
                    "nombre": full,
                    "puesto": puesto,
                    "fecha_ingreso": ingreso,
                    "rfc": f"XAXX{RNG.randint(100000, 999999)}{i:02d}",
                    "telefono": f"81{RNG.randint(10000000, 99999999)}",
                    "email": f"empleado{i}@demo.mx",
                    "salario_diario": sal_diario,
                    "salario_diario_integrado": (sal_diario * D("1.0452")).quantize(D("0.01")),
                    "salario_base_cotizacion": (sal_diario * D("1.0452")).quantize(D("0.01")),
                    "periodicidad_pago": "04",
                    "tipo_contrato": "01",
                    "tipo_jornada": "01",
                    "riesgo_puesto": "1",
                    "banco_clave": "012",
                    "clave_entidad_federativa": "NLE",
                },
            )
            creados += int(c)
            self.empleados.append(emp_obj)
        return f"{Departamento.objects.filter(empresa=self.emp).count()} deptos, {Puesto.objects.filter(empresa=self.emp).count()} puestos, {creados} empleados nuevos"

    # ─────────────────────────────────────────── RH transaccional
    def seed_rh_transac(self):
        from apps.rh.models import Prestamo, SolicitudRH, TipoSolicitudRH, Vacacion

        tipos_def = [
            ("VACACION", "Vacaciones anuales"),
            ("PERMISO", "Permiso con goce"),
            ("PERMISO", "Permiso sin goce"),
            ("PRESTAMO", "Prestamo personal"),
        ]
        tipos = {}
        for cat, nom in tipos_def:
            t, _ = TipoSolicitudRH.objects.get_or_create(
                empresa=self.emp, categoria=cat, nombre=nom,
                defaults={"con_goce_sueldo": "sin goce" not in nom.lower()},
            )
            tipos[nom] = t

        vac = pre = sol = 0
        for emp in self.empleados[:10]:
            if Vacacion.objects.filter(empleado=emp).exists():
                continue
            fi = self.hoy + timedelta(days=RNG.randint(-60, 90))
            dias = RNG.randint(3, 12)
            Vacacion.objects.create(
                empleado=emp, fecha_inicio=fi, fecha_fin=fi + timedelta(days=dias),
                dias=dias, estado=RNG.choice(["PEND", "APROB", "TOMADA"]),
                notas="Periodo vacacional anual",
            )
            vac += 1

        for emp in self.empleados[:5]:
            if Prestamo.objects.filter(empleado=emp).exists():
                continue
            monto = D(RNG.choice([3000, 5000, 8000, 10000]))
            cuotas = RNG.choice([4, 6, 12])
            Prestamo.objects.create(
                empleado=emp, monto=monto, fecha_otorgamiento=self.hoy - timedelta(days=RNG.randint(10, 90)),
                cuotas=cuotas, descuento_por_cuota=(monto / cuotas).quantize(D("0.01")),
                saldo=(monto * D("0.6")).quantize(D("0.01")), estado="ACTIVO",
            )
            pre += 1

        tvac = tipos["Vacaciones anuales"]
        for emp in self.empleados[:8]:
            if SolicitudRH.objects.filter(empleado=emp, tipo=tvac).exists():
                continue
            fi = self.hoy + timedelta(days=RNG.randint(5, 40))
            SolicitudRH.objects.create(
                empresa=self.emp, empleado=emp, tipo=tvac,
                fecha_inicio=fi, fecha_fin=fi + timedelta(days=5), dias=5,
                motivo="Solicitud de vacaciones", estado=RNG.choice(["PEND", "APROB", "RECH"]),
                solicitado_por=self.admin,
            )
            sol += 1
        return f"{vac} vacaciones, {pre} prestamos, {sol} solicitudes"

    # ─────────────────────────────────────────── Nomina
    def seed_nomina(self):
        from apps.nomina.models import ConceptoNomina, NominaEmpleado, PeriodoNomina

        if not getattr(self, "empleados", None):
            return "sin empleados"
        periodos_creados = recibos = 0
        # 3 quincenas recientes
        base = self.hoy.replace(day=1)
        for q in range(3):
            fi = base - timedelta(days=15 * (q + 1))
            ff = fi + timedelta(days=14)
            per, c = PeriodoNomina.objects.get_or_create(
                empresa=self.emp, nombre=f"Quincena {fi.strftime('%d/%b')} - {ff.strftime('%d/%b/%Y')}",
                defaults={
                    "tipo_nomina": "O", "periodicidad_pago": "04",
                    "fecha_inicio": fi, "fecha_fin": ff, "fecha_pago": ff + timedelta(days=2),
                    "num_dias_pagados": 15, "estatus": "CALCULADO", "creado_por": self.admin,
                },
            )
            periodos_creados += int(c)
            for emp in self.empleados:
                nom, cr = NominaEmpleado.objects.get_or_create(
                    periodo=per, empleado=emp,
                    defaults={
                        "dias_pagados": D(15), "salario_diario": emp.salario_diario,
                        "salario_diario_integrado": emp.salario_diario_integrado,
                        "salario_base_cot_apor": emp.salario_base_cotizacion,
                    },
                )
                if not cr:
                    continue
                recibos += 1
                sueldo = (emp.salario_diario * D(15)).quantize(D("0.01"))
                isr = (sueldo * D("0.10")).quantize(D("0.01"))
                imss = (sueldo * D("0.025")).quantize(D("0.01"))
                ConceptoNomina.objects.create(
                    nomina=nom, tipo="P", clave_sat="001", concepto="Sueldos y salarios",
                    importe_gravado=sueldo, importe_exento=D(0), importe=sueldo,
                )
                ConceptoNomina.objects.create(
                    nomina=nom, tipo="D", clave_sat="002", concepto="ISR",
                    importe=isr,
                )
                ConceptoNomina.objects.create(
                    nomina=nom, tipo="D", clave_sat="001", concepto="IMSS",
                    importe=imss,
                )
                nom.recalcular()
        return f"{periodos_creados} periodos nuevos, {recibos} recibos"

    # ─────────────────────────────────────────── Almacen
    def seed_almacen(self):
        from apps.almacen.models import (
            Almacen, CategoriaProducto, Existencia, MarcaProducto, Producto, UnidadMedida,
        )

        um_pza = UnidadMedida.objects.filter(empresa=self.emp, codigo="PZA").first() \
            or UnidadMedida.objects.filter(empresa=self.emp).first()
        if not um_pza:
            um_pza = UnidadMedida.objects.create(empresa=self.emp, codigo="PZA", nombre="Pieza", abreviatura="pza")
        um_lt = UnidadMedida.objects.filter(empresa=self.emp, codigo="LT").first() or um_pza

        cats = {c.codigo: c for c in CategoriaProducto.objects.filter(empresa=self.emp)}
        marcas = list(MarcaProducto.objects.filter(empresa=self.emp))

        productos_def = [
            ("Filtro de aceite", "FILTRO", "PZA", 180, 320),
            ("Filtro de aire", "FILTRO", "PZA", 250, 480),
            ("Aceite motor 15W40 (cubeta 19L)", "LUB", "LT", 1450, 2100),
            ("Llanta 295/80 R22.5", "LLANTA", "PZA", 4200, 6500),
            ("Balata delantera", "FRENOS", "PZA", 380, 720),
            ("Banda de freno", "FRENOS", "PZA", 540, 980),
            ("Bateria 12V 1000A", "REF", "PZA", 2800, 4200),
            ("Foco LED 24V", "ELEC", "PZA", 65, 140),
            ("Anticongelante (galon)", "LUB", "LT", 320, 560),
            ("Manguera de radiador", "REF", "PZA", 210, 410),
            ("Kit de clutch", "REF", "PZA", 8500, 13500),
            ("Amortiguador", "REF", "PZA", 1200, 2100),
            ("Guantes de trabajo", "EPP", "PZA", 85, 160),
            ("Casco de seguridad", "EPP", "PZA", 220, 420),
            ("Estopa (kg)", "CONS", "PZA", 35, 70),
            ("Liquido limpiaparabrisas", "LIMP", "LT", 45, 95),
            ("Tornilleria surtida (kit)", "CONS", "PZA", 120, 250),
            ("Faro principal", "ELEC", "PZA", 950, 1650),
            ("Espejo lateral", "REF", "PZA", 680, 1200),
            ("Reflejante triangular", "EPP", "PZA", 95, 190),
        ]
        productos = []
        creados = 0
        for i, (nom, catcod, umcod, costo, precio) in enumerate(productos_def, 1):
            p, c = Producto.objects.get_or_create(
                empresa=self.emp, sku=f"SKU-{i:04d}",
                defaults={
                    "codigo_interno": f"P{i:04d}",
                    "nombre": nom,
                    "unidad_medida": um_lt if umcod == "LT" else um_pza,
                    "categoria": cats.get(catcod),
                    "marca": RNG.choice(marcas) if marcas else None,
                    "tipo": "REFACCION" if catcod not in ("EPP", "CONS", "LIMP") else "CONSUMIBLE",
                    "costo_promedio": D(costo), "costo_ultimo": D(costo),
                    "precio_venta": D(precio),
                    "inventario_min": D(5), "punto_reorden": D(8), "inventario_max": D(100),
                },
            )
            creados += int(c)
            productos.append(p)
        self.productos = productos

        almacenes = []
        for cod, nom, tipo in [("ALM-CEN", "Almacen Central", "CENTRAL"),
                                ("ALM-TAL", "Almacen de Taller", "SUCURSAL"),
                                ("ALM-REF", "Bodega de Refacciones", "SUCURSAL")]:
            a, _ = Almacen.objects.get_or_create(
                empresa=self.emp, codigo=cod, defaults={"nombre": nom, "tipo": tipo}
            )
            almacenes.append(a)
        self.almacenes = almacenes

        existencias = 0
        for p in productos:
            for a in almacenes:
                cant = D(RNG.randint(0, 80))
                ex, c = Existencia.objects.get_or_create(
                    producto=p, almacen=a, ubicacion=None, lote=None,
                    defaults={
                        "empresa": self.emp, "cantidad": cant, "disponible": cant,
                        "costo_promedio": p.costo_promedio,
                    },
                )
                existencias += int(c)
        return f"{creados} productos nuevos, {len(almacenes)} almacenes, {existencias} existencias"

    # ─────────────────────────────────────────── CxP
    def seed_cxp(self):
        from apps.cxp.models import FacturaProveedor, PagoProveedor, Proveedor

        prov_def = [
            ("REF150101AA1", "REFACCIONES DIESEL DEL NORTE SA", "RefiDiesel"),
            ("LUB160202BB2", "LUBRICANTES INDUSTRIALES SA", "LubriMax"),
            ("LLA170303CC3", "LLANTAS Y SERVICIOS DEL BAJIO", "LlantiBajio"),
            ("ELE180404DD4", "ELECTRICA AUTOMOTRIZ SA", "ElectroAuto"),
            ("HER190505EE5", "HERRAMIENTAS PROFESIONALES SA", "HerraPro"),
            ("COM200606FF6", "COMBUSTIBLES Y SERVICIOS SA", "CombuServ"),
        ]
        proveedores = []
        for rfc, rs, nc in prov_def:
            p, _ = Proveedor.objects.get_or_create(
                empresa=self.emp, rfc=rfc,
                defaults={
                    "razon_social": rs, "nombre_comercial": nc,
                    "email": f"ventas@{nc.lower()}.mx", "telefono": f"81{RNG.randint(10000000, 99999999)}",
                    "banco": "BBVA", "dias_credito": RNG.choice([15, 30, 45]),
                    "autorizado": True, "requiere_xml": True,
                },
            )
            proveedores.append(p)
        self.proveedores = proveedores

        facturas = pagos = 0
        for i in range(1, 13):
            prov = RNG.choice(proveedores)
            folio = f"FP-{i:04d}"
            if FacturaProveedor.objects.filter(empresa=self.emp, folio=folio).exists():
                continue
            subtotal = D(RNG.randint(2000, 45000))
            iva = (subtotal * D("0.16")).quantize(D("0.01"))
            total = subtotal + iva
            fe = self.hoy - timedelta(days=RNG.randint(5, 120))
            pagada = RNG.random() < 0.5
            f = FacturaProveedor.objects.create(
                empresa=self.emp, proveedor=prov, folio=folio,
                folio_fiscal=f"{RNG.randint(10000000, 99999999)}-DEMO",
                fecha_emision=fe, fecha_vencimiento=fe + timedelta(days=prov.dias_credito),
                subtotal=subtotal, iva=iva, total=total,
                saldo=D(0) if pagada else total,
                estado="PAGADA" if pagada else "PENDIENTE",
            )
            facturas += 1
            if pagada:
                PagoProveedor.objects.create(
                    factura=f, fecha_pago=fe + timedelta(days=RNG.randint(1, prov.dias_credito or 30)),
                    monto=total, forma_pago="03", referencia=f"TRANSF-{RNG.randint(1000, 9999)}",
                )
                pagos += 1
        return f"{len(proveedores)} proveedores, {facturas} facturas, {pagos} pagos"

    # ─────────────────────────────────────────── Ordenes de compra
    def seed_ordenes_compra(self):
        from apps.ordenes_compra.models import OrdenCompra, PartidaOC

        if not getattr(self, "productos", None) or not getattr(self, "proveedores", None):
            return "faltan dependencias"
        ordenes = partidas = 0
        estados = ["BORRADOR", "APROBADA", "PARCIAL", "CERRADA"]
        for i in range(1, 11):
            folio = f"OC-{i:04d}"
            if OrdenCompra.objects.filter(empresa=self.emp, folio=folio).exists():
                continue
            prov = RNG.choice(self.proveedores)
            oc = OrdenCompra.objects.create(
                empresa=self.emp, proveedor=prov, folio=folio,
                fecha=self.hoy - timedelta(days=RNG.randint(2, 90)),
                fecha_entrega=self.hoy + timedelta(days=RNG.randint(2, 20)),
                estado=RNG.choice(estados), creado_por=self.admin,
                tipo_mantenimiento=RNG.choice(["CORRECTIVO", "PREVENTIVO"]),
            )
            subtotal = D(0)
            for p in RNG.sample(self.productos, RNG.randint(2, 5)):
                cant = D(RNG.randint(1, 10))
                precio = p.costo_ultimo or D(100)
                importe = (cant * precio).quantize(D("0.01"))
                PartidaOC.objects.create(
                    orden=oc, producto=p, descripcion=p.nombre,
                    cantidad=cant, precio_unitario=precio, importe=importe,
                )
                subtotal += importe
                partidas += 1
            oc.subtotal = subtotal
            oc.iva = (subtotal * D("0.16")).quantize(D("0.01"))
            oc.total = oc.subtotal + oc.iva
            oc.save()
            ordenes += 1
        return f"{ordenes} ordenes, {partidas} partidas"

    # ─────────────────────────────────────────── Facturacion
    def seed_facturacion(self):
        from apps.facturacion.models import Cliente, ConceptoFactura, Factura, ProductoServicio, Serie

        cli_def = [
            ("CDC130711RV2", "CADENA DE COMIDA MEXICANA", "601", "64480"),
            ("ABC010203AB1", "ABARROTES DEL NORTE SA DE CV", "601", "64000"),
            ("XYZ980512QW3", "TRANSPORTES Y LOGISTICA XYZ", "626", "44100"),
            ("COM050607ER4", "COMERCIALIZADORA CENTRAL", "601", "06600"),
            ("IND070809TY5", "INDUSTRIAL CHIHUAHUA SA", "601", "31000"),
        ]
        clientes = []
        for rfc, rs, reg, cp in cli_def:
            c, _ = Cliente.objects.get_or_create(
                empresa=self.emp, rfc=rfc,
                defaults={
                    "razon_social": rs, "regimen_fiscal": reg, "cp_fiscal": cp,
                    "uso_cfdi_default": "G03", "email": f"facturas@{rs.split()[0].lower()}.mx",
                },
            )
            clientes.append(c)
        self.clientes = clientes

        serv_def = [
            ("Flete nacional", "78101800", "E48", 15000),
            ("Maniobra de carga", "78101802", "E48", 1200),
            ("Servicio de almacenaje", "78131800", "E48", 3500),
            ("Custodia de mercancia", "92121800", "E48", 4500),
        ]
        servicios = []
        for i, (desc, cps, cu, precio) in enumerate(serv_def, 1):
            s, _ = ProductoServicio.objects.get_or_create(
                empresa=self.emp, codigo_interno=f"SERV{i:03d}",
                defaults={
                    "descripcion": desc, "clave_prod_serv": cps, "clave_unidad": cu,
                    "unidad_descripcion": "Servicio", "precio_unitario": D(precio),
                },
            )
            servicios.append(s)

        serie, _ = Serie.objects.get_or_create(
            empresa=self.emp, letra="A",
            defaults={"descripcion": "Facturas de ingreso", "tipo_comprobante": "I", "folio_actual": 1},
        )

        facturas = conceptos = 0
        for i in range(1, 13):
            folio = i
            if Factura.objects.filter(empresa=self.emp, serie=serie, folio=folio).exists():
                continue
            cli = RNG.choice(clientes)
            f = Factura.objects.create(
                empresa=self.emp, serie=serie, folio=folio, cliente=cli,
                forma_pago=RNG.choice(["01", "03", "99"]), metodo_pago="PUE",
                uso_cfdi=cli.uso_cfdi_default or "G03",
                estado=RNG.choice(["BORRADOR", "TIMBRADA", "TIMBRADA"]),
                creado_por=self.admin,
            )
            for s in RNG.sample(servicios, RNG.randint(1, 3)):
                ConceptoFactura.objects.create(
                    factura=f, descripcion=s.descripcion,
                    clave_prod_serv=s.clave_prod_serv, clave_unidad=s.clave_unidad,
                    unidad="Servicio", cantidad=D(RNG.randint(1, 4)),
                    precio_unitario=s.precio_unitario, tasa_iva=D("0.16"),
                )
                conceptos += 1
            f.recalcular_totales()
            if serie.folio_actual <= folio:
                serie.folio_actual = folio + 1
            facturas += 1
        serie.save()
        return f"{len(clientes)} clientes, {len(servicios)} servicios, {facturas} facturas, {conceptos} conceptos"

    # ─────────────────────────────────────────── Viajes (carta porte)
    def seed_viajes(self):
        from apps.carta_porte.models import Operador, Ubicacion
        from apps.flota.models import Unidad
        from apps.viajes.models import Determinante, MercanciaViaje, ParadaViaje, Viaje

        if not getattr(self, "clientes", None):
            from apps.facturacion.models import Cliente
            self.clientes = list(Cliente.objects.filter(empresa=self.emp))

        ubic_def = [
            ("CEDIS Monterrey", "64000", "NLE"), ("Patio Guadalajara", "44100", "JAL"),
            ("Bodega CDMX", "06600", "CMX"), ("Planta Saltillo", "25000", "COA"),
            ("Terminal Queretaro", "76000", "QUE"), ("CEDIS Chihuahua", "31000", "CHH"),
        ]
        ubicaciones = []
        for nom, cp, edo in ubic_def:
            u, _ = Ubicacion.objects.get_or_create(
                empresa=self.emp, nombre=nom,
                defaults={"codigo_postal": cp, "estado": edo, "rfc": self.emp.rfc,
                          "calle": "Av. Principal", "numero_exterior": str(RNG.randint(100, 999))},
            )
            ubicaciones.append(u)

        unidades = []
        for i in range(1, 6):
            un, _ = Unidad.objects.get_or_create(
                empresa=self.emp, numero=f"U-{i:03d}",
                defaults={"placas": f"RTP-{i:03d}", "marca": "Kenworth", "modelo": "T680",
                          "anio": RNG.randint(2015, 2024), "config_vehicular": "T3S2",
                          "peso_bruto_vehicular": D(48), "permiso_sct": "TPAF01",
                          "numero_permiso_sct": f"SCT{RNG.randint(100000, 999999)}",
                          "aseguradora_resp_civil": "Qualitas", "poliza_resp_civil": f"POL{RNG.randint(10000, 99999)}",
                          "remolque1_subtipo": "CTR004", "remolque1_placa": f"REM-{i:03d}"},
            )
            unidades.append(un)

        operadores = []
        for i in range(1, 6):
            o, _ = Operador.objects.get_or_create(
                empresa=self.emp, rfc=f"OPER{RNG.randint(100000, 999999)}{i:02d}"[:13],
                defaults={"nombre": f"Operador Demo {i}", "licencia": f"LIC{RNG.randint(1000000, 9999999)}",
                          "licencia_vencimiento": self.hoy + timedelta(days=RNG.randint(120, 900)),
                          "codigo_postal": "64000"},
            )
            operadores.append(o)

        # Determinantes (catálogo de destinos del cliente).
        det_def = [("0001", "Tienda Centro", "Walmart"), ("0002", "CEDIS Norte", "Soriana"),
                   ("0003", "Sucursal Sur", "Chedraui")]
        for cod, nom, cli in det_def:
            Determinante.objects.get_or_create(
                empresa=self.emp, codigo=cod,
                defaults={"nombre": nom, "cliente": cli, "ubicacion": RNG.choice(ubicaciones)})

        MERC = [("14121503", "Cartón", "H87", False, ""),
                ("24121500", "Tarimas de madera", "H87", False, ""),
                ("12352106", "Pintura base solvente (inflamable)", "H87", True, "1263")]

        viajes = 0
        for i in range(1, 16):
            numero = str(i)
            if Viaje.objects.filter(empresa=self.emp, numero=numero).exists():
                continue
            origen, destino = RNG.sample(ubicaciones, 2)
            salida = self.hoy + timedelta(days=RNG.randint(-30, 15))
            v = Viaje.objects.create(
                empresa=self.emp, numero=numero, folio_carga=f"CRG-{i:04d}",
                cliente=RNG.choice(self.clientes) if self.clientes else None,
                origen=origen, destino=destino,
                fecha_viaje=dt(salida, RNG.randint(5, 20)),
                fecha_llegada=dt(salida + timedelta(days=1), RNG.randint(5, 20)),
                unidad=RNG.choice(unidades), operador=RNG.choice(operadores),
                km_recorridos=D(RNG.randint(200, 1500)), tarifa=D(RNG.randint(8000, 35000)),
                sueldo_operador=D(RNG.randint(800, 3500)),
                estado=RNG.choice(["PLANIFICADO", "EN_RUTA", "ENTREGADO", "ENTREGADO"]),
                creado_por=self.admin,
            )
            # Itinerario: origen + destino (a veces 1 intermedia).
            seq = [origen]
            if RNG.random() < 0.4:
                seq.append(RNG.choice([u for u in ubicaciones if u not in (origen, destino)]))
            seq.append(destino)
            paradas = []
            for k, ub in enumerate(seq, start=1):
                paradas.append(ParadaViaje.objects.create(
                    viaje=v, orden=k, ubicacion=ub,
                    fecha_hora=dt(salida + timedelta(days=k - 1), RNG.randint(5, 20)),
                    kms=D(0 if k == 1 else RNG.randint(120, 600))))
            for _ in range(RNG.randint(1, 3)):
                clave, desc, um, pel, cve = RNG.choice(MERC)
                MercanciaViaje.objects.create(
                    viaje=v, parada_origen=paradas[0], parada_destino=paradas[-1],
                    clave_producto=clave, descripcion=desc, cantidad=D(RNG.randint(1, 50)),
                    peso_kg=D(RNG.randint(50, 1200)), unidad_medida=um,
                    material_peligroso=pel, clave_material_peligroso=cve,
                    embalaje="4G" if pel else "", descripcion_embalaje="Caja de cartón" if pel else "")
            viajes += 1
        return f"{len(ubicaciones)} ubicaciones, {len(unidades)} unidades, {len(operadores)} operadores, {viajes} viajes"

    # ─────────────────────────────────────────── Mantenimiento
    def seed_mantenimiento(self):
        from apps.flota.models import Unidad
        from apps.mantenimiento.models import OrdenMantenimiento, RefaccionUsada

        unidades = list(Unidad.objects.filter(empresa=self.emp))
        if not unidades:
            return "sin unidades de flota"
        productos = getattr(self, "productos", None) or []

        ordenes = refas = 0
        for i in range(1, 13):
            folio = f"OT-{i:04d}"
            if OrdenMantenimiento.objects.filter(folio=folio).exists():
                continue
            u = RNG.choice(unidades)
            prog = self.hoy + timedelta(days=RNG.randint(-40, 20))
            estado = RNG.choice(["PROGRAMADA", "EN_PROCESO", "COMPLETADA", "COMPLETADA"])
            ot = OrdenMantenimiento.objects.create(
                unidad=u, folio=folio, tipo=RNG.choice(["PREVENTIVO", "CORRECTIVO"]),
                fecha_programada=prog,
                fecha_inicio=prog if estado != "PROGRAMADA" else None,
                fecha_fin=prog + timedelta(days=1) if estado == "COMPLETADA" else None,
                km_unidad=u.km_actual or D(0),
                estado=estado, costo=D(0),
                diagnostico=RNG.choice(["Servicio preventivo de 10,000 km", "Cambio de balatas",
                                         "Reparacion de sistema electrico", "Afinacion mayor"]),
                asignado_a=RNG.choice(self.tecnicos) if getattr(self, "tecnicos", None) else None,
            )
            costo = D(0)
            if productos and estado != "PROGRAMADA":
                for p in RNG.sample(productos, RNG.randint(1, 4)):
                    cant = D(RNG.randint(1, 4))
                    cu = p.costo_ultimo or D(100)
                    RefaccionUsada.objects.create(orden=ot, producto=p, cantidad=cant, costo_unitario=cu)
                    costo += (cant * cu)
                    refas += 1
            ot.costo = (costo + D(RNG.randint(500, 3000))).quantize(D("0.01"))
            ot.save()
            ordenes += 1
        return f"{ordenes} ordenes de trabajo, {refas} refacciones usadas"

    # ─────────────────────────────────────────── Flota: combustible
    def seed_combustible(self):
        from apps.flota.models import CargaCombustible, Unidad

        unidades = list(Unidad.objects.filter(empresa=self.emp))
        if not unidades:
            return "sin unidades"
        cargas = 0
        for u in unidades:
            if CargaCombustible.objects.filter(unidad=u).exists():
                continue
            km = float(u.km_actual or 100000)
            for j in range(RNG.randint(3, 6)):
                km += RNG.randint(400, 900)
                litros = D(RNG.randint(180, 380))
                precio = D(f"{RNG.uniform(23.5, 26.5):.4f}")
                CargaCombustible.objects.create(
                    unidad=u, fecha=dt(self.hoy - timedelta(days=RNG.randint(1, 120)), RNG.randint(6, 20)),
                    litros=litros, precio_litro=precio,
                    importe=(litros * precio).quantize(D("0.01")),
                    km_actual=D(round(km, 2)),
                    rendimiento_kml=D(f"{RNG.uniform(2.0, 3.5):.3f}"),
                    estacion=RNG.choice(["Pemex Centro", "Shell Carretera", "BP Periferico", "Oxxo Gas"]),
                    folio=f"TK{RNG.randint(100000, 999999)}",
                )
                cargas += 1
        return f"{cargas} cargas de combustible"
