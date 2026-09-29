from collections import Counter
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import Date, cast, func
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.database import get_db
from app.core.security import hash_password
from app.models.contact_request import ContactKind, ContactRequest, ContactStatus
from app.models.fleet import Fleet, FleetVehicle
from app.models.incident import Incident
from app.models.push_subscription import PushSubscription
from app.models.report import CitizenReport
from app.models.saved_route import SavedRoute
from app.models.user import User, UserRole
from app.schemas.admin import (
    AdminContactRow,
    AdminContactUpdate,
    AdminFleetRow,
    AdminStats,
    AdminUserCreate,
    AdminUserRow,
    AdminUserUpdate,
    AnalyticsBundle,
    ReportZone,
    RoleCount,
    SignupPoint,
)
from app.schemas.report import CitizenReportOut

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


# =========================================================================
# Stats / overview
# =========================================================================
@router.get("/stats", response_model=AdminStats)
def stats(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    day_ago = now - timedelta(hours=24)
    week_ago = now - timedelta(days=7)
    return AdminStats(
        total_users=db.query(User).count(),
        active_users=db.query(User).filter(User.is_active.is_(True)).count(),
        total_fleets=db.query(Fleet).count(),
        total_reports=db.query(CitizenReport).count(),
        reports_last_24h=db.query(CitizenReport).filter(CitizenReport.reported_at >= day_ago).count(),
        total_incidents=db.query(Incident).count(),
        total_contact_requests=db.query(ContactRequest).count(),
        contact_requests_last_7d=db.query(ContactRequest)
        .filter(ContactRequest.created_at >= week_ago)
        .count(),
    )


# =========================================================================
# Users
# =========================================================================
@router.get("/users", response_model=list[AdminUserRow])
def list_users(
    q: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    query = db.query(User).order_by(User.created_at.desc())
    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter((User.email.like(pattern)) | (User.full_name.like(pattern)))
    return [AdminUserRow.model_validate(u) for u in query.limit(limit).all()]


@router.post("/users", response_model=AdminUserRow, status_code=201)
def create_user(payload: AdminUserCreate, db: Session = Depends(get_db)):
    email = payload.email.lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="Email ya registrado")
    u = User(
        email=email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role,
        is_active=True,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return AdminUserRow.model_validate(u)


@router.patch("/users/{user_id}", response_model=AdminUserRow)
def update_user(
    user_id: int,
    payload: AdminUserUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(require_admin),
):
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User no encontrado")

    if payload.email is not None:
        new_email = payload.email.lower()
        if new_email != u.email and db.query(User).filter(User.email == new_email).first():
            raise HTTPException(status_code=409, detail="Email ya usado por otro user")
        u.email = new_email
    if payload.full_name is not None:
        u.full_name = payload.full_name
    if payload.role is not None:
        if user_id == current.id and payload.role != UserRole.admin:
            raise HTTPException(status_code=400, detail="No podés quitarte tu propio rol admin")
        u.role = payload.role
    db.commit()
    db.refresh(u)
    return AdminUserRow.model_validate(u)


@router.patch("/users/{user_id}/toggle-active", response_model=AdminUserRow)
def toggle_active(
    user_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(require_admin),
):
    if user_id == current.id:
        raise HTTPException(status_code=400, detail="No podés desactivarte a vos mismo")
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User no encontrado")
    u.is_active = not u.is_active
    db.commit()
    db.refresh(u)
    return AdminUserRow.model_validate(u)


@router.delete("/users/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(require_admin),
):
    if user_id == current.id:
        raise HTTPException(status_code=400, detail="No podés borrarte a vos mismo")
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User no encontrado")
    if u.role == UserRole.admin:
        raise HTTPException(status_code=400, detail="No se puede borrar otro admin desde la UI")
    db.delete(u)
    db.commit()
    return None


# =========================================================================
# Contact requests (leads B2B + prensa)
# =========================================================================
@router.get("/contact-requests", response_model=list[AdminContactRow])
def list_contact_requests(
    status_filter: ContactStatus | None = Query(default=None, alias="status"),
    kind_filter: ContactKind | None = Query(default=None, alias="kind"),
    limit: int = Query(default=200, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    query = db.query(ContactRequest).order_by(ContactRequest.created_at.desc())
    if status_filter:
        query = query.filter(ContactRequest.status == status_filter)
    if kind_filter:
        query = query.filter(ContactRequest.kind == kind_filter)
    return [AdminContactRow.model_validate(c) for c in query.limit(limit).all()]


@router.patch("/contact-requests/{cid}", response_model=AdminContactRow)
def update_contact_request(cid: int, payload: AdminContactUpdate, db: Session = Depends(get_db)):
    c = db.get(ContactRequest, cid)
    if not c:
        raise HTTPException(status_code=404, detail="Lead no encontrado")
    if payload.status is not None:
        c.status = payload.status
    if payload.admin_notes is not None:
        c.admin_notes = payload.admin_notes
    db.commit()
    db.refresh(c)
    return AdminContactRow.model_validate(c)


@router.delete("/contact-requests/{cid}", status_code=204)
def delete_contact_request(cid: int, db: Session = Depends(get_db)):
    c = db.get(ContactRequest, cid)
    if not c:
        raise HTTPException(status_code=404, detail="Lead no encontrado")
    db.delete(c)
    db.commit()
    return None


# =========================================================================
# Reports (moderación)
# =========================================================================
@router.get("/reports", response_model=list[CitizenReportOut])
def list_all_reports(
    limit: int = Query(default=200, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    q = (
        db.query(CitizenReport)
        .order_by(CitizenReport.reported_at.desc())
        .limit(limit)
    )
    return [CitizenReportOut.model_validate(r) for r in q.all()]


@router.delete("/reports/{report_id}", status_code=204)
def delete_report(report_id: int, db: Session = Depends(get_db)):
    r = db.get(CitizenReport, report_id)
    if not r:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    db.delete(r)
    db.commit()
    return None


# =========================================================================
# Fleets
# =========================================================================
@router.get("/fleets", response_model=list[AdminFleetRow])
def list_fleets(db: Session = Depends(get_db)):
    out = []
    for f in db.query(Fleet).order_by(Fleet.created_at.desc()).all():
        vehicles = db.query(FleetVehicle).filter(FleetVehicle.fleet_id == f.id).count()
        members = db.query(User).filter(User.fleet_id == f.id).count()
        out.append(
            AdminFleetRow(
                id=f.id,
                name=f.name,
                cuit=f.cuit,
                contact_email=f.contact_email,
                vehicles=vehicles,
                members=members,
                created_at=f.created_at,
            )
        )
    return out


# =========================================================================
# Analytics
# =========================================================================
def _timeline(db: Session, column, model, days: int = 30) -> list[SignupPoint]:
    cutoff = datetime.utcnow() - timedelta(days=days)
    rows = (
        db.query(cast(column, Date).label("day"), func.count().label("c"))
        .filter(column >= cutoff)
        .group_by("day")
        .all()
    )
    by_day = {str(r.day): int(r.c) for r in rows}
    start = date.today() - timedelta(days=days - 1)
    out = []
    for i in range(days):
        d = start + timedelta(days=i)
        out.append(SignupPoint(day=d.isoformat(), count=by_day.get(d.isoformat(), 0)))
    return out


def _top_report_zones(db: Session, limit: int = 15) -> list[ReportZone]:
    # Cluster a grilla de ~5 km redondeando a 2 decimales (~1.1 km × 1.1 km en CABA).
    rows = (
        db.query(
            func.round(CitizenReport.lat, 2).label("lat"),
            func.round(CitizenReport.lon, 2).label("lon"),
            func.count(CitizenReport.id).label("c"),
        )
        .group_by("lat", "lon")
        .order_by(func.count(CitizenReport.id).desc())
        .limit(limit)
        .all()
    )
    out: list[ReportZone] = []
    for r in rows:
        lat = float(r.lat)
        lon = float(r.lon)
        # tipo predominante en ese cluster
        types = (
            db.query(CitizenReport.report_type)
            .filter(
                func.round(CitizenReport.lat, 2) == r.lat,
                func.round(CitizenReport.lon, 2) == r.lon,
            )
            .limit(500)
            .all()
        )
        top_type = None
        if types:
            counter = Counter([t[0].value if hasattr(t[0], "value") else str(t[0]) for t in types])
            top_type = counter.most_common(1)[0][0]
        out.append(ReportZone(lat=lat, lon=lon, count=int(r.c), top_type=top_type))
    return out


@router.get("/analytics", response_model=AnalyticsBundle)
def analytics(db: Session = Depends(get_db)):
    role_rows = db.query(User.role, func.count(User.id)).group_by(User.role).all()
    role_breakdown = [
        RoleCount(role=r[0].value if hasattr(r[0], "value") else str(r[0]), count=int(r[1]))
        for r in role_rows
    ]

    return AnalyticsBundle(
        signup_timeline=_timeline(db, User.created_at, User),
        report_timeline=_timeline(db, CitizenReport.reported_at, CitizenReport),
        role_breakdown=role_breakdown,
        top_report_zones=_top_report_zones(db),
        total_push_subscriptions=db.query(PushSubscription).count(),
        total_saved_routes=db.query(SavedRoute).count(),
    )
