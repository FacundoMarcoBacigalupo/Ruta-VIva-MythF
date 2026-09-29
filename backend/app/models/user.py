import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime
from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class UserRole(str, enum.Enum):
    consumer = "consumer"
    fleet_admin = "fleet_admin"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[UserRole] = mapped_column(
        SAEnum(UserRole, name="user_role"), default=UserRole.consumer, nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    fleet_id: Mapped[int | None] = mapped_column(
        ForeignKey("fleets.id", ondelete="SET NULL"), nullable=True
    )
    fleet: Mapped["Fleet | None"] = relationship("Fleet", back_populates="members")
    reports: Mapped[list["CitizenReport"]] = relationship(
        "CitizenReport", back_populates="user", cascade="all, delete-orphan"
    )
    saved_routes: Mapped[list["SavedRoute"]] = relationship(
        "SavedRoute", back_populates="user", cascade="all, delete-orphan"
    )
