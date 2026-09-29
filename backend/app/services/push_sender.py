"""Envío de notificaciones Web Push usando pywebpush + VAPID."""
import json
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


def is_configured() -> bool:
    return bool(settings.VAPID_PUBLIC_KEY and settings.VAPID_PRIVATE_KEY)


def send_push(
    endpoint: str,
    p256dh: str,
    auth: str,
    title: str,
    body: str,
    url: str | None = None,
    tag: str | None = None,
) -> bool:
    """Envía una push. Devuelve True si salió OK, False si la subscripción es inválida
    (el caller puede borrar subscripciones con endpoint 410/404)."""
    if not is_configured():
        logger.warning("VAPID no configurado — push no enviada.")
        return False

    try:
        from pywebpush import WebPushException, webpush

        payload = {"title": title, "body": body}
        if url:
            payload["url"] = url
        if tag:
            payload["tag"] = tag

        webpush(
            subscription_info={
                "endpoint": endpoint,
                "keys": {"p256dh": p256dh, "auth": auth},
            },
            data=json.dumps(payload),
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={"sub": settings.VAPID_SUBJECT},
        )
        return True
    except WebPushException as e:
        status = getattr(e.response, "status_code", None)
        logger.warning("WebPush falló (status=%s): %s", status, e)
        if status in (404, 410):
            # Subscripción cancelada en el browser → caller debe borrarla.
            raise InvalidSubscriptionError(endpoint) from e
        return False
    except Exception as e:
        logger.exception("Error inesperado enviando push: %s", e)
        return False


class InvalidSubscriptionError(Exception):
    """Push falló con 404/410: el endpoint ya no es válido, hay que borrarlo."""

    def __init__(self, endpoint: str):
        super().__init__(endpoint)
        self.endpoint = endpoint
