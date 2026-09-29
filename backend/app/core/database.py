from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

_is_sqlite = settings.DATABASE_URL.startswith("sqlite")

# SQLite (dev local sin servicios externos): necesita check_same_thread=False
# porque FastAPI + APScheduler comparten conexiones entre threads.
# MySQL/Postgres: pool_pre_ping + pool_recycle para sobrevivir desconexiones.
engine = create_engine(
    settings.DATABASE_URL,
    future=True,
    **(
        {"connect_args": {"check_same_thread": False}}
        if _is_sqlite
        else {
            "pool_pre_ping": True, 
            "pool_recycle": 3600,
            "connect_args": {"connect_timeout": 10}  # Evita bloqueos infinitos al arrancar
        }
    ),
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
