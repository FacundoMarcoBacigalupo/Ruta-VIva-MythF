import re
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.contact_request import ContactStatus
from app.models.user import UserRole


class AdminStats(BaseModel):
    total_users: int
    active_users: int
    total_fleets: int
    total_reports: int
    reports_last_24h: int
    total_incidents: int
    total_contact_requests: int
    contact_requests_last_7d: int


class AdminUserRow(BaseModel):
    id: int
    email: str
    full_name: str | None
    role: str
    is_active: bool
    fleet_id: int | None
    created_at: datetime

    class Config:
        from_attributes = True


class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)
    role: UserRole = UserRole.consumer

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("La contraseña debe tener al menos una mayúscula")
        if not re.search(r"[a-z]", v):
            raise ValueError("La contraseña debe tener al menos una minúscula")
        if not re.search(r"\d", v):
            raise ValueError("La contraseña debe tener al menos un número")
        return v


class AdminUserUpdate(BaseModel):
    email: EmailStr | None = None
    full_name: str | None = Field(default=None, max_length=255)
    role: UserRole | None = None


class AdminContactRow(BaseModel):
    id: int
    kind: str
    status: str
    full_name: str
    email: str
    phone: str | None
    company: str | None
    role: str | None
    fleet_size: str | None
    message: str
    admin_notes: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class AdminContactUpdate(BaseModel):
    status: ContactStatus | None = None
    admin_notes: str | None = Field(default=None, max_length=5000)


class AdminFleetRow(BaseModel):
    id: int
    name: str
    cuit: str | None
    contact_email: str | None
    vehicles: int
    members: int
    created_at: datetime


class SignupPoint(BaseModel):
    day: str
    count: int


class RoleCount(BaseModel):
    role: str
    count: int


class ReportZone(BaseModel):
    lat: float
    lon: float
    count: int
    top_type: str | None = None


class AnalyticsBundle(BaseModel):
    signup_timeline: list[SignupPoint]
    report_timeline: list[SignupPoint]
    role_breakdown: list[RoleCount]
    top_report_zones: list[ReportZone]
    total_push_subscriptions: int
    total_saved_routes: int
