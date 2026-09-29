"""Tareas de inicialización que corren en el lifespan de la app."""
import logging

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)


def ensure_admin_user() -> None:
    """Crea el user MythF/admin la primera vez que arranca el backend.

    Si ya existe un user con ese email, se asegura de que tenga rol admin
    (idempotente). Si existe cualquier otro admin, no hace nada.
    """
    db = SessionLocal()
    try:
        existing_admin = db.query(User).filter(User.role == UserRole.admin).first()
        if existing_admin:
            logger.info("Admin ya existe: %s (id=%s)", existing_admin.email, existing_admin.id)
            return

        email = settings.ADMIN_EMAIL.lower()
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            existing.role = UserRole.admin
            existing.is_active = True
            db.commit()
            logger.info("User %s promovido a admin", email)
            return

        user = User(
            email=email,
            full_name=settings.ADMIN_FULL_NAME,
            hashed_password=hash_password(settings.ADMIN_PASSWORD),
            role=UserRole.admin,
            is_active=True,
        )
        db.add(user)
        db.commit()
        logger.info("Admin creado: %s", email)
    except Exception as e:
        logger.exception("No se pudo crear admin: %s", e)
        db.rollback()
    finally:
        db.close()
