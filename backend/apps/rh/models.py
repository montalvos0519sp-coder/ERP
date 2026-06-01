from django.db import models
from django.conf import settings
from apps.core.models import Empresa, Sucursal


class Departamento(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="departamentos")
    nombre = models.CharField(max_length=120)
    descripcion = models.CharField(max_length=200, blank=True)
    activo = models.BooleanField(default=True)
    class Meta:
        unique_together = [("empresa", "nombre")]
    def __str__(self): return self.nombre


class Puesto(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="puestos")
    departamento = models.ForeignKey(Departamento, on_delete=models.PROTECT, related_name="puestos")
    nombre = models.CharField(max_length=120)
    salario_base = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    activo = models.BooleanField(default=True)
    class Meta:
        unique_together = [("empresa", "nombre")]
    def __str__(self): return self.nombre


class Empleado(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="empleados")
    sucursal = models.ForeignKey(Sucursal, on_delete=models.SET_NULL, blank=True, null=True)
    puesto = models.ForeignKey(Puesto, on_delete=models.PROTECT, related_name="empleados")
    numero_empleado = models.CharField(max_length=20)
    nombre = models.CharField(max_length=200)
    apellido = models.CharField(max_length=200, blank=True)
    rfc = models.CharField(max_length=13, blank=True)
    curp = models.CharField(max_length=18, blank=True)
    nss = models.CharField(max_length=15, blank=True)
    fecha_ingreso = models.DateField()
    fecha_baja = models.DateField(blank=True, null=True)
    motivo_baja = models.CharField(max_length=200, blank=True)
    telefono = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    direccion = models.CharField(max_length=300, blank=True)
    activo = models.BooleanField(default=True)
    user_sistema = models.OneToOneField(settings.AUTH_USER_MODEL, blank=True, null=True,
                                        on_delete=models.SET_NULL, related_name="empleado")

    # ── Datos fiscales / nomina (CFDI 4.0 + Complemento Nomina 1.2) ────
    codigo_postal_fiscal = models.CharField(max_length=5, blank=True,
        help_text="CP fiscal (debe coincidir con Constancia Fiscal). Va en el receptor.")
    regimen_fiscal = models.CharField(max_length=4, default="605", blank=True,
        help_text="c_RegimenFiscal. 605 Sueldos por defecto.")
    uso_cfdi = models.CharField(max_length=4, default="CN01", blank=True,
        help_text="c_UsoCFDI. CN01 Nomina por defecto.")
    tipo_contrato = models.CharField(max_length=4, blank=True,
        help_text="c_TipoContrato. Ej: 01 Indeterminado.")
    tipo_jornada = models.CharField(max_length=4, blank=True,
        help_text="c_TipoJornada. Ej: 01 Diurna.")
    tipo_regimen = models.CharField(max_length=4, default="02", blank=True,
        help_text="c_TipoRegimen. Ej: 02 Sueldos.")
    riesgo_puesto = models.CharField(max_length=2, blank=True,
        help_text="c_RiesgoPuesto. 1..5 grados.")
    periodicidad_pago = models.CharField(max_length=4, default="04", blank=True,
        help_text="c_PeriodicidadPago. 04 Quincenal por defecto.")

    # Salarios (en MXN)
    salario_diario = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    salario_diario_integrado = models.DecimalField(max_digits=12, decimal_places=2, default=0,
        help_text="SDI: incluye factor de prestaciones de ley")
    salario_base_cotizacion = models.DecimalField(max_digits=12, decimal_places=2, default=0,
        help_text="SBC: para calculo IMSS")

    # Bancarios
    banco_clave = models.CharField(max_length=4, blank=True,
        help_text="c_Banco SAT")
    cuenta_bancaria = models.CharField(max_length=20, blank=True)
    clabe_interbancaria = models.CharField(max_length=18, blank=True)
    numero_tarjeta = models.CharField(max_length=20, blank=True)

    # Otros datos
    sindicalizado = models.BooleanField(default=False)
    clave_entidad_federativa = models.CharField(max_length=4, blank=True,
        help_text="c_Estado donde labora (ej: NLE).")
    sueldo_neto_mensual = models.DecimalField(max_digits=12, decimal_places=2, default=0,
        help_text="Solo informativo / referencia.")

    class Meta:
        unique_together = [("empresa", "numero_empleado")]
        ordering = ["nombre"]

    def __str__(self): return f"{self.numero_empleado} · {self.nombre}"


