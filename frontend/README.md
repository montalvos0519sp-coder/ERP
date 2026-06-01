# Frontend Next.js · ERP Profesional

## Setup

```bash
npm install
cp .env.local.example .env.local
npm run dev    # http://localhost:3000
```

## Stack

- **Next.js 16** (App Router, Turbopack)
- **React 19**
- **Tailwind CSS 4**
- **Lucide React** (iconos)
- **TypeScript 5**

## Design System

Replicado del proyecto `3rrecycling-next-main`:

- 7 tipografias seleccionables (Plus Jakarta Sans, Poppins, Nunito, Raleway, Playfair, Space Grotesk, JetBrains Mono).
- 9 colores de acento.
- Glass morphism + animaciones liquid + dot-glow + slide-in.
- Dark/light mode con override del acento en oscuro.

Toda la apariencia se controla desde `Perfil → Preferencias` (persistida en localStorage por usuario).

## Estructura de rutas

```
/                          → Dashboard general (KPIs + accesos rapidos)
/login                     → Autenticacion (publica)
/perfil                    → Preferencias del usuario

/admin/empresas            → CRUD de empresas
/admin/usuarios            → CRUD de usuarios
/admin/modulos             → Toggle de modulos por empresa
/admin/permisos            → Asignacion de modulos por usuario
/admin/configuracion       → PAC, emisor CFDI, defaults
/admin/bitacora            → Auditoria del sistema

/catalogos/sat             → Carga de catalogos SAT desde Excel

/facturacion               → Listado de CFDI
/facturacion/nueva         → Captura de factura

/carta-porte               → Cartas Porte 3.1

/viajes                    → Bitacora de viajes
```

El **menu lateral es dinamico**: lo genera el backend (`/api/modulos/mi-menu/`) en funcion de:

1. La empresa activa del usuario.
2. Los modulos que la empresa tiene activos.
3. Los modulos que el staff le asigno al usuario.

Por eso un usuario puede solo ver "Viajes" y "Carta Porte" mientras que otro ve todo.

## Como agregar una pagina nueva

1. En el backend, en `backend/apps/modulos/seed.py`, agrega el modulo al diccionario `MODULOS_BASE` con su `codigo`, `nombre`, `icono` (nombre de lucide), `ruta_frontend`.
2. Corre `python manage.py migrate` para sembrar.
3. En el frontend, crea `app/<ruta>/page.tsx`. Listo: aparece automaticamente en el menu para los usuarios con asignacion.

## Variables de entorno

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```
