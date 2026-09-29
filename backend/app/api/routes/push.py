from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models.push_subscription import PushSubscription
from app.models.saved_route import SavedRoute
from app.models.user import User
from app.schemas.push import SubscribePayload, UnsubscribePayload, VapidPublicKeyResponse

router = APIRouter(prefix="/push", tags=["push"])


@router.get("/vapid-public-key", response_model=VapidPublicKeyResponse)
def vapid_public_key():
    return VapidPublicKeyResponse(public_key=settings.VAPID_PUBLIC_KEY or "")


@router.post("/subscribe", status_code=201)
def subscribe(
    payload: SubscribePayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if payload.saved_route_id is not None:
        route = db.get(SavedRoute, payload.saved_route_id)
        if not route or route.user_id != user.id:
            raise HTTPException(status_code=404, detail="Ruta guardada no encontrada")

    existing = (
        db.query(PushSubscription)
        .filter(
            PushSubscription.user_id == user.id,
            PushSubscription.endpoint == payload.endpoint,
        )
        .first()
    )
    if existing:
        existing.p256dh = payload.p256dh
        existing.auth = payload.auth
        existing.saved_route_id = payload.saved_route_id
        db.commit()
        return {"ok": True, "id": existing.id, "updated": True}

    sub = PushSubscription(
        user_id=user.id,
        saved_route_id=payload.saved_route_id,
        endpoint=payload.endpoint,
        p256dh=payload.p256dh,
        auth=payload.auth,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return {"ok": True, "id": sub.id, "updated": False}


@router.delete("/subscribe", status_code=204)
def unsubscribe(
    payload: UnsubscribePayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    db.query(PushSubscription).filter(
        PushSubscription.user_id == user.id,
        PushSubscription.endpoint == payload.endpoint,
    ).delete()
    db.commit()
    return None
