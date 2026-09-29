from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_fleet_admin
from app.core.database import get_db
from app.models.fleet import Fleet, FleetVehicle
from app.models.incident import Incident
from app.models.user import User
from app.schemas.fleet import (
    FleetCreate,
    FleetOut,
    FleetStats,
    VehicleCreate,
    VehicleOut,
)

router = APIRouter(prefix="/fleet", tags=["fleet"])


@router.post("", response_model=FleetOut, status_code=201)
def create_fleet(
    payload: FleetCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    fleet = Fleet(name=payload.name, cuit=payload.cuit, contact_email=payload.contact_email)
    db.add(fleet)
    db.commit()
    db.refresh(fleet)
    user.fleet_id = fleet.id
    from app.models.user import UserRole

    user.role = UserRole.fleet_admin
    db.commit()
    return FleetOut.model_validate(fleet)


@router.get("/me", response_model=FleetOut)
def my_fleet(db: Session = Depends(get_db), user: User = Depends(require_fleet_admin)):
    if not user.fleet_id:
        raise HTTPException(status_code=404, detail="No tenés flota asignada")
    fleet = db.get(Fleet, user.fleet_id)
    return FleetOut.model_validate(fleet)


@router.post("/vehicles", response_model=VehicleOut, status_code=201)
def add_vehicle(
    payload: VehicleCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_fleet_admin),
):
    if not user.fleet_id:
        raise HTTPException(status_code=400, detail="Creá una flota primero")
    v = FleetVehicle(
        fleet_id=user.fleet_id,
        plate=payload.plate.upper(),
        model=payload.model,
        driver_name=payload.driver_name,
    )
    db.add(v)
    db.commit()
    db.refresh(v)
    return VehicleOut.model_validate(v)


@router.get("/vehicles", response_model=list[VehicleOut])
def list_vehicles(db: Session = Depends(get_db), user: User = Depends(require_fleet_admin)):
    if not user.fleet_id:
        return []
    q = db.query(FleetVehicle).filter(FleetVehicle.fleet_id == user.fleet_id).all()
    return [VehicleOut.model_validate(v) for v in q]


@router.get("/stats", response_model=FleetStats)
def fleet_stats(db: Session = Depends(get_db), user: User = Depends(require_fleet_admin)):
    total_vehicles = 0
    if user.fleet_id:
        total_vehicles = (
            db.query(FleetVehicle).filter(FleetVehicle.fleet_id == user.fleet_id).count()
        )
    # Placeholder: en producción se calcula con routes_analyzed de tabla de viajes
    since = datetime.utcnow() - timedelta(days=30)
    incidents_recent = db.query(Incident).filter(Incident.occurred_at >= since).count()
    return FleetStats(
        total_vehicles=total_vehicles,
        routes_analyzed_30d=0,
        avg_risk_30d=0.0,
        high_risk_trips_30d=0,
        incidents_near_routes=incidents_recent,
    )
