from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.ml import risk_engine
from app.schemas.predict import (
    PointRiskRequest,
    PointRiskResponse,
    RiskSegment,
    RouteRiskRequest,
    RouteRiskResponse,
)
from app.services.osrm import get_route, sample_route_points
from app.services.weather import get_weather

router = APIRouter(prefix="/predict", tags=["predict"])


@router.post("/point", response_model=PointRiskResponse)
async def predict_point(payload: PointRiskRequest, db: Session = Depends(get_db)):
    weather = await get_weather(payload.lat, payload.lon)
    mult = weather.get("risk_multiplier", 1.0) if weather else 1.0
    result = risk_engine.score_point(
        db, payload.lat, payload.lon, payload.at_time, weather_multiplier=mult
    )
    return PointRiskResponse(**result)


@router.post("/route", response_model=RouteRiskResponse)
async def predict_route(payload: RouteRiskRequest, db: Session = Depends(get_db)):
    try:
        waypoints = [(wp.lat, wp.lon) for wp in payload.waypoints]
        route = await get_route(
            payload.origin_lat,
            payload.origin_lon,
            payload.dest_lat,
            payload.dest_lon,
            waypoints=waypoints,
        )
        if not route:
            # Fallback robusto sin dependencias complejas
            all_pts: list[tuple[float, float]] = [(payload.origin_lat, payload.origin_lon)]
            all_pts.extend(waypoints)
            all_pts.append((payload.dest_lat, payload.dest_lon))
            
            interpolated: list[tuple[float, float]] = []
            for i in range(len(all_pts) - 1):
                p1, p2 = all_pts[i], all_pts[i+1]
                # Generamos al menos 10 puntos por tramo para que no sea una línea vacía
                for j in range(20):
                    f = j / 19.0
                    interpolated.append((
                        p1[0] + (p2[0] - p1[0]) * f,
                        p1[1] + (p2[1] - p1[1]) * f
                    ))
            
            points = interpolated if interpolated else all_pts
            from app.ml.risk_engine import _haversine_km
            dist_km = sum(
                _haversine_km(all_pts[i][0], all_pts[i][1], all_pts[i + 1][0], all_pts[i + 1][1])
                for i in range(len(all_pts) - 1)
            )
            duration_min = dist_km * 1.5
        else:
            # 100 puntos es el "sweet spot" entre fluidez y rendimiento.
            target_points = min(100, 50 + 10 * len(waypoints))
            points = sample_route_points(route["geometry"], max_points=target_points)
            dist_km = route["distance_m"] / 1000.0
            duration_min = route["duration_s"] / 60.0

        # Clima en el punto medio
        mid_idx = len(points) // 2
        mid = points[mid_idx] if points else (payload.origin_lat, payload.origin_lon)
        weather = await get_weather(mid[0], mid[1])
        mult = weather.get("risk_multiplier", 1.0) if weather else 1.0

        when = payload.departure_time or datetime.utcnow()
        try:
            segment_scores = risk_engine.score_route(db, points, when, weather_multiplier=mult)
        except Exception as db_err:
            import logging
            logging.getLogger("rutaviva").error(f"Error de base de datos en predict_route: {db_err}")
            # Fallback: generar scores neutros si la DB falla para no dar 500
            segment_scores = [
                {
                    "lat": p[0], "lon": p[1], 
                    "risk_score": 15.0, # Riesgo bajo por defecto si no hay data
                    "factor_breakdown": {"limbo_db": 1.0}
                } 
                for p in points
            ]

        segments = [
            RiskSegment(
                lat=s["lat"],
                lon=s["lon"],
                risk_score=s["risk_score"],
                factor_breakdown=s["factor_breakdown"],
            )
            for s in segment_scores
        ]
        overall = round(sum(s.risk_score for s in segments) / max(1, len(segments)), 2)
        return RouteRiskResponse(
            overall_risk=overall,
            risk_label=risk_engine._label(overall),
            distance_km=round(dist_km, 2),
            duration_min=round(duration_min, 1),
            segments=segments,
            recommendations=risk_engine.build_recommendations(overall, weather),
            geometry=route["geometry"] if route else {"type": "LineString", "coordinates": [[p[1], p[0]] for p in points]},
            weather=weather,
        )
    except Exception:
        raise
