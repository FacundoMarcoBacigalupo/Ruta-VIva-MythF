from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Fleet(Base):
    __tablename__ = "fleets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    cuit: Mapped[str | None] = mapped_column(String(20), nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    members: Mapped[list["User"]] = relationship("User", back_populates="fleet")
    vehicles: Mapped[list["FleetVehicle"]] = relationship(
        "FleetVehicle", back_populates="fleet", cascade="all, delete-orphan"
    )


class FleetVehicle(Base):
    __tablename__ = "fleet_vehicles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    fleet_id: Mapped[int] = mapped_column(ForeignKey("fleets.id", ondelete="CASCADE"), nullable=False)
    plate: Mapped[str] = mapped_column(String(20), nullable=False)
    model: Mapped[str | None] = mapped_column(String(120), nullable=True)
    driver_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    fleet: Mapped["Fleet"] = relationship("Fleet", back_populates="vehicles")
