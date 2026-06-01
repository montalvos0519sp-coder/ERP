# Backend Django · ERP Profesional

## Setup

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py seed_sat_minimo
python manage.py cargar_catalogos_sat
python manage.py bootstrap
python manage.py runserver
```

## Comandos importantes

| Comando | Descripcion |
|---------|-------------|
| `python manage.py migrate` | Aplica migraciones (post_migrate siembra modulos base) |
| `python manage.py seed_sat_minimo` | Carga UsoCFDI, FormaPago, MetodoPago, Moneda, Regimen, TipoFigura, TipoPermiso |
| `python manage.py cargar_catalogos_sat` | Carga Carta Porte + Productos + Unidades + CP + Estados + Municipios + Colonias desde Excel |
| `python manage.py cargar_catalogos_sat --solo cp` | Solo Carta Porte |
| `python manage.py bootstrap` | Crea empresa demo + admin |
| `python manage.py createsuperuser` | Superadmin Django nativo |

## URLs principales

| Endpoint | Descripcion |
|----------|-------------|
| `POST /api/auth/login/` | Login (devuelve JWT) |
| `GET  /api/auth/me/` | Datos del usuario logueado |
| `GET  /api/core/empresas/` | Empresas a las que pertenece el usuario |
| `GET  /api/core/configuracion/{id}/` | Config PAC + emisor de una empresa |
| `GET  /api/modulos/modulos/` | Catalogo de modulos |
| `GET  /api/modulos/mi-menu/?empresa=1` | Menu dinamico para el usuario actual |
| `POST /api/modulos/modulo-empresa/toggle/` | Activa/desactiva modulo en empresa |
| `POST /api/modulos/asignaciones/bulk_set/` | Asigna lista de modulos a un usuario |
| `GET  /api/catalogos-sat/estadisticas/` | Cuentas de catalogos cargados |
| `POST /api/catalogos-sat/upload/` | Sube Excel y carga catalogo |
| `GET  /api/facturacion/facturas/` | Listado de CFDI emitidos |
| `POST /api/facturacion/facturas/{id}/timbrar/` | Timbrar factura via PAC |
| `POST /api/facturacion/facturas/{id}/cancelar/` | Cancelar factura |
| `GET  /api/carta-porte/cartas-porte/` | Cartas Porte |
| `GET  /api/bitacora/eventos/` | Auditoria |

## Variables de entorno (.env)

```
SECRET_KEY=...
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=sqlite:///db.sqlite3
CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000
```

Para PostgreSQL en produccion:
```
DATABASE_URL=postgres://user:pwd@host:5432/db
```

## Estructura

Ver el README raiz para arquitectura completa.
