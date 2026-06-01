# ERP Profesional · Multi-empresa · 100% Configurable

Sistema ERP nuevo, construido **desde cero**, que toma:

- **Visualizacion / Design System** del proyecto `3rrecycling-next-main` (Next.js 16 + Tailwind v4 + tipografia configurable + glass morphism + sidebar dinamico).
- **Funcionalidad fiscal mexicana** (CFDI 4.0 + Carta Porte 3.1 + catalogos SAT desde Excel) del proyecto `PROYECTO-MIGMAR-main`.

> **No se modifico ninguno de los proyectos de referencia.** Este es un proyecto independiente que reusa el conocimiento, no el codigo, y lo eleva a una arquitectura **multi-tenant, modular y 100% configurable desde la UI**.

## Tabla de contenidos

1. [Filosofia](#filosofia)
2. [Arquitectura](#arquitectura)
3. [Setup rapido](#setup-rapido)
4. [Modulos incluidos](#modulos-incluidos)
5. [Como funciona la configuracion total](#como-funciona-la-configuracion-total)
6. [Estructura de archivos](#estructura-de-archivos)
7. [Catalogos SAT desde Excel](#catalogos-sat-desde-excel)
8. [Integracion PAC (timbrado)](#integracion-pac-timbrado)

---

## Filosofia

- **Una sola base de codigo, multiples empresas.** Cada empresa tiene su propio PAC, su propio emisor, su propia config de CFDI, sus propios catalogos.
- **Todo se configura desde el sistema.** No hay secrets hardcodeados, no hay claves en .env del codigo de aplicacion. El staff puede pegar su API Key del PAC en una pantalla y empezar a timbrar.
- **Modulos enchufables.** El staff de cada empresa activa o desactiva los modulos que necesita (facturacion, carta porte, viajes, RH, almacen, etc.). Los usuarios solo ven en su menu los modulos que les asignaron.
- **Disenado para crecer.** Agregar un nuevo modulo se reduce a: crear una app Django, registrar el modulo en `apps/modulos/seed.py`, y crear las paginas Next.js. El menu se actualiza solo.

---

## Arquitectura

```
┌────────────────────────────────────────────────────────────────┐
│                       FRONTEND  (Next.js 16)                   │
│  React 19 · Tailwind v4 · Lucide · Glass morphism · A11y       │
│  - DashboardShell con sidebar/header dinamicos                 │
│  - Menu derivado de /api/modulos/mi-menu/                      │
│  - JWT en localStorage + cookies CSRF                          │
└────────────────────────┬───────────────────────────────────────┘
                         │ REST + JSON
┌────────────────────────▼───────────────────────────────────────┐
│                        BACKEND  (Django 5 + DRF)               │
│  apps/                                                         │
│   ├ core              Empresa, Sucursal, Usuario, Config       │
│   ├ modulos           Catalogo de modulos + asignacion         │
│   ├ catalogos_sat     Loader de Excel → BD                     │
│   ├ facturacion       CFDI 4.0 (PAC swap-able)                 │
│   ├ carta_porte       Complemento Carta Porte 3.1              │
│   ├ viajes, flota, rh, almacen, cxp, ordenes_compra,           │
│   │ mantenimiento, liquidaciones                               │
│   └ bitacora          Auditoria global                         │
└────────────────────────────────────────────────────────────────┘
```

### Sistema de permisos (3 niveles)

1. **Membresia (UsuarioEmpresa)** — un usuario pertenece a N empresas con un rol (OWNER, STAFF, MANAGER, USER, READONLY).
2. **Modulo activo en empresa (ModuloEmpresa)** — el staff activa/desactiva modulos por empresa.
3. **Asignacion (AsignacionModulo)** — el staff decide que modulos ve cada usuario en el menu.

Middleware `ModuloAccessMiddleware` bloquea las rutas `/api/<modulo>/` si el usuario no tiene asignacion (superuser y staff de empresa pasan siempre).

---

## Setup rapido

### Requisitos

- Python 3.11+
- Node.js 18+
- (Opcional) PostgreSQL — por defecto usa SQLite.

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate         # Windows
# source venv/bin/activate    # macOS / Linux
pip install -r requirements.txt
cp .env.example .env          # ajusta variables
python manage.py migrate
python manage.py seed_sat_minimo         # catalogos cortos del SAT
python manage.py cargar_catalogos_sat    # carga Carta Porte + Productos + Unidades + CP
python manage.py bootstrap               # crea empresa demo + admin/admin12345
python manage.py runserver               # http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev                              # http://localhost:3000
```

Entra con `admin / admin12345`.

---

## Modulos incluidos

| Categoria              | Modulo                  | Propósito                                         |
|------------------------|-------------------------|---------------------------------------------------|
| Centro Operativo       | Mando Central           | Dashboard general                                 |
| Logistica y Recursos   | Bitacora de Viajes      | Programacion y bitacora de viajes                 |
|                        | Flota                   | Unidades, cargas de combustible                   |
|                        | Carta Porte 3.1         | Complemento Carta Porte SAT                       |
|                        | Mantenimiento           | Ordenes preventivas / correctivas                 |
|                        | Almacen                 | Inventario + movimientos                          |
|                        | Liquidaciones Operador  | Pagos a operadores por viaje                      |
| Recursos Humanos       | Dashboard RH            | KPIs de personal                                  |
|                        | Empleados, Vacaciones, Prestamos                                            |
| Inteligencia y Finanzas| Facturacion CFDI 4.0    | Emision, timbrado, cancelacion                    |
|                        | Cuentas por Pagar       | Facturas de proveedores y pagos                   |
|                        | Ordenes de Compra       | OC con partidas y recepcion parcial               |
| Administracion         | Empresas, Usuarios, Modulos, Permisos, Configuracion (PAC), Bitacora        |
| Catalogos              | Catalogos SAT           | Carga via Excel desde el frontend                 |

---

## Como funciona la configuracion total

### 1. Crear una empresa nueva
   - UI: `Administracion → Empresas → Nueva empresa`.
   - El sistema crea automaticamente la `ConfiguracionEmpresa` vacia.

### 2. Configurar PAC y emisor CFDI
   - UI: `Administracion → Configuracion (PAC, RFC, CSD)`.
   - Seleccionas PAC (Factura.com / manual), API Key, Secret Key.
   - Capturas RFC emisor, regimen, CP de lugar de expedicion.
   - Defaults: forma de pago, metodo, uso CFDI.

### 3. Activar modulos
   - UI: `Administracion → Modulos`.
   - Para cada modulo del catalogo, switch on/off (excepto los `es_core` siempre activos).

### 4. Crear usuarios
   - UI: `Administracion → Usuarios → Nuevo`.
   - Despues asocialos a la empresa via `usuario-empresa` con rol.

### 5. Asignar modulos a usuarios
   - UI: `Administracion → Permisos`.
   - Eliges usuario → marcas con switches los modulos visibles para el.

### 6. Cargar/actualizar catalogos SAT
   - UI: `Catalogos → Catalogos SAT → Subir`.
   - Sube `CatalogosCartaPorte31.xlsx`, `PRODUCTOS.xlsx`, etc.
   - El sistema parsea y carga en BD.

---

## Estructura de archivos

```
ERP-PROFESIONAL/
├ backend/
│  ├ erp_core/             settings, urls, wsgi
│  ├ apps/
│  │  ├ core/              empresas, usuarios, config, certificados CSD
│  │  ├ modulos/           catalogo de modulos + asignaciones + seed
│  │  ├ catalogos_sat/     modelos SAT + management commands
│  │  ├ facturacion/       CFDI 4.0 + PAC backend abstracto
│  │  ├ carta_porte/       complemento Carta Porte 3.1
│  │  ├ viajes/ flota/ rh/ almacen/ cxp/ ordenes_compra/
│  │  ├ mantenimiento/ liquidaciones/
│  │  └ bitacora/          auditoria + middleware
│  ├ data_catalogos/       Excel del SAT (Carta Porte, CP, etc.)
│  ├ requirements.txt
│  └ manage.py
└ frontend/
   ├ app/                  paginas Next.js (App Router)
   │  ├ login/             autenticacion
   │  ├ admin/             empresas, usuarios, modulos, permisos, configuracion, bitacora
   │  ├ catalogos/sat/     UI de carga de catalogos
   │  ├ facturacion/       listado, nueva factura, timbrado
   │  ├ carta-porte/       listado y operaciones CP
   │  ├ viajes/            bitacora de viajes
   │  └ perfil/            preferencias del usuario
   ├ components/
   │  ├ ui/                Badge, Button, Card, Input, Select, Switch
   │  ├ DashboardShell.tsx sidebar + header dinamicos
   │  ├ ClientShell.tsx    providers
   │  └ FluidBackground.tsx  fondo animado
   ├ lib/
   │  ├ api.ts             cliente HTTP (JWT + CSRF)
   │  ├ theme.ts           tokens light/dark (3rrecycling style)
   │  ├ ThemeContext.tsx   dark mode toggle
   │  ├ UserContext.tsx    sesion + empresa activa
   │  ├ UserPrefsContext.tsx  fuente, tamano, acento
   │  └ icons.ts           mapeo nombre lucide → componente
   └ package.json
```

---

## Catalogos SAT desde Excel

El folder `backend/data_catalogos/` contiene los Excel oficiales del SAT (copiados al inicio desde `PROYECTO-MIGMAR-main`).

```bash
# Carga TODOS los catalogos
python manage.py cargar_catalogos_sat

# Solo Carta Porte
python manage.py cargar_catalogos_sat --solo cp

# Solo unidades + productos + CP postal
python manage.py cargar_catalogos_sat --solo unidad,prod,cp_postal

# Catalogos pequenos hardcoded (UsoCFDI, FormaPago, etc.)
python manage.py seed_sat_minimo
```

Tambien se pueden subir desde la UI en `Catalogos → SAT → Subir`.

---

## Integracion PAC (timbrado)

El modulo `facturacion/pac.py` define una **interfaz abstracta** `PacBackend` y dos implementaciones:

- **`FacturaComBackend`** — integracion con Factura.com (CFDI 4.0).
- **`ManualBackend`** — no timbra; util para desarrollo o empresas sin PAC todavia.

Cambiar de PAC se reduce a:

1. Crear una clase nueva que herede de `PacBackend` y implemente `timbrar_factura`, `timbrar_pago`, `cancelar`, etc.
2. Anadirla a `get_pac_backend()` con un nuevo nombre.
3. En la UI de configuracion, agregar la opcion al `<select>`.

No se toca nada del modelo, ni de los serializers, ni del frontend.

---

## Licencia

Codigo de uso libre para los proyectos de MIGMAR. No incluye los Excel del SAT (que son publicos pero deben mantenerse en el folder `data_catalogos`).
#   E R P  
 #   E R P  
 