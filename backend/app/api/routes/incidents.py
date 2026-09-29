import math
from collections import Counter
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.ml.risk_engine import _haversine_km
from app.models.incident import Incident
from app.schemas.incident import HeatmapPoint, HeatmapResponse, IncidentOut

router = APIRouter(prefix="/incidents", tags=["incidents"])


@router.get("", response_model=list[IncidentOut])
def list_incidents(
    province: str | None = None,
    days: int = Query(default=365, ge=1, le=3650),
    limit: int = Query(default=500, ge=1, le=5000),
    db: Session = Depends(get_db),
):
    since = datetime.utcnow() - timedelta(days=days)
    q = db.query(Incident).filter(Incident.occurred_at >= since)
    if province:
        q = q.filter(Incident.province == province)
    q = q.order_by(Incident.occurred_at.desc()).limit(limit)
    return [IncidentOut.model_validate(i) for i in q.all()]


@router.get("/heatmap", response_model=HeatmapResponse)
def heatmap(
    min_lat: float = Query(..., ge=-90, le=90),
    max_lat: float = Query(..., ge=-90, le=90),
    min_lon: float = Query(..., ge=-180, le=180),
    max_lon: float = Query(..., ge=-180, le=180),
    days: int = Query(default=730, ge=1, le=3650),
    db: Session = Depends(get_db),
):
    since = datetime.utcnow() - timedelta(days=days)
    # Optimización: Pedimos solo las columnas necesarias (lat, lon, severity, fatalities, injuries)
    # y bajamos el límite a 5000 para que Render procese rápido.
    results = (
        db.query(
            Incident.lat, 
            Incident.lon, 
            Incident.severity, 
            Incident.fatalities, 
            Incident.injuries
        )
        .filter(Incident.occurred_at >= since)
        .filter(Incident.lat.between(min_lat, max_lat))
        .filter(Incident.lon.between(min_lon, max_lon))
        .limit(5000)
        .all()
    )

    if not results:
        return HeatmapResponse(points=[], total=0)

    raw: list[tuple[float, float, float]] = []
    max_weight = 1.0
    for lat, lon, severity, fatalities, injuries in results:
        w = severity + fatalities * 3 + injuries * 0.3
        if w > max_weight:
            max_weight = w
        raw.append((lat, lon, w))

    points = [
        HeatmapPoint(lat=lat, lon=lon, weight=round(min(1.0, w / max_weight), 3))
        for lat, lon, w in raw
    ]
    return HeatmapResponse(points=points, total=len(points))


@router.get("/cluster")
def cluster_stats(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(default=0.5, ge=0.05, le=5.0),
    db: Session = Depends(get_db),
):
    """Agrega estadísticas de siniestros dentro de un radio alrededor de un
    punto. Se usa en el popup del heatmap para explicar por qué esa zona tiene
    ese color (densidad, fatales, tipo de vía predominante, etc)."""
    # Pre-filtro por bbox (rápido, usa índice); después filtramos por haversine real.
    lat_delta = radius_km / 111.0
    cos_lat = max(0.001, math.cos(math.radians(lat)))
    lon_delta = radius_km / (111.0 * cos_lat)
    candidates = (
        db.query(Incident)
        .filter(Incident.lat.between(lat - lat_delta, lat + lat_delta))
        .filter(Incident.lon.between(lon - lon_delta, lon + lon_delta))
        .limit(5000)
        .all()
    )
    in_radius = [
        inc for inc in candidates if _haversine_km(lat, lon, inc.lat, inc.lon) <= radius_km
    ]

    count = len(in_radius)
    if count == 0:
        return {
            "count": 0,
            "radius_km": radius_km,
            "density_label": "baja",
            "fatalities": 0,
            "injuries": 0,
            "severity_avg": 0.0,
            "top_road_type": None,
            "most_recent": None,
            "explanation": (
                "No hay siniestros históricos registrados en este radio. "
                "Por eso la zona no tiene calor o está en verde."
            ),
        }

    fatalities = sum(inc.fatalities for inc in in_radius)
    injuries = sum(inc.injuries for inc in in_radius)
    severity_avg = sum(inc.severity for inc in in_radius) / count

    road_types = [inc.road_type for inc in in_radius if inc.road_type]
    top_road_type = Counter(road_types).most_common(1)[0][0] if road_types else None

    most_recent_inc = max(in_radius, key=lambda i: i.occurred_at)

    # Etiqueta de densidad para el texto del popup
    if count >= 50 or fatalities >= 3:
        density_label = "muy alta"
    elif count >= 20 or fatalities >= 1:
        density_label = "alta"
    elif count >= 8:
        density_label = "media"
    elif count >= 3:
        density_label = "baja"
    else:
        density_label = "muy baja"

    # Explicación legible para el usuario
    parts = [
        f"En un radio de {int(radius_km * 1000)} m hay {count} siniestros registrados.",
    ]
    if fatalities:
        parts.append(f"{fatalities} con víctimas fatales.")
    if injuries:
        parts.append(f"{injuries} personas heridas en total.")
    if top_road_type:
        parts.append(f"Tipo de vía más común: {top_road_type}.")
    parts.append(
        {
            "muy alta": "Densidad MUY ALTA → por eso aparece rojo intenso / granate.",
            "alta": "Densidad alta → por eso aparece en naranja o rojo.",
            "media": "Densidad media → por eso aparece en amarillo / naranja.",
            "baja": "Densidad baja → por eso aparece en verde o amarillo.",
            "muy baja": "Densidad muy baja → por eso casi no se ve calor acá.",
        }[density_label]
    )

    return {
        "count": count,
        "radius_km": radius_km,
        "density_label": density_label,
        "fatalities": fatalities,
        "injuries": injuries,
        "severity_avg": round(severity_avg, 2),
        "top_road_type": top_road_type,
        "most_recent": {
            "occurred_at": most_recent_inc.occurred_at.isoformat(),
            "severity": most_recent_inc.severity,
            "fatalities": most_recent_inc.fatalities,
            "injuries": most_recent_inc.injuries,
        },
        "explanation": " ".join(parts),
    }
