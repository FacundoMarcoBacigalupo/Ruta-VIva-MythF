from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.saved_route import SavedRoute
from app.models.user import User
from app.schemas.route import SavedRouteCreate, SavedRouteOut

router = APIRouter(prefix="/saved-routes", tags=["saved-routes"])


@router.post("", response_model=SavedRouteOut, status_code=201)
def create(
    payload: SavedRouteCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    r = SavedRoute(
        user_id=user.id,
        name=payload.name,
        origin_label=payload.origin_label,
        origin_lat=payload.origin_lat,
        origin_lon=payload.origin_lon,
        dest_label=payload.dest_label,
        dest_lat=payload.dest_lat,
        dest_lon=payload.dest_lon,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return SavedRouteOut.model_validate(r)


@router.get("", response_model=list[SavedRouteOut])
def list_saved(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    q = db.query(SavedRoute).filter(SavedRoute.user_id == user.id).all()
    return [SavedRouteOut.model_validate(r) for r in q]


@router.delete("/{route_id}", status_code=204)
def delete(route_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = db.get(SavedRoute, route_id)
    if not r or r.user_id != user.id:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")
    db.delete(r)
    db.commit()
    return None
