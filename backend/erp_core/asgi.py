"""ASGI con Channels para soportar WebSockets del chat.

HTTP sigue manejado por Django (DRF). WS pasa por el ProtocolTypeRouter al
URLRouter de `apps.chat.routing`, autenticando vía JWT en `?token=…`.
"""
import os

import django
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "erp_core.settings")
django.setup()

# Importar DESPUÉS de django.setup() para que los modelos estén cargados.
from apps.chat.middleware import JWTAuthMiddleware  # noqa: E402
from apps.chat.routing import websocket_urlpatterns  # noqa: E402

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": JWTAuthMiddleware(URLRouter(websocket_urlpatterns)),
})
