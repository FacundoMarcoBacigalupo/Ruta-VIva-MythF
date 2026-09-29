"""APScheduler para refrescar datasets y enviar push notifications."""
import logging
from datetime import datetime, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from app.core.database import SessionLocal
from app.ml import risk_engine
from app.models.push_subscription import PushSubscription
from app.models.saved_route import SavedRoute
from app.services.push_sender import InvalidSubscriptionError, is_configured, send_push
from app.services.real_ingest import run as run_real_ingest
from app.services.weather import get_weather

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler(timezone="America/Argentina/Buenos_Aires")

# No spamear: mínimo 4 h entre pushes por subscription.
PUSH_COOLDOWN = timedelta(hours=4)
HIGH_RISK_THRESHOLD = 55


async def refresh_ansv_job():
    """Cada 24 h (3:00 AR time) — descarga datasets reales de siniestros desde
    datos.gob.ar + BA Ciudad, parsea CSVs y hace upsert en incidents. Idempotente
    por (source, external_id)."""
    try:
        stats = await run_real_ingest(dry_run=False)
        logger.info("Ingesta real completa: %s", stats)
    except Exception as e:
        logger.exception("Error en ingesta real: %s", e)


async def push_high_risk_alerts():
    """Cada 30 min: para cada PushSubscription atada a una saved_route, calcula el
    riesgo actual; si supera el umbral 'alto' y pasó el cooldown, envía push."""
    if not is_configured():
        return
    db = SessionLocal()
    try:
        subs = (
            db.query(PushSubscription)
            .filter(PushSubscription.saved_route_id.is_not(None))
            .all()
        )
        if not subs:
            return

        sent = 0
        for sub in subs:
            if sub.last_notified_at and datetime.utcnow() - sub.last_notified_at < PUSH_COOLDOWN:
                continue
            route = db.get(SavedRoute, sub.saved_route_id)
            if not route:
                continue
            # Usar el punto medio de la ruta como proxy
            mid_lat = (route.origin_lat + route.dest_lat) / 2
            mid_lon = (route.origin_lon + route.dest_lon) / 2
            try:
                weather = await get_weather(mid_lat, mid_lon)
                mult = weather.get("risk_multiplier", 1.0) if weather else 1.0
            except Exception:
                mult = 1.0
            score = risk_engine.score_point(db, mid_lat, mid_lon, weather_multiplier=mult)
            if score["risk_score"] < HIGH_RISK_THRESHOLD:
                continue
            title = f"⚠️ Riesgo {score['risk_label']} en tu ruta"
            body = f"{route.name}: score {score['risk_score']}/100. Revisá antes de salir."
            try:
                ok = send_push(
                    sub.endpoint,
                    sub.p256dh,
                    sub.auth,
                    title=title,
                    body=body,
                    url=f"/ruta?saved={route.id}",
                    tag=f"route-{route.id}",
                )
                if ok:
                    sub.last_notified_at = datetime.utcnow()
                    db.commit()
                    sent += 1
            except InvalidSubscriptionError:
                db.delete(sub)
                db.commit()
        if sent:
            logger.info("Push enviadas: %s", sent)
    except Exception as e:
        logger.exception("Error en push_high_risk_alerts: %s", e)
    finally:
        db.close()


def start_scheduler():
    scheduler.add_job(
        refresh_ansv_job,
        CronTrigger(hour=3, minute=0),
        id="refresh_ansv",
        replace_existing=True,
    )
    scheduler.add_job(
        push_high_risk_alerts,
        IntervalTrigger(minutes=30),
        id="push_high_risk_alerts",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler iniciado")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
