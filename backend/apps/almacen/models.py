"""Modelos profesionales del modulo Almacen.

Cubre el catalogo maestro de productos, jerarquia de almacenes (zona / rack /
nivel / ubicacion), inventario en tiempo real (Existencia), trazabilidad por
lote y serie, movimientos con kardex, transferencias entre almacenes y un
motor sencillo de alertas.
"""
from __future__ import annotations

from django.conf import settings
from django.db import models


# ---------------------------------------------------------------------------
# Catalogos de soporte
# ---------------------------------------------------------------------------


class CategoriaProducto(models.Model):
    """Categoria jerarquica para clasificar productos."""

    empresa = models.ForeignKey(
        "core.Empresa", on_delete=models.CASCADE,
        related_name="categorias_producto", db_index=True,
    )
    codigo = models.CharField(max_length=30, db_index=True)
    nombre = models.CharField(max_length=120)
    descripcion = models.TextField(blank=True)
    padre = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="subcategorias",
    )
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = (("empresa", "codigo"),)
        ordering = ["empresa", "nombre"]
        indexes = [
            models.Index(fields=["empresa", "activo"]),
        ]

    def __str__(self) -> str:
        return f"{self.codigo} · {self.nombre}"


class MarcaProducto(models.Model):
    """Marca o fabricante asociado a productos."""

    empresa = models.ForeignKey(
        "core.Empresa", on_delete=models.CASCADE,
        related_name="marcas_producto", db_index=True,
    )
    codigo = models.CharField(max_length=30, db_index=True)
    nombre = models.CharField(max_length=120)
    descripcion = models.TextField(blank=True)
    sitio_web = models.URLField(blank=True)
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = (("empresa", "codigo"),)
        ordering = ["empresa", "nombre"]

    def __str__(self) -> str:
        return f"{self.codigo} · {self.nombre}"


class UnidadMedida(models.Model):
    """Unidades de medida para productos (PZ, KG, LT, M, CAJA, etc.)."""

    TIPOS = [
        ("CANTIDAD", "Cantidad"),
        ("PESO", "Peso"),
        ("VOLUMEN", "Volumen"),
        ("LONGITUD", "Longitud"),
        ("TIEMPO", "Tiempo"),
        ("AREA", "Area"),
    ]

    empresa = models.ForeignKey(
        "core.Empresa", on_delete=models.CASCADE,
        related_name="unidades_medida", db_index=True,
    )
    codigo = models.CharField(max_length=10, db_index=True)
    nombre = models.CharField(max_length=60)
    abreviatura = models.CharField(max_length=10)
    tipo = models.CharField(max_length=20, choices=TIPOS, default="CANTIDAD")
    factor_conversion = models.DecimalField(
        max_digits=18, decimal_places=6, default=1,
    )
    unidad_base = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="derivadas",
    )
    activo = models.BooleanField(default=True)

    class Meta:
        unique_together = (("empresa", "codigo"),)
        ordering = ["empresa", "codigo"]

    def __str__(self) -> str:
        return f"{self.codigo} · {self.nombre}"


# ---------------------------------------------------------------------------
# Producto maestro
# ---------------------------------------------------------------------------


