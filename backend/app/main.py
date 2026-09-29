import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.routes import (
    admin,
    auth,
    enterprise,
    fleet,
    geo,
    incidents,
    predict,
    push,
    reports,
    saved_routes,
)
from app.core.bootstrap import ensure_admin_user
from app.core.config import settings
from app.core.database import Base, engine
from app.core.limiter import limiter
from app.scheduler.jobs import start_scheduler, stop_scheduler


class MaxBodySizeMiddleware(BaseHTTPMiddleware):
    """Rechaza bodies mayores a 1 MB para evitar DoS por payload gigante."""

    MAX_BYTES = 1_048_576  # 1 MB

    async def dispatch(self, request: Request, call_next):
        cl = request.headers.get("content-length")
        if cl is not None:
            try:
                if int(cl) > self.MAX_BYTES:
                    return JSONResponse(
                        status_code=413, content={"detail": "Payload demasiado grande"}
                    )
            except ValueError:
                pass
        return await call_next(request)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s - %(message)s")
# httpx logea cada request a INFO por defecto — con autocomplete en el frontend
# esto inunda la consola. Lo mandamos a WARNING para ver solo errores reales.
logging.getLogger("httpx").setLevel(logging.WARNING)
logger = logging.getLogger("rutaviva")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("--- Iniciando arranque del backend (asíncrono) ---")
    
    # IMPORTANTE: No bloqueamos el arranque principal con la DB.
    # Si Hostinger está lento o el firewall bloquea, la app debe abrir el puerto igual.
    def init_db():
        try:
            logger.info("Verificando base de datos en segundo plano...")
            Base.metadata.create_all(bind=engine)
            ensure_admin_user()
            logger.info("OK: Base de datos e inicialización listas.")
        except Exception as e:
            logger.error("ADVERTENCIA: La DB no respondió a tiempo: %s", e)
            logger.info("El backend seguirá funcionando, pero fallarán las peticiones a la DB.")

    import threading
    threading.Thread(target=init_db, daemon=True).start()

    if settings.ENVIRONMENT != "test":
        try:
            start_scheduler()
            logger.info("OK: Scheduler iniciado.")
        except Exception as e:
            logger.warning("Scheduler no iniciado: %s", e)

    logger.info("--- Backend escuchando puerto (puerto listo) ---")
    yield
    try:
        stop_scheduler()
    except Exception:
        pass


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API predictiva de riesgo vial en Argentina — RutaVivaMythF",
    version="0.1.0",
    lifespan=lifespan,
    # En producción ocultamos /docs y /redoc para no exponer estructura interna
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Body size limit (evita DoS por payload gigante)
app.add_middleware(MaxBodySizeMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer-when-downgrade"
    response.headers["Permissions-Policy"] = "geolocation=(self), camera=(), microphone=()"
    return response


@app.get("/", tags=["meta"])
def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": "0.1.0",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok", "environment": settings.ENVIRONMENT}


prefix = settings.API_V1_PREFIX
app.include_router(auth.router, prefix=prefix)
app.include_router(incidents.router, prefix=prefix)
app.include_router(predict.router, prefix=prefix)
app.include_router(reports.router, prefix=prefix)
app.include_router(geo.router, prefix=prefix)
app.include_router(fleet.router, prefix=prefix)
app.include_router(saved_routes.router, prefix=prefix)
app.include_router(enterprise.router, prefix=prefix)
app.include_router(admin.router, prefix=prefix)
app.include_router(push.router, prefix=prefix)