class Vacacion(models.Model):
    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE, related_name="vacaciones")
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    dias = models.PositiveIntegerField()
    estado = models.CharField(max_length=15, choices=[("PEND", "Pendiente"), ("APROB", "Aprobada"), ("TOMADA", "Tomada"), ("CANC", "Cancelada")], default="PEND")
    notas = models.TextField(blank=True)


class Prestamo(models.Model):
    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE, related_name="prestamos")
    monto = models.DecimalField(max_digits=12, decimal_places=2)
    fecha_otorgamiento = models.DateField()
    cuotas = models.PositiveIntegerField(default=1)
    descuento_por_cuota = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    saldo = models.DecimalField(max_digits=12, decimal_places=2)
    estado = models.CharField(max_length=15, default="ACTIVO")


# ── Catalogo configurable de tipos de permiso/vacacion/prestamo ─────────────
class TipoSolicitudRH(models.Model):
    """Catalogo configurable por el admin. Define que tipos de solicitudes
    pueden hacer los empleados.

    Ejemplos:
      - PERMISO  · Medico        · Justifica con incapacidad IMSS
      - PERMISO  · Personal      · Hasta 3 dias/anio
      - PERMISO  · Funeral
      - VACACION · Pagada        · Cuenta contra balance
      - VACACION · Sin goce
      - PRESTAMO · Caja de ahorro
      - PRESTAMO · Emergencia
    """

    CATEGORIAS = [
        ("PERMISO", "Permiso"),
        ("VACACION", "Vacacion"),
        ("PRESTAMO", "Prestamo"),
    ]

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="tipos_solicitud_rh")
    categoria = models.CharField(max_length=10, choices=CATEGORIAS)
    nombre = models.CharField(max_length=120)
    descripcion = models.TextField(blank=True)
    color = models.CharField(max_length=9, default="#3B82F6")
    icono = models.CharField(max_length=40, default="FileText",
                             help_text="Nombre del icono lucide-react")
    requiere_documento = models.BooleanField(default=False,
        help_text="Si esta marcado, el empleado debe adjuntar un archivo (incapacidad, etc.)")
    dias_maximos = models.PositiveIntegerField(blank=True, null=True,
        help_text="Tope de dias permitidos por solicitud (opcional)")
    con_goce_sueldo = models.BooleanField(default=True)
    requiere_aprobacion = models.BooleanField(default=True)
    activo = models.BooleanField(default=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["empresa", "categoria", "nombre"]
        unique_together = [("empresa", "categoria", "nombre")]
        verbose_name = "Tipo de solicitud RH"
        verbose_name_plural = "Tipos de solicitud RH"

    def __str__(self) -> str:
        return f"{self.get_categoria_display()} · {self.nombre}"


# ── Solicitud RH (permiso/vacacion/prestamo unificada) ──────────────────────
class SolicitudRH(models.Model):
    """Solicitud que un empleado (o staff por el) hace al sistema.

    Flujo: PENDIENTE → APROBADA / RECHAZADA / CANCELADA.
    El empleado solo ve sus propias. El staff/RH ve todas las de la empresa.
    """

    ESTADOS = [
        ("PEND", "Pendiente"),
        ("APROB", "Aprobada"),
        ("RECH", "Rechazada"),
        ("CANC", "Cancelada"),
    ]

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="solicitudes_rh")
    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE, related_name="solicitudes")
    tipo = models.ForeignKey(TipoSolicitudRH, on_delete=models.PROTECT, related_name="solicitudes")

    # Datos del permiso/vacacion (fechas)
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField(blank=True, null=True)
    dias = models.PositiveIntegerField(default=0)

    # Solo aplica si tipo.categoria == "PRESTAMO"
    monto = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    cuotas = models.PositiveIntegerField(blank=True, null=True)

    motivo = models.TextField(blank=True)
    documento = models.FileField(upload_to="rh/solicitudes/", blank=True, null=True,
        help_text="Adjunto (justificante, incapacidad, etc.) si lo requiere el tipo")

    estado = models.CharField(max_length=10, choices=ESTADOS, default="PEND")
    fecha_solicitud = models.DateTimeField(auto_now_add=True)
    solicitado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        blank=True, null=True, related_name="rh_solicitudes_creadas")
    aprobado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        blank=True, null=True, related_name="rh_solicitudes_aprobadas")
    fecha_aprobacion = models.DateTimeField(blank=True, null=True)
    comentarios_aprobacion = models.TextField(blank=True,
        help_text="Comentarios del staff al aprobar / rechazar")

    class Meta:
        ordering = ["-fecha_solicitud"]
        verbose_name = "Solicitud RH"
        verbose_name_plural = "Solicitudes RH"

    def __str__(self) -> str:
        return f"{self.tipo.nombre} · {self.empleado.nombre} · {self.estado}"