class Producto(models.Model):
    """Catalogo maestro completo de productos."""

    TIPOS = [
        ("MATERIA_PRIMA", "Materia Prima"),
        ("PRODUCTO_TERMINADO", "Producto Terminado"),
        ("REFACCION", "Refaccion"),
        ("CONSUMIBLE", "Consumible"),
        ("SERVICIO", "Servicio"),
    ]
    METODOS_COSTEO = [
        ("PROMEDIO", "Promedio Ponderado"),
        ("PEPS", "PEPS"),
        ("ESTANDAR", "Costo Estandar"),
    ]

    empresa = models.ForeignKey(
        "core.Empresa", on_delete=models.CASCADE,
        related_name="productos_almacen_v2", db_index=True,
    )
    codigo_interno = models.CharField(max_length=40, db_index=True)
    sku = models.CharField(max_length=60, db_index=True)
    codigo_barras = models.CharField(max_length=60, blank=True, db_index=True)
    # Que simbologia usar al generar la etiqueta del producto. Si no se elige,
    # se usa QR (es el mas flexible y no exige longitudes especificas).
    TIPOS_CODIGO_BARRAS = [
        ("QR", "QR Code"),
        ("CODE128", "Code 128 (alfanumerico)"),
        ("CODE39", "Code 39 (alfanumerico)"),
        ("EAN13", "EAN-13 (13 digitos)"),
        ("EAN8", "EAN-8 (8 digitos)"),
        ("UPCA", "UPC-A (12 digitos)"),
        ("ITF", "Interleaved 2 of 5"),
        ("NONE", "Sin codigo"),
    ]
    tipo_codigo_barras = models.CharField(
        max_length=10, choices=TIPOS_CODIGO_BARRAS, default="QR",
        help_text="Simbologia para generar la etiqueta. QR acepta cualquier texto; "
                  "EAN/UPC exigen longitudes especificas de digitos.",
    )
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True)
    categoria = models.ForeignKey(
        "CategoriaProducto", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="productos",
    )
    marca = models.ForeignKey(
        "MarcaProducto", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="productos",
    )
    unidad_medida = models.ForeignKey(
        "UnidadMedida", on_delete=models.PROTECT, related_name="productos",
    )

    tipo = models.CharField(
        max_length=20, choices=TIPOS, default="PRODUCTO_TERMINADO",
    )

    serializado = models.BooleanField(default=False)
    manejo_lote = models.BooleanField(default=False)
    manejo_caducidad = models.BooleanField(default=False)

    inventario_min = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    inventario_max = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    punto_reorden = models.DecimalField(max_digits=18, decimal_places=4, default=0)

    costo_promedio = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    costo_ultimo = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    costo_estandar = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    precio_venta = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    impuestos = models.JSONField(default=dict, blank=True)
    moneda = models.CharField(max_length=3, default="MXN")

    peso = models.DecimalField(max_digits=12, decimal_places=4, default=0)
    dimensiones = models.JSONField(default=dict, blank=True)
    fotos = models.JSONField(default=list, blank=True)
    etiquetas = models.JSONField(default=list, blank=True)

    metodo_costeo = models.CharField(
        max_length=20, choices=METODOS_COSTEO, default="PROMEDIO",
    )
    activo = models.BooleanField(default=True)

    creado_en = models.DateTimeField(auto_now_add=True)
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="productos_creados",
    )
    actualizado_en = models.DateTimeField(auto_now=True)
    actualizado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="productos_actualizados",
    )

    class Meta:
        unique_together = (
            ("empresa", "sku"),
            ("empresa", "codigo_interno"),
        )
        ordering = ["empresa", "nombre"]
        indexes = [
            models.Index(fields=["empresa", "activo"]),
            models.Index(fields=["empresa", "tipo"]),
            models.Index(fields=["codigo_barras"]),
        ]

    def __str__(self) -> str:
        return f"{self.sku} · {self.nombre}"


# ---------------------------------------------------------------------------
# Jerarquia de almacen
# ---------------------------------------------------------------------------


