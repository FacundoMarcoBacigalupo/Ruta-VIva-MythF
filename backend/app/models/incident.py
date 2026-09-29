from datetime import datetime

from sqlalchemy import DateTime, Float, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Incident(Base):
    """Siniestro vial histórico proveniente de ANSV/SNIC."""

    __tablename__ = "incidents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source: Mapped[str] = mapped_column(String(40), nullable=False)  # ANSV, SNIC, etc.
    external_id: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)

    occurred_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    province: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    department: Mapped[str | None] = mapped_column(String(120), nullable=True)
    locality: Mapped[str | None] = mapped_column(String(120), nullable=True)

    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lon: Mapped[float] = mapped_column(Float, nullable=False)

    road_type: Mapped[str | None] = mapped_column(String(60), nullable=True)
    severity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)  # 1..5
    fatalities: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    injuries: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    vehicles_involved: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    weather: Mapped[str | None] = mapped_column(String(60), nullable=True)
    surface: Mapped[str | None] = mapped_column(String(60), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("ix_incidents_lat_lon", "lat", "lon"),
        Index("ix_incidents_occurred_province", "occurred_at", "province"),
    )
