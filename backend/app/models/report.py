import enum
from datetime import datetime

from sqlalchemy import DateTime
from sqlalchemy import Enum as SAEnum
from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ReportType(str, enum.Enum):
    accidente = "accidente"
    bache = "bache"
    sin_senalizacion = "sin_senalizacion"
    obra = "obra"
    inundacion = "inundacion"
    niebla = "niebla"
    animales = "animales"
    otro = "otro"


class CitizenReport(Base):
    """Reporte ciudadano en vivo (crowd-sourced)."""

    __tablename__ = "citizen_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    report_type: Mapped[ReportType] = mapped_column(SAEnum(ReportType, name="report_type"), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lon: Mapped[float] = mapped_column(Float, nullable=False)
    severity: Mapped[int] = mapped_column(Integer, default=2, nullable=False)
    verified: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # upvotes
    reported_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user: Mapped["User | None"] = relationship("User", back_populates="reports")