class Almacen(models.Model):
    """Almacen fisico asociado a la empresa (y opcionalmente a una sucursal)."""

    TIPOS = [
        ("CENTRAL", "Central"),
        ("SUCURSAL", "Sucursal"),
        ("TRANSITO", "En Transito"),
        ("CUARENTENA", "Cuarentena"),
        ("DEVOLUCIONES", "Devoluciones"),
        ("VIRTUAL", "Virtual"),
    ]

    empresa = models.ForeignKey(
        "core.Empresa", on_delete=models.CASCADE,
        related_name="almacenes", db_index=True,
    )
    sucursal = models.ForeignKey(
        "core.Sucursal", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="almacenes",
    )
    codigo = models.CharField(max_length=20, db_index=True)
    nombre = models.CharField(max_length=120)
    tipo = models.CharField(max_length=20, choices=TIPOS, default="CENTRAL")
    direccion = models.TextField(blank=True)
    responsable = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="almacenes_responsable",
    )
    telefono = models.CharField(max_length=30, blank=True)
    permite_negativos = models.BooleanField(default=False)
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = (("empresa", "codigo"),)
        ordering = ["empresa", "nombre"]
        indexes = [
            models.Index(fields=["empresa", "activo"]),
        ]

    def __str__(self) -> str:
        return f"{self.codigo} · {self.nombre}"


