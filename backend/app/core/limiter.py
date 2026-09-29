"""Rate limiting via slowapi.

Cada endpoint puede decorarse con `@limiter.limit("5/minute")` o similar.
El key es la IP del cliente (respetando X-Forwarded-For detrás de Render).
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address, default_limits=["300/minute"])
