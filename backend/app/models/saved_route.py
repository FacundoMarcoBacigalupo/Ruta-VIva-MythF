from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class SavedRoute(Base):
    __tablename__ = "saved_routes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)

    origin_label: Mapped[str] = mapped_column(String(255), nullable=False)
    origin_lat: Mapped[float] = mapped_column(Float, nullable=False)
    origin_lon: Mapped[float] = mapped_column(Float, nullable=False)

    dest_label: Mapped[str] = mapped_column(String(255), nullable=False)
    dest_lat: Mapped[float] = mapped_column(Float, nullable=False)
    dest_lon: Mapped[float] = mapped_column(Float, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="saved_routes")
