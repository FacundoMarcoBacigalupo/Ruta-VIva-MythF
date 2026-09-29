from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.models.contact_request import ContactKind


class ContactCreate(BaseModel):
    kind: ContactKind = ContactKind.enterprise
    full_name: str = Field(min_length=2, max_length=255)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=40)
    company: str | None = Field(default=None, max_length=255)
    role: str | None = Field(default=None, max_length=120)
    fleet_size: str | None = Field(default=None, max_length=60)
    message: str = Field(min_length=5, max_length=5000)


class ContactOut(BaseModel):
    id: int
    kind: ContactKind
    full_name: str
    email: str
    created_at: datetime

    class Config:
        from_attributes = True
