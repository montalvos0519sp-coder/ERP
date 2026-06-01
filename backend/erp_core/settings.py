"""Settings centralizados del ERP-PROFESIONAL.

Multi-empresa, multi-modulo, configurable 100% desde el frontend.
Optimizado para concurrencia (>=30 usuarios) y deploy en Render + Vercel.
"""
from __future__ import annotations

import os
from datetime import timedelta
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.environ.get("SECRET_KEY", "dev-insecure-key-cambiar-en-prod")
DEBUG = os.environ.get("DEBUG", "True").lower() == "true"
ALLOWED_HOSTS = [h.strip() for h in os.environ.get("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",") if h.strip()]

# Render expone el hostname publico aqui — lo agregamos automaticamente.
RENDER_EXTERNAL_HOSTNAME = os.environ.get("RENDER_EXTERNAL_HOSTNAME")
if RENDER_EXTERNAL_HOSTNAME and RENDER_EXTERNAL_HOSTNAME not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)

INSTALLED_APPS = [
    # Daphne debe ir ANTES de admin para que `runserver` use el ASGI
    # de Channels y soporte WebSockets en dev sin daphne aparte.
    "daphne",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Terceros
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "django_filters",
    "channels",
    "storages",
    # Apps propias
    "apps.core",
    "apps.modulos",
    "apps.catalogos_sat",
    "apps.facturacion",
    "apps.carta_porte",
    "apps.viajes",
    "apps.flota",
    "apps.rh",
    "apps.almacen",
    "apps.cxp",
    "apps.ordenes_compra",
    "apps.mantenimiento",
    "apps.liquidaciones",
    "apps.bitacora",
    "apps.nomina",
    "apps.chat",
    "apps.diagramas",
    "apps.gestion_documental",
    "apps.sgc",
]

MIDDLEWARE = [
    # GZip comprime las respuestas JSON >200B — reduce ~70% el ancho de banda
    # en listados grandes (clientes, facturas, recibos de nomina).
    "django.middleware.gzip.GZipMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    # ConditionalGetMiddleware permite que el navegador reuse respuestas con
    # ETag/Last-Modified — ahorra trabajo al backend en navegaciones repetidas.
    "django.middleware.http.ConditionalGetMiddleware",
    # Middleware propio: registro de bitacora + filtro por modulo asignado
    "apps.modulos.middleware.ModuloAccessMiddleware",
    "apps.bitacora.middleware.BitacoraMiddleware",
]

ROOT_URLCONF = "erp_core.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "erp_core.wsgi.application"
ASGI_APPLICATION = "erp_core.asgi.application"

# ── Channels (WebSockets) ──────────────────────────────────────────────────
# Si REDIS_URL está definido, se usa el backend distribuido. En dev/local sin
# Redis cae al InMemoryChannelLayer (un único proceso, no escala horizontal,
# pero permite WebSockets en `python manage.py runserver`).
REDIS_URL = os.environ.get("REDIS_URL", "").strip()
if REDIS_URL:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {"hosts": [REDIS_URL]},
        },
    }
else:
    CHANNEL_LAYERS = {
        "default": {"BACKEND": "channels.layers.InMemoryChannelLayer"},
    }

# ── Cache framework ────────────────────────────────────────────────────────
# Usamos Redis cuando esta disponible (compartido entre workers de Gunicorn).
# Si no hay Redis, LocMemCache funciona dentro de un solo proceso. Esto se
# usa para cachear catalogos SAT (>20k filas), permisos por usuario, etc.
if REDIS_URL:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": REDIS_URL,
            "TIMEOUT": 300,
            "OPTIONS": {"db": 1},
        }
    }
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "erp-default",
            "TIMEOUT": 300,
        }
    }

# Sesiones en cache (signed_cookies como fallback) — evita un round-trip a la BD
# en cada request autenticada por sesion (admin de Django, principalmente; los
# usuarios del frontend usan JWT y no tocan la tabla django_session).
SESSION_ENGINE = "django.contrib.sessions.backends.signed_cookies"

# ── Base de datos ──────────────────────────────────────────────────────────
# En Render: DATABASE_URL = postgres://...   (Render lo inyecta automaticamente).
# En local:  cae a SQLite para desarrollo rapido.
#
# conn_max_age=600 + conn_health_checks=True mantienen las conexiones vivas
# 10 minutos y validan que sigan abiertas antes de cada request. Esto evita
# el overhead de abrir un socket nuevo a Postgres en cada request (que es
# brutal cuando hay 30 usuarios concurrentes).
DATABASES = {
    "default": dj_database_url.config(
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
        conn_max_age=600,
        conn_health_checks=True,
    ),
}

# Si Postgres, ajustes especificos para concurrencia y latencia.
if DATABASES["default"]["ENGINE"].endswith("postgresql"):
    DATABASES["default"].setdefault("OPTIONS", {})
    DATABASES["default"]["OPTIONS"].update({
        # Pool del lado cliente — psycopg3 maneja el pool automaticamente.
        "connect_timeout": 10,
        # keepalives evitan que NAT/firewalls cierren la conexion ociosa.
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5,
    })

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "es-mx"
TIME_ZONE = "America/Mexico_City"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
# STATICFILES_STORAGE queda definido via STORAGES["staticfiles"] más abajo
# (Django 4.2+ prefiere la nueva clave). La línea anterior queda obsoleta.

MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

# ── Storage (django-storages) ──────────────────────────────────────────────
# Por defecto se usa FileSystemStorage en MEDIA_ROOT. Si AWS_STORAGE_BUCKET_NAME
# está definido en el entorno, se cambia a S3/MinIO automáticamente. El código
# de upload (Message.adjunto.upload_to) no necesita cambios — todo se hace via
# `default_storage`.
AWS_STORAGE_BUCKET_NAME = os.environ.get("AWS_STORAGE_BUCKET_NAME", "").strip()
if AWS_STORAGE_BUCKET_NAME:
    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3.S3Storage",
            "OPTIONS": {
                "bucket_name": AWS_STORAGE_BUCKET_NAME,
                "endpoint_url": os.environ.get("AWS_S3_ENDPOINT_URL") or None,  # MinIO
                "region_name": os.environ.get("AWS_S3_REGION_NAME", "us-east-1"),
                "access_key": os.environ.get("AWS_ACCESS_KEY_ID", ""),
                "secret_key": os.environ.get("AWS_SECRET_ACCESS_KEY", ""),
                "addressing_style": os.environ.get("AWS_S3_ADDRESSING_STYLE", "path"),
                "querystring_auth": True,
                "querystring_expire": 60 * 60,  # 1h
                "default_acl": None,
            },
        },
        "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
    }
else:
    STORAGES = {
        "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
        "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
    }

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Limites de upload — formularios con muchos campos (nomina, viajes con muchas
# paradas/mercancias) pueden exceder el default de 1000.
DATA_UPLOAD_MAX_NUMBER_FIELDS = 10_000
DATA_UPLOAD_MAX_MEMORY_SIZE = 50 * 1024 * 1024  # 50 MB
FILE_UPLOAD_MAX_MEMORY_SIZE = 50 * 1024 * 1024

# ── DRF ─────────────────────────────────────────────────────────────────────
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,
    # En produccion, sin renderer browsable — ahorra CPU y previene XSS via JSON.
    "DEFAULT_RENDERER_CLASSES": (
        "rest_framework.renderers.JSONRenderer",
    ) if not DEBUG else (
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ),
    # Throttling para evitar que un usuario acapare la API.
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.UserRateThrottle",
        "rest_framework.throttling.AnonRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "user": "600/min",   # 10 req/s sostenido por usuario — suficiente para uso normal.
        "anon": "60/min",
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=8),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
}

# ── CORS / CSRF ─────────────────────────────────────────────────────────────
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
CORS_ALLOWED_ORIGINS = [
    o.strip() for o in os.environ.get("CORS_ORIGIN", FRONTEND_URL).split(",") if o.strip()
]
# Acepta cualquier maquina de la red local (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
# en el puerto 3000 del frontend. Permite que otras computadoras de la red entren
# al ERP sin reconfigurar cada IP nueva.
# Tambien aceptamos cualquier subdominio de vercel.app (previews) cuando el deploy
# usa Vercel.
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^http://192\.168\.\d{1,3}\.\d{1,3}:3000$",
    r"^http://10\.\d{1,3}\.\d{1,3}\.\d{1,3}:3000$",
    r"^http://172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}:3000$",
    r"^http://localhost:\d+$",
    r"^http://127\.0\.0\.1:\d+$",
    r"^https://.*\.vercel\.app$",
]
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = list(CORS_ALLOWED_ORIGINS) + [
    "http://192.168.15.37:3000",
    "http://192.168.15.37:8000",
]
# En produccion (Render + Vercel) agregamos automaticamente los dominios HTTPS.
for origin in CORS_ALLOWED_ORIGINS:
    if origin.startswith("https://") and origin not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append(origin)
if RENDER_EXTERNAL_HOSTNAME:
    CSRF_TRUSTED_ORIGINS.append(f"https://{RENDER_EXTERNAL_HOSTNAME}")

# ── Seguridad en produccion ────────────────────────────────────────────────
# Solo aplicamos estos headers cuando DEBUG=False (deploy real). En dev local
# romperian el flujo HTTP normal.
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = os.environ.get("SECURE_SSL_REDIRECT", "True").lower() == "true"
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_REFERRER_POLICY = "same-origin"
    X_FRAME_OPTIONS = "DENY"

# ── Logging minimo en produccion ───────────────────────────────────────────
# Log a stdout (Render lo captura). En dev se queda con el default de Django.
if not DEBUG:
    LOGGING = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "simple": {"format": "%(asctime)s %(levelname)s %(name)s: %(message)s"},
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "simple",
            },
        },
        "root": {"handlers": ["console"], "level": "INFO"},
        "loggers": {
            "django.db.backends": {"level": "WARNING"},  # silencia SQL en prod
            "django.request": {"level": "WARNING"},
        },
    }

# ── Path al folder con los catalogos SAT en Excel ──────────────────────────
CATALOGOS_SAT_DIR = BASE_DIR / "data_catalogos"

# Folder para certificados CSD por empresa (subidos desde el frontend).
CSD_STORAGE_DIR = MEDIA_ROOT / "csd"
CSD_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