class Zona(models.Model):
    """Zona logica dentro de un almacen (recepcion, picking, despacho)."""

    TIPOS = [
        ("RECEPCION", "Recepcion"),
        ("ALMACENAMIENTO", "Almacenamiento"),
        ("PICKING", "Picking"),
        ("DESPACHO", "Despacho"),
        ("CUARENTENA", "Cuarentena"),
    ]

    empresa = models.ForeignKey(
        "core.Empresa", on_delete=models.CASCADE,
        related_name="zonas_almacen", db_index=True,
    )
    almacen = models.ForeignKey(
        "Almacen", on_delete=models.CASCADE,
        related_name="zonas", db_index=True,
    )
    codigo = models.CharField(max_length=20, db_index=True)
    nombre = models.CharField(max_length=120)
    tipo = models.CharField(max_length=20, choices=TIPOS, default="ALMACENAMIENTO")
    descripcion = models.TextField(blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        unique_together = (("almacen", "codigo"),)
        ordering = ["almacen", "codigo"]

    def __str__(self) -> str:
        return f"{self.almacen.codigo}/{self.codigo}"


class Rack(models.Model):
    """Rack o estanteria fisica dentro de una zona."""

    empresa = models.ForeignKey(
        "core.Empresa", on_delete=models.CASCADE,
        related_name="racks_almacen", db_index=True,
    )
    zona = models.ForeignKey(
        "Zona", on_delete=models.CASCADE, related_name="racks", db_index=True,
    )
    codigo = models.CharField(max_length=20, db_index=True)
    nombre = models.CharField(max_length=120, blank=True)
    descripcion = models.TextField(blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        unique_together = (("zona", "codigo"),)
        ordering = ["zona", "codigo"]

    def __str__(self) -> str:
        return f"{self.zona}/{self.codigo}"


class Nivel(models.Model):
    """Nivel o piso dentro de un rack."""

    empresa = models.ForeignKey(
        "core.Empresa", on_delete=models.CASCADE,
        related_name="niveles_almacen", db_index=True,
    )
    rack = models.ForeignKey(
        "Rack", on_delete=models.CASCADE, related_name="niveles", db_index=True,
    )
    codigo = models.CharField(max_length=20, db_index=True)
    altura = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    capacidad_kg = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    activo = models.BooleanField(default=True)

    class Meta:
        unique_together = (("rack", "codigo"),)
        ordering = ["rack", "codigo"]

    def __str__(self) -> str:
        return f"{self.rack}/{self.codigo}"


class Ubicacion(models.Model):
    """Ubicacion final donde se almacena fisicamente el producto."""

    TIPOS = [
        ("BIN", "Bin"),
        ("PALLET", "Pallet"),
        ("CAJON", "Cajon"),
        ("PISO", "Piso"),
    ]

    empresa = models.ForeignKey(
        "core.Empresa", on_delete=models.CASCADE,
        related_name="ubicaciones_almacen", db_index=True,
    )
    almacen = models.ForeignKey(
        "Almacen", on_delete=models.CASCADE,
        related_name="ubicaciones", db_index=True,
    )
    zona = models.ForeignKey(
        "Zona", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="ubicaciones",
    )
    rack = models.ForeignKey(
        "Rack", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="ubicaciones",
    )
    nivel = models.ForeignKey(
        "Nivel", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="ubicaciones",
    )
    codigo = models.CharField(max_length=40, db_index=True)
    nombre = models.CharField(max_length=120, blank=True)
    tipo = models.CharField(max_length=20, choices=TIPOS, default="BIN")
    capacidad_max = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    activa = models.BooleanField(default=True)
    bloqueada = models.BooleanField(default=False)

    class Meta:
        unique_together = (("almacen", "codigo"),)
        ordering = ["almacen", "codigo"]
        indexes = [
            models.Index(fields=["almacen", "activa"]),
        ]

    def __str__(self) -> str:
        return f"{self.almacen.codigo}/{self.codigo}"


# ---------------------------------------------------------------------------
# Trazabilidad
# ---------------------------------------------------------------------------


class Lote(models.Model):
    """Lote de produccion o compra para trazabilidad."""

    empresa = models.ForeignKey(
        "core.Empresa", on_delete=models.CASCADE,
        related_name="lotes", db_index=True,
    )
    producto = models.ForeignKey(
        "Producto", on_delete=models.CASCADE,
        related_name="lotes", db_index=True,
    )
    numero_lote = models.CharField(max_length=60, db_index=True)
    fecha_fabricacion = models.DateField(null=True, blank=True)
    fecha_caducidad = models.DateField(null=True, blank=True, db_index=True)
    proveedor = models.ForeignKey(
        "core.Empresa", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="lotes_proveidos",
    )
    cantidad_inicial = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    costo_unitario = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    notas = models.TextField(blank=True)
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = (("empresa", "producto", "numero_lote"),)
        ordering = ["-creado_en"]
        indexes = [
            models.Index(fields=["empresa", "producto", "fecha_caducidad"]),
        ]

    def __str__(self) -> str:
        return f"{self.producto.sku} L{self.numero_lote}"


class Serie(models.Model):
    """Numero de serie unico para productos serializados."""

    ESTADOS = [
        ("DISPONIBLE", "Disponible"),
        ("RESERVADA", "Reservada"),
        ("VENDIDA", "Vendida"),
        ("DEFECTUOSA", "Defectuosa"),
        ("BAJA", "Baja"),
    ]

    empresa = models.ForeignKey(
        "core.Empresa", on_delete=models.CASCADE,
        related_name="series_almacen", db_index=True,
    )
    producto = models.ForeignKey(
        "Producto", on_delete=models.CASCADE,
        related_name="series", db_index=True,
    )
    lote = models.ForeignKey(
        "Lote", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="series",
    )
    numero_serie = models.CharField(max_length=80, unique=True, db_index=True)
    estado = models.CharField(max_length=15, choices=ESTADOS, default="DISPONIBLE")
    almacen_actual = models.ForeignKey(
        "Almacen", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="series_actuales",
    )
    ubicacion_actual = models.ForeignKey(
        "Ubicacion", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="series_actuales",
    )
    garantia_hasta = models.DateField(null=True, blank=True)
    notas = models.TextField(blank=True)
    creada_en = models.DateTimeField(auto_now_add=True)
    actualizada_en = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-creada_en"]
        indexes = [
            models.Index(fields=["empresa", "producto", "estado"]),
        ]

    def __str__(self) -> str:
        return f"{self.producto.sku}#{self.numero_serie}"


# ---------------------------------------------------------------------------
# Inventario en tiempo real
# ---------------------------------------------------------------------------


class Existencia(models.Model):
    """Inventario en tiempo real por producto, almacen, ubicacion y lote."""

    empresa = models.ForeignKey(
        "core.Empresa", on_delete=models.CASCADE,
        related_name="existencias", db_index=True,
    )
    producto = models.ForeignKey(
        "Producto", on_delete=models.CASCADE,
        related_name="existencias", db_index=True,
    )
    almacen = models.ForeignKey(
        "Almacen", on_delete=models.CASCADE,
        related_name="existencias", db_index=True,
    )
    ubicacion = models.ForeignKey(
        "Ubicacion", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="existencias",
    )
    lote = models.ForeignKey(
        "Lote", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="existencias",
    )
    cantidad = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    disponible = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    comprometido = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    en_transito = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    costo_promedio = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = (("producto", "almacen", "ubicacion", "lote"),)
        ordering = ["producto", "almacen"]
        indexes = [
            models.Index(fields=["empresa", "producto"]),
            models.Index(fields=["empresa", "almacen"]),
        ]

    def __str__(self) -> str:
        return f"{self.producto.sku}@{self.almacen.codigo}={self.cantidad}"


# ---------------------------------------------------------------------------
# Movimientos
# ---------------------------------------------------------------------------


class Movimiento(models.Model):
    """Cabecera de movimiento de inventario."""

    TIPOS = [
        ("ENTRADA", "Entrada"),
        ("SALIDA", "Salida"),
        ("TRANSFERENCIA", "Transferencia"),
        ("AJUSTE", "Ajuste"),
    ]
    SUBTIPOS = [
        ("COMPRA", "Compra"),
        ("VENTA", "Venta"),
        ("PRODUCCION", "Produccion"),
        ("CONSUMO", "Consumo"),
        ("MERMA", "Merma"),
        ("DEVOLUCION_CLIENTE", "Devolucion Cliente"),
        ("DEVOLUCION_PROVEEDOR", "Devolucion Proveedor"),
        ("TRASPASO", "Traspaso"),
        ("AJUSTE_FISICO", "Ajuste Fisico"),
        ("INVENTARIO_INICIAL", "Inventario Inicial"),
        ("OTRO", "Otro"),
    ]
    ESTADOS = [
        ("BORRADOR", "Borrador"),
        ("APROBADO", "Aprobado"),
        ("CANCELADO", "Cancelado"),
        ("EN_TRANSITO", "En Transito"),
        ("RECIBIDO", "Recibido"),
    ]

    empresa = models.ForeignKey(
        "core.Empresa", on_delete=models.CASCADE,
        related_name="movimientos_inventario", db_index=True,
    )
    folio = models.CharField(max_length=30, db_index=True)
    tipo = models.CharField(max_length=20, choices=TIPOS, db_index=True)
    subtipo = models.CharField(max_length=30, choices=SUBTIPOS)
    fecha = models.DateTimeField(db_index=True)
    almacen_origen = models.ForeignKey(
        "Almacen", null=True, blank=True,
        on_delete=models.PROTECT, related_name="movimientos_origen",
    )
    almacen_destino = models.ForeignKey(
        "Almacen", null=True, blank=True,
        on_delete=models.PROTECT, related_name="movimientos_destino",
    )
    estado = models.CharField(
        max_length=15, choices=ESTADOS, default="BORRADOR", db_index=True,
    )
    documento_origen = models.TextField(blank=True)
    referencia = models.CharField(max_length=120, blank=True)
    comentario = models.TextField(blank=True)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="movimientos_creados",
    )
    aprobado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="movimientos_aprobados",
    )
    aprobado_en = models.DateTimeField(null=True, blank=True)
    cancelado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="movimientos_cancelados",
    )
    cancelado_en = models.DateTimeField(null=True, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = (("empresa", "folio"),)
        ordering = ["-fecha", "-id"]
        indexes = [
            models.Index(fields=["empresa", "tipo", "estado"]),
            models.Index(fields=["empresa", "fecha"]),
        ]

    def __str__(self) -> str:
        return f"{self.folio} ({self.tipo})"


class MovimientoDetalle(models.Model):
    """Lineas de detalle del movimiento."""

    movimiento = models.ForeignKey(
        "Movimiento", on_delete=models.CASCADE,
        related_name="detalles", db_index=True,
    )
    producto = models.ForeignKey(
        "Producto", on_delete=models.PROTECT,
        related_name="movimientos_detalle", db_index=True,
    )
    cantidad = models.DecimalField(max_digits=18, decimal_places=4)
    costo_unitario = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    importe = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    lote = models.ForeignKey(
        "Lote", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="movimientos_detalle",
    )
    serie = models.ForeignKey(
        "Serie", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="movimientos_detalle",
    )
    ubicacion_origen = models.ForeignKey(
        "Ubicacion", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="detalles_origen",
    )
    ubicacion_destino = models.ForeignKey(
        "Ubicacion", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="detalles_destino",
    )
    nota = models.CharField(max_length=200, blank=True)
    orden = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["movimiento", "orden", "id"]

    def __str__(self) -> str:
        return f"{self.movimiento.folio}#{self.orden}"


# ---------------------------------------------------------------------------
# Kardex (libro mayor de movimientos por producto/almacen)
# ---------------------------------------------------------------------------


class Kardex(models.Model):
    """Fila historica del kardex por producto-almacen."""

    empresa = models.ForeignKey(
        "core.Empresa", on_delete=models.CASCADE,
        related_name="kardex_filas", db_index=True,
    )
    producto = models.ForeignKey(
        "Producto", on_delete=models.CASCADE, related_name="kardex",
    )
    almacen = models.ForeignKey(
        "Almacen", on_delete=models.CASCADE, related_name="kardex",
    )
    movimiento = models.ForeignKey(
        "Movimiento", on_delete=models.CASCADE, related_name="kardex_filas",
    )
    movimiento_detalle = models.ForeignKey(
        "MovimientoDetalle", on_delete=models.CASCADE,
        related_name="kardex_filas",
    )
    fecha = models.DateTimeField(db_index=True)
    tipo = models.CharField(max_length=20)
    subtipo = models.CharField(max_length=30, blank=True)
    folio = models.CharField(max_length=30)
    cantidad_entrada = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    cantidad_salida = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    costo_unitario = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    importe_entrada = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    importe_salida = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    saldo_cantidad = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    saldo_costo_promedio = models.DecimalField(
        max_digits=18, decimal_places=4, default=0,
    )
    saldo_importe = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    metodo_costeo = models.CharField(max_length=20, default="PROMEDIO")
    referencia = models.CharField(max_length=120, blank=True)
    creada_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["fecha", "id"]
        indexes = [
            models.Index(fields=["producto", "almacen", "fecha"]),
            models.Index(fields=["empresa", "fecha"]),
        ]

    def __str__(self) -> str:
        return f"{self.producto.sku}@{self.almacen.codigo} {self.fecha:%Y-%m-%d}"


# ---------------------------------------------------------------------------
# Transferencias entre almacenes
# ---------------------------------------------------------------------------


class Transferencia(models.Model):
    """Documento de transferencia entre almacenes."""

    ESTADOS = [
        ("BORRADOR", "Borrador"),
        ("ENVIADA", "Enviada"),
        ("EN_TRANSITO", "En Transito"),
        ("RECIBIDA", "Recibida"),
        ("CANCELADA", "Cancelada"),
        ("PARCIAL", "Parcial"),
    ]

    empresa = models.ForeignKey(
        "core.Empresa", on_delete=models.CASCADE,
        related_name="transferencias", db_index=True,
    )
    folio = models.CharField(max_length=30, db_index=True)
    almacen_origen = models.ForeignKey(
        "Almacen", on_delete=models.PROTECT,
        related_name="transferencias_salientes",
    )
    almacen_destino = models.ForeignKey(
        "Almacen", on_delete=models.PROTECT,
        related_name="transferencias_entrantes",
    )
    fecha_envio = models.DateTimeField()
    fecha_recepcion = models.DateTimeField(null=True, blank=True)
    estado = models.CharField(max_length=15, choices=ESTADOS, default="BORRADOR")
    movimiento_salida = models.ForeignKey(
        "Movimiento", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="transferencia_salida",
    )
    movimiento_entrada = models.ForeignKey(
        "Movimiento", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="transferencia_entrada",
    )
    transportista = models.CharField(max_length=120, blank=True)
    guia = models.CharField(max_length=60, blank=True)
    comentario = models.TextField(blank=True)
    creada_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="transferencias_creadas",
    )
    recibida_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="transferencias_recibidas",
    )
    creada_en = models.DateTimeField(auto_now_add=True)
    actualizada_en = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = (("empresa", "folio"),)
        ordering = ["-fecha_envio", "-id"]
        indexes = [
            models.Index(fields=["empresa", "estado"]),
        ]

    def __str__(self) -> str:
        return f"TR-{self.folio}"