# ── Notificaciones ──────────────────────────────────────────────────────────
class ConfigNotificacionRH(models.Model):
    """Determina qué usuarios reciben notificaciones de solicitudes RH
    para cada empresa. Lo administra el staff desde /admin/catalogos-rh.
    """
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE,
                                 related_name="config_notif_rh")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                              related_name="config_notif_rh")
    activo = models.BooleanField(default=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("empresa", "user")]
        verbose_name = "Configuracion de notificaciones RH"
        verbose_name_plural = "Configuracion de notificaciones RH"

    def __str__(self) -> str:
        return f"{self.user} · {self.empresa} · {'ON' if self.activo else 'OFF'}"


class Notificacion(models.Model):
    """Notificacion in-app para un usuario destinatario.

    No usamos signals para crearla — se emite explicitamente desde las vistas
    (p.ej. al crear/aprobar/rechazar una SolicitudRH). El frontend la lee
    desde /api/rh/notificaciones/ y muestra una campana en el header.
    """

    TIPOS = [
        ("SOL_NUEVA", "Nueva solicitud"),
        ("SOL_APROB", "Solicitud aprobada"),
        ("SOL_RECH", "Solicitud rechazada"),
        ("SOL_CANC", "Solicitud cancelada"),
        ("INFO", "Informacion"),
    ]

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE,
                                 related_name="notificaciones", blank=True, null=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                              related_name="notificaciones")
    tipo = models.CharField(max_length=20, choices=TIPOS, default="INFO")
    titulo = models.CharField(max_length=200)
    mensaje = models.TextField(blank=True)
    enlace = models.CharField(max_length=300, blank=True,
                               help_text="Ruta del frontend a abrir (p.ej. /rh/permisos)")
    leida = models.BooleanField(default=False)
    creado = models.DateTimeField(auto_now_add=True)
    leida_en = models.DateTimeField(blank=True, null=True)

    # Referencia opcional al objeto que disparo la notificacion.
    solicitud = models.ForeignKey(SolicitudRH, on_delete=models.SET_NULL,
                                   blank=True, null=True, related_name="notificaciones")

    class Meta:
        ordering = ["-creado"]
        indexes = [models.Index(fields=["user", "leida", "-creado"])]

    def __str__(self) -> str:
        return f"{self.user} · {self.titulo} · {'leida' if self.leida else 'no leida'}"
