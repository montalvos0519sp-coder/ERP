"""Siembra de modulos base en post_migrate.

Define el catalogo completo de modulos del ERP. Idempotente: usa update_or_create.
Las empresas activan/desactivan via ModuloEmpresa, y los usuarios via AsignacionModulo.
"""
from __future__ import annotations


MODULOS_BASE = [
    # ── OPERATIVO ──
    {"codigo": "dashboard", "nombre": "Mando Central", "categoria": "OPERATIVO",
     "icono": "LayoutDashboard", "ruta_frontend": "/", "color": "#1A73E8", "es_core": True, "orden": 10},

    # ── LOGISTICA ──
    {"codigo": "viajes", "nombre": "Bitacora de Viajes", "categoria": "LOGISTICA",
     "icono": "Truck", "ruta_frontend": "/viajes", "color": "#F59E0B", "orden": 20},
    {"codigo": "flota", "nombre": "Flota de Unidades", "categoria": "CATALOGOS",
     "icono": "Truck", "ruta_frontend": "/flota", "color": "#0EA5E9", "orden": 405},
    {"codigo": "carta-porte", "nombre": "Carta Porte 3.1", "categoria": "LOGISTICA",
     "icono": "FileText", "ruta_frontend": "/carta-porte", "color": "#F59E0B",
     "requiere_carta_porte": True, "orden": 30},
    {"codigo": "mantenimiento", "nombre": "Mantenimiento", "categoria": "LOGISTICA",
     "icono": "Wrench", "ruta_frontend": "/mantenimiento", "color": "#F59E0B", "orden": 40},
    {"codigo": "almacen", "nombre": "Almacen", "categoria": "LOGISTICA",
     "icono": "Warehouse", "ruta_frontend": "/almacen", "color": "#F59E0B",
     "requiere_staff": False, "orden": 50},
    {"codigo": "almacen_productos", "nombre": "Productos", "categoria": "LOGISTICA",
     "icono": "Package", "ruta_frontend": "/almacen/productos", "color": "#F59E0B",
     "requiere_staff": False, "orden": 51},
    {"codigo": "almacen_almacenes", "nombre": "Almacenes y Ubicaciones", "categoria": "LOGISTICA",
     "icono": "Warehouse", "ruta_frontend": "/almacen/almacenes", "color": "#F59E0B",
     "requiere_staff": False, "orden": 52},
    {"codigo": "almacen_movimientos", "nombre": "Movimientos de Inventario", "categoria": "LOGISTICA",
     "icono": "ArrowDownToLine", "ruta_frontend": "/almacen/movimientos", "color": "#F59E0B",
     "requiere_staff": False, "orden": 53},
    {"codigo": "almacen_transferencias", "nombre": "Transferencias", "categoria": "LOGISTICA",
     "icono": "ArrowUpFromLine", "ruta_frontend": "/almacen/transferencias", "color": "#F59E0B",
     "requiere_staff": False, "orden": 54},
    {"codigo": "almacen_kardex", "nombre": "Kardex", "categoria": "LOGISTICA",
     "icono": "ScrollText", "ruta_frontend": "/almacen/kardex", "color": "#F59E0B",
     "requiere_staff": False, "orden": 55},
    {"codigo": "almacen_existencias", "nombre": "Existencias", "categoria": "LOGISTICA",
     "icono": "Boxes", "ruta_frontend": "/almacen/existencias", "color": "#F59E0B",
     "requiere_staff": False, "orden": 56},
    {"codigo": "almacen_lotes", "nombre": "Lotes y Series", "categoria": "LOGISTICA",
     "icono": "Boxes", "ruta_frontend": "/almacen/lotes", "color": "#F59E0B",
     "requiere_staff": False, "orden": 57},
    {"codigo": "almacen_alertas", "nombre": "Alertas de Inventario", "categoria": "LOGISTICA",
     "icono": "AlertTriangle", "ruta_frontend": "/almacen/alertas", "color": "#F59E0B",
     "requiere_staff": False, "orden": 58},
    {"codigo": "almacen_reportes", "nombre": "Reportes de Almacen", "categoria": "LOGISTICA",
     "icono": "ScrollText", "ruta_frontend": "/almacen/reportes", "color": "#F59E0B",
     "requiere_staff": False, "orden": 59},
    {"codigo": "almacen_etiquetas", "nombre": "Etiquetas (codigo de barras/QR)", "categoria": "LOGISTICA",
     "icono": "QrCode", "ruta_frontend": "/almacen/etiquetas", "color": "#F59E0B",
     "requiere_staff": False, "orden": 60},
    {"codigo": "liquidaciones", "nombre": "Liquidaciones de Operador", "categoria": "LOGISTICA",
     "icono": "Wallet", "ruta_frontend": "/liquidaciones", "color": "#F59E0B", "orden": 60},

    # ── RH ──
    {"codigo": "rh-dashboard", "nombre": "Dashboard RH", "categoria": "RH",
     "icono": "UserCheck", "ruta_frontend": "/rh", "color": "#10B981", "orden": 100},
    {"codigo": "rh-empleados", "nombre": "Empleados", "categoria": "RH",
     "icono": "Users", "ruta_frontend": "/rh/empleados", "color": "#10B981", "orden": 110},
    {"codigo": "rh-vacaciones", "nombre": "Vacaciones", "categoria": "RH",
     "icono": "CalendarDays", "ruta_frontend": "/rh/vacaciones", "color": "#10B981", "orden": 120},
    {"codigo": "rh-prestamos", "nombre": "Prestamos", "categoria": "RH",
     "icono": "CreditCard", "ruta_frontend": "/rh/prestamos", "color": "#10B981", "orden": 130},
    {"codigo": "rh-solicitudes", "nombre": "Solicitudes RH (Staff)", "categoria": "RH",
     "icono": "FileText", "ruta_frontend": "/rh/solicitudes", "color": "#10B981",
     "requiere_staff": True, "orden": 140},
    {"codigo": "rh-permisos", "nombre": "Permisos", "categoria": "RH",
     "icono": "FileText", "ruta_frontend": "/rh/permisos", "color": "#6366F1",
     "requiere_staff": True, "orden": 145},
    {"codigo": "mis-solicitudes", "nombre": "Mis Solicitudes", "categoria": "OPERATIVO",
     "icono": "FileText", "ruta_frontend": "/mis-solicitudes", "color": "#6366F1", "orden": 15},

    # ── FINANZAS ──
    {"codigo": "facturacion", "nombre": "Facturacion CFDI 4.0", "categoria": "FINANZAS",
     "icono": "FileText", "ruta_frontend": "/facturacion", "color": "#34A853", "orden": 200},
    {"codigo": "nomina", "nombre": "Nomina (CFDI 4.0)", "categoria": "FINANZAS",
     "icono": "Calculator", "ruta_frontend": "/nomina", "color": "#10B981",
     "requiere_staff": True, "orden": 205},
    {"codigo": "nomina-dashboard", "nombre": "Panel de nomina", "categoria": "FINANZAS",
     "icono": "LayoutDashboard", "ruta_frontend": "/nomina", "color": "#10B981", "orden": 205},
    {"codigo": "nomina-periodos", "nombre": "Periodos de nomina", "categoria": "FINANZAS",
     "icono": "Calculator", "ruta_frontend": "/nomina/periodos", "color": "#10B981",
     "requiere_staff": True, "orden": 206},
    {"codigo": "nomina-cfdi", "nombre": "CFDI Nomina emitidos", "categoria": "FINANZAS",
     "icono": "FileText", "ruta_frontend": "/nomina/cfdi", "color": "#10B981",
     "requiere_staff": True, "orden": 207},
    {"codigo": "nomina-config", "nombre": "Configuracion PAC (nomina)", "categoria": "FINANZAS",
     "icono": "Settings", "ruta_frontend": "/nomina/config", "color": "#10B981",
     "requiere_staff": True, "orden": 208},
    {"codigo": "cxp", "nombre": "Cuentas por Pagar", "categoria": "FINANZAS",
     "icono": "Banknote", "ruta_frontend": "/cxp", "color": "#34A853", "orden": 210},
    {"codigo": "ordenes-compra", "nombre": "Ordenes de Compra", "categoria": "FINANZAS",
     "icono": "ShoppingCart", "ruta_frontend": "/ordenes-compra", "color": "#34A853", "orden": 220},

    # ── ADMIN ──
    {"codigo": "admin-empresas", "nombre": "Empresas", "categoria": "ADMIN",
     "icono": "Building2", "ruta_frontend": "/admin/empresas", "color": "#8B5CF6",
     "requiere_staff": True, "es_core": True, "orden": 300},
    {"codigo": "admin-usuarios", "nombre": "Usuarios", "categoria": "ADMIN",
     "icono": "Users", "ruta_frontend": "/admin/usuarios", "color": "#8B5CF6",
     "requiere_staff": True, "es_core": True, "orden": 310},
    {"codigo": "admin-modulos", "nombre": "Modulos", "categoria": "ADMIN",
     "icono": "Boxes", "ruta_frontend": "/admin/modulos", "color": "#8B5CF6",
     "requiere_staff": True, "es_core": True, "orden": 320},
    {"codigo": "admin-permisos", "nombre": "Permisos", "categoria": "ADMIN",
     "icono": "Lock", "ruta_frontend": "/admin/permisos", "color": "#8B5CF6",
     "requiere_staff": True, "es_core": True, "orden": 330},
    {"codigo": "admin-catalogos-rh", "nombre": "Catalogos RH (tipos de solicitud)", "categoria": "ADMIN",
     "icono": "FileText", "ruta_frontend": "/admin/catalogos-rh", "color": "#8B5CF6",
     "requiere_staff": True, "orden": 335},
    {"codigo": "admin-configuracion", "nombre": "Configuracion (PAC, RFC, CSD)", "categoria": "ADMIN",
     "icono": "Settings", "ruta_frontend": "/admin/configuracion", "color": "#8B5CF6",
     "requiere_staff": True, "es_core": True, "orden": 340},
    {"codigo": "admin-bitacora", "nombre": "Bitacora del Sistema", "categoria": "ADMIN",
     "icono": "Activity", "ruta_frontend": "/admin/bitacora", "color": "#8B5CF6",
     "requiere_staff": True, "orden": 350},

    # ── COMUNICACION ──
    {"codigo": "chat", "nombre": "Mensajes", "categoria": "OPERATIVO",
     "icono": "MessageCircle", "ruta_frontend": "/chat", "color": "#6366F1",
     "es_core": True, "orden": 17},

    # ── PRODUCTIVIDAD ──
    {"codigo": "diagramas", "nombre": "Diagramas de Flujo", "categoria": "OPERATIVO",
     "icono": "Workflow", "ruta_frontend": "/diagramas", "color": "#EC4899",
     "es_core": True, "orden": 18},
    {"codigo": "documentos", "nombre": "Gestion Documental (ISO 9001)", "categoria": "OPERATIVO",
     "icono": "FolderOpen", "ruta_frontend": "/documentos", "color": "#0EA5E9",
     "es_core": True, "orden": 19},
    {"codigo": "admin-documentos", "nombre": "Documentos (config)", "categoria": "ADMIN",
     "icono": "FolderCog", "ruta_frontend": "/admin/documentos", "color": "#8B5CF6",
     "requiere_staff": True, "orden": 345},

    # ── CATALOGOS ──
    {"codigo": "catalogos-sat", "nombre": "Catalogos SAT", "categoria": "CATALOGOS",
     "icono": "Database", "ruta_frontend": "/catalogos/sat", "color": "#0EA5E9", "orden": 400},
    {"codigo": "catalogos-empresa", "nombre": "Catalogos de Empresa", "categoria": "CATALOGOS",
     "icono": "Database", "ruta_frontend": "/catalogos/empresa", "color": "#0EA5E9", "orden": 410},
]


def seed_modulos(sender, **kwargs):
    from .models import AccionModulo, Modulo, ACCIONES_BASE

    for spec in MODULOS_BASE:
        modulo, _ = Modulo.objects.update_or_create(
            codigo=spec["codigo"],
            defaults={
                "nombre": spec["nombre"],
                "categoria": spec.get("categoria", "ADMIN"),
                "icono": spec.get("icono", "LayoutDashboard"),
                "ruta_frontend": spec.get("ruta_frontend", "/"),
                "color": spec.get("color", "#1A73E8"),
                "orden": spec.get("orden", 100),
                "requiere_staff": spec.get("requiere_staff", False),
                "requiere_carta_porte": spec.get("requiere_carta_porte", False),
                "es_core": spec.get("es_core", False),
            },
        )
        # Crea acciones base por modulo si no existen.
        for codigo, _label in ACCIONES_BASE:
            AccionModulo.objects.get_or_create(modulo=modulo, codigo=codigo)
