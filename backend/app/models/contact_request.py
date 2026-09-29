import enum
from datetime import datetime

from sqlalchemy import DateTime
from sqlalchemy import Enum as SAEnum
from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ContactKind(str, enum.Enum):
    enterprise = "enterprise"
    press = "press"
    general = "general"


class ContactStatus(str, enum.Enum):
    new = "new"
    contacted = "contacted"
    in_talks = "in_talks"
    won = "won"
    lost = "lost"
    archived = "archived"


class ContactRequest(Base):
    """Lead B2B o pedido de prensa dejado desde el sitio."""

    __tablename__ = "contact_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    kind: Mapped[ContactKind] = mapped_column(
        SAEnum(ContactKind, name="contact_kind"), default=ContactKind.enterprise, nullable=False
    )
    status: Mapped[ContactStatus] = mapped_column(
        SAEnum(ContactStatus, name="contact_status"), default=ContactStatus.new, nullable=False
    )
    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    company: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[str | None] = mapped_column(String(120), nullable=True)
    fleet_size: Mapped[str | None] = mapped_column(String(60), nullable=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