class TransferenciaDetalle(models.Model):
    """Detalle de productos enviados/recibidos por transferencia."""

    transferencia = models.ForeignKey(
        "Transferencia", on_delete=models.CASCADE,
        related_name="detalles", db_index=True,
    )
    producto = models.ForeignKey(
        "Producto", on_delete=models.PROTECT,
        related_name="transferencias_detalle",
    )
    lote = models.ForeignKey(
        "Lote", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="transferencias_detalle",
    )
    serie = models.ForeignKey(
        "Serie", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="transferencias_detalle",
    )
    cantidad_enviada = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    cantidad_recibida = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    costo_unitario = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    ubicacion_origen = models.ForeignKey(
        "Ubicacion", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="transferencias_origen",
    )
    ubicacion_destino = models.ForeignKey(
        "Ubicacion", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="transferencias_destino",
    )
    nota = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ["transferencia", "id"]

    def __str__(self) -> str:
        return f"{self.transferencia.folio}#{self.id}"


# ---------------------------------------------------------------------------
# Alertas
# ---------------------------------------------------------------------------


class Alerta(models.Model):
    """Alertas de inventario (bajo stock, caducidad, exceso, reorden)."""

    TIPOS = [
        ("BAJO_INVENTARIO", "Bajo Inventario"),
        ("CADUCIDAD_PROXIMA", "Caducidad Proxima"),
        ("EXCESO", "Exceso de Inventario"),
        ("SIN_STOCK", "Sin Stock"),
        ("PUNTO_REORDEN", "Punto de Reorden"),
    ]
    NIVELES = [
        ("INFO", "Info"),
        ("ADVERTENCIA", "Advertencia"),
        ("CRITICA", "Critica"),
    ]

    empresa = models.ForeignKey(
        "core.Empresa", on_delete=models.CASCADE,
        related_name="alertas_almacen", db_index=True,
    )
    tipo = models.CharField(max_length=25, choices=TIPOS)
    producto = models.ForeignKey(
        "Producto", on_delete=models.CASCADE, related_name="alertas",
    )
    almacen = models.ForeignKey(
        "Almacen", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="alertas",
    )
    lote = models.ForeignKey(
        "Lote", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="alertas",
    )
    nivel = models.CharField(max_length=15, choices=NIVELES, default="ADVERTENCIA")
    mensaje = models.CharField(max_length=300)
    dias_restantes = models.IntegerField(null=True, blank=True)
    cantidad_actual = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    umbral = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    creada = models.DateTimeField(auto_now_add=True)
    atendida = models.BooleanField(default=False)
    atendida_en = models.DateTimeField(null=True, blank=True)
    atendida_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="alertas_atendidas",
    )
    comentario_atencion = models.TextField(blank=True)

    class Meta:
        ordering = ["-creada"]
        indexes = [
            models.Index(fields=["empresa", "tipo", "atendida"]),
            models.Index(fields=["producto", "almacen"]),
        ]

    def __str__(self) -> str:
        return f"[{self.tipo}] {self.producto.sku}"
