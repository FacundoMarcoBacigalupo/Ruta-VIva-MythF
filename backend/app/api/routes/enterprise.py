from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.limiter import limiter
from app.models.contact_request import ContactRequest
from app.schemas.contact import ContactCreate, ContactOut

router = APIRouter(prefix="/enterprise", tags=["enterprise"])


@router.post("/contact", response_model=ContactOut, status_code=201)
@limiter.limit("5/hour")
def create_contact(
    request: Request,
    payload: ContactCreate,
    db: Session = Depends(get_db),
):
    contact = ContactRequest(
        kind=payload.kind,
        full_name=payload.full_name.strip(),
        email=payload.email.lower(),
        phone=payload.phone,
        company=payload.company,
        role=payload.role,
        fleet_size=payload.fleet_size,
        message=payload.message.strip(),
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent", "")[:500] or None,
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return ContactOut.model_validate(contact)
