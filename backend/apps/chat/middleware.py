"""Middleware ASGI que autentica al usuario en el handshake del WebSocket.

Lee `?token=<access_jwt>` del query string, lo valida con SimpleJWT y deja
`scope["user"]` listo para el consumer. Si el token es inválido, deja
AnonymousUser — el consumer cerrará la conexión.
"""
from __future__ import annotations

from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser


@database_sync_to_async
def _get_user(validated_token):
    from django.contrib.auth import get_user_model
    User = get_user_model()
    try:
        user_id = validated_token["user_id"]
        return User.objects.get(pk=user_id, is_active=True)
    except Exception:
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        from rest_framework_simplejwt.tokens import AccessToken
        from rest_framework_simplejwt.exceptions import TokenError, InvalidToken

        query = parse_qs((scope.get("query_string") or b"").decode())
        token = (query.get("token") or [None])[0]
        scope["user"] = AnonymousUser()
        if token:
            try:
                validated = AccessToken(token)
                scope["user"] = await _get_user(validated)
            except (TokenError, InvalidToken, KeyError):
                pass
        return await super().__call__(scope, receive, send)
