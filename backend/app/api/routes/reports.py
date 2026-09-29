from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.report import CitizenReport
from app.models.user import User
from app.schemas.report import CitizenReportCreate, CitizenReportOut

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("", response_model=CitizenReportOut, status_code=201)
def create_report(
    payload: CitizenReportCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    report = CitizenReport(
        user_id=user.id,
        report_type=payload.report_type,
        description=payload.description,
        lat=payload.lat,
        lon=payload.lon,
        severity=payload.severity,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return CitizenReportOut.model_validate(report)


@router.get("", response_model=list[CitizenReportOut])
def list_reports(
    hours: int = Query(default=24, ge=1, le=168),
    db: Session = Depends(get_db),
):
    since = datetime.utcnow() - timedelta(hours=hours)
    q = (
        db.query(CitizenReport)
        .filter(CitizenReport.reported_at >= since)
        .order_by(CitizenReport.reported_at.desc())
        .limit(500)
    )
    return [CitizenReportOut.model_validate(r) for r in q.all()]


_verified_by: dict[tuple[int, int], float] = {}


@router.post("/{report_id}/verify", response_model=CitizenReportOut)
def verify_report(
    report_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    from fastapi import HTTPException
    import time

    report = db.get(CitizenReport, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")

    # Un user solo puede verificar un mismo reporte una vez (anti-spam)
    key = (user.id, report_id)
    if key in _verified_by:
        raise HTTPException(status_code=409, detail="Ya verificaste este reporte")
    _verified_by[key] = time.time()

    report.verified += 1
    db.commit()
    db.refresh(report)
    return CitizenReportOut.model_validate(report)
