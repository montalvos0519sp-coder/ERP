# Deploy: Render (backend + Postgres + Redis) + Vercel (frontend)

Esta guia te lleva de **localhost** a **produccion publica con >=30 usuarios concurrentes** en una sentada.

Costo aproximado: **$24 USD/mes en Render** (Postgres $7 + Redis $10 + Web $7) + **$0** en Vercel (Hobby).

---

## Arquitectura

```
[Usuarios] → Vercel (Next.js, edge global)
              ↓ HTTPS + JWT
            Render Web Service (Daphne ASGI)
              ↓
   ┌──────────┴──────────┐
[Postgres 16]        [Redis 7]
                       ↳ Cache + Channel Layer (chat WebSockets)
```

**Por que es rapido:**
- `conn_max_age=600` + `conn_health_checks=True` → conexiones a Postgres persistentes (no abre socket por request).
- GZip middleware → respuestas JSON pesadas viajan ~70% mas chicas.
- Redis cache compartido entre workers → catalogos SAT (>20k filas) cacheados.
- Daphne single-process maneja cientos de WebSockets a la vez (asyncio).
- Vercel edge sirve los assets estaticos del Next.js desde >40 ubicaciones.

---

## PASO 1 — Subir el codigo a GitHub

Si aun no tienes repo:

```bash
cd "C:/Users/MIGMAR/Desktop/Nueva carpeta (26)/ERP-PROFESIONAL/ERP-PROFESIONAL"
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<tu-usuario>/erp-profesional.git
git push -u origin main
```

---

## PASO 2 — Deploy backend en Render (Blueprint, 1 click)

1. Entra a https://dashboard.render.com → **New +** → **Blueprint**.
2. Conecta tu repo de GitHub.
3. Render detecta `render.yaml` automaticamente. Te muestra:
   - 1 Postgres (`erp-postgres`)
   - 1 Redis (`erp-redis`)
   - 1 Web Service (`erp-backend`)
4. Confirma. Render crea los 3 recursos y arranca el primer build (~5 min).
5. Cuando termine, **copia la URL** que te da: algo como `https://erp-backend.onrender.com`.

### Primer superuser

En el dashboard del servicio web → **Shell** (tab):

```bash
python manage.py createsuperuser
```

### Cargar catalogos SAT

Si tienes los Excel de `data_catalogos/`, ya van en el repo. Si necesitas reimportar:

```bash
# En el shell de Render
python manage.py shell
>>> from apps.catalogos_sat.utils import importar_todos
>>> importar_todos()
```

---

## PASO 3 — Deploy frontend en Vercel

1. https://vercel.com/new → importa el mismo repo.
2. **Root Directory:** `frontend`
3. **Framework Preset:** Next.js (lo detecta solo)
4. **Environment Variables:**

| Nombre | Valor |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://erp-backend.onrender.com` (la URL del paso 2) |

5. **Deploy**. Vercel construye y te da una URL como `https://erp-profesional.vercel.app`.

---

## PASO 4 — Conectar los dos

Vuelve a Render → servicio `erp-backend` → **Environment** y agrega:

| Nombre | Valor |
|---|---|
| `FRONTEND_URL` | `https://erp-profesional.vercel.app` |
| `CORS_ORIGIN` | `https://erp-profesional.vercel.app` |

Render redeploya solo. **Listo** — abre la URL de Vercel y logueate con el superuser.

---

## PASO 5 — Migrar datos de SQLite a Postgres (opcional)

Si quieres llevarte los datos de `db.sqlite3` local:

```bash
# Local: exporta todo a JSON (excluyendo tablas grandes que se regeneran)
cd backend
python manage.py dumpdata --natural-foreign --natural-primary \
  --exclude contenttypes --exclude auth.permission \
  --exclude bitacora --exclude sessions \
  -o dump.json

# Sube dump.json a Render (drag and drop en el shell o via S3) y:
python manage.py loaddata dump.json
```

> Si el dump es muy grande, mejor: instala Postgres local, conecta tu `.env` a el, corre `migrate` + `loaddata` ahi, luego usa `pg_dump`/`pg_restore` contra la BD de Render.

---

## Mantenimiento y escalado

### Cuando 30 usuarios ya no alcanza

- **Postgres**: sube de `starter` (97 conn) a `standard` (197 conn) — $20/mes.
- **Web**: sube `starter` (0.5 CPU) a `standard` (1 CPU). Daphne single-process es asincrono, asi que NO necesitas multiples workers; un solo proceso multiplexa cientos de conexiones simultaneas.
- **Redis**: starter (25MB) aguanta mucho. Sube a standard solo si ves OOM.

### Tareas pesadas (PDFs, exports Excel grandes)

Hoy se hacen sincronas dentro del request. Si empiezan a tardar >5s con varios usuarios:
1. Anade `celery` + `redis` como broker.
2. Mueve `liquidaciones/.../pdf`, `viajes/.../pdf`, `*/export-excel/` a tareas async.

### Monitoreo

- **Render**: tab "Metrics" muestra CPU/RAM por servicio.
- **Postgres**: tab "Metrics" muestra conexiones activas. Si pegas el techo (97 en starter), o subes plan o bajas `CONN_MAX_AGE`.

---

## Variables de entorno — referencia rapida

### Backend (Render)
| Variable | Para que sirve |
|---|---|
| `SECRET_KEY` | Firma de sesiones/JWT. Render la genera. |
| `DEBUG` | `False` en prod. |
| `ALLOWED_HOSTS` | Dominios permitidos. Render auto-agrega `*.onrender.com`. |
| `DATABASE_URL` | Postgres connection string (inyectado por Render). |
| `REDIS_URL` | Redis URL (inyectado por Render). |
| `FRONTEND_URL` | URL del frontend en Vercel (para CORS/CSRF). |
| `CORS_ORIGIN` | Lista de origenes permitidos. |
| `SECURE_SSL_REDIRECT` | `True` para forzar HTTPS. |
| `AWS_STORAGE_BUCKET_NAME` | (Opcional) Si quieres mover MEDIA a S3. |

### Frontend (Vercel)
| Variable | Para que sirve |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL HTTPS del backend en Render. |

---

## Troubleshooting

- **502 Bad Gateway al primer request:** Render duerme servicios `starter` tras 15 min inactivos. El primer hit despierta y tarda ~30s. Solucion: subir a plan `standard` o pegarle ping cada 10 min.
- **CORS error en consola del navegador:** falta agregar `https://<tu-dominio-vercel>.vercel.app` a `CORS_ORIGIN` en Render.
- **WebSockets del chat no conectan:** verifica que el backend este corriendo con Daphne (no gunicorn). El `Procfile` ya lo hace.
- **"too many connections" en Postgres:** baja `CONN_MAX_AGE` a `60` o sube a Postgres standard.
