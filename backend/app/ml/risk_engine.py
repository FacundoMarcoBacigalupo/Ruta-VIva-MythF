"""Motor de cálculo de riesgo vial.

Estrategia híbrida:
1. **Baseline heurístico** (siempre activo): densidad histórica de siniestros en
   un radio de 1 km, ponderado por severidad, hora, día de semana, tipo de ruta
   y clima actual. Funciona desde el día 1 con solo los datos seed.
2. **Refinamiento XGBoost** (opcional, si `models/xgb_risk.json` existe):
   producido por `app/ml/train.py`. Combina la salida con el baseline:
   `score_final = 0.6 * baseline + 0.4 * (prob_xgb * 100)`.

El score final está en 0..100.
"""
from __future__ import annotations

import logging
import math
import os
from datetime import datetime
from pathlib import Path
from typing import Iterable

from sqlalchemy.orm import Session

from app.models.incident import Incident
from app.models.report import CitizenReport

logger = logging.getLogger(__name__)

MODELS_DIR = Path(__file__).resolve().parents[2] / "models"
MODEL_PATH = MODELS_DIR / "xgb_risk.json"
META_PATH = MODELS_DIR / "meta.joblib"

_XGB = None
_XGB_COLUMNS: list[str] | None = None


def _try_load_model():
    global _XGB, _XGB_COLUMNS
    if _XGB is not None:
        return
    if not MODEL_PATH.exists() or not META_PATH.exists():
        return
    try:
        import joblib
        from xgboost import XGBClassifier

        m = XGBClassifier()
        m.load_model(str(MODEL_PATH))
        meta = joblib.load(META_PATH)
        _XGB = m
        _XGB_COLUMNS = list(meta["columns"])
        logger.info("XGBoost risk model cargado.")
    except Exception as e:
        logger.warning("No se pudo cargar modelo XGB: %s", e)


_try_load_model()

_EARTH_R_KM = 6371.0


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * _EARTH_R_KM * math.asin(math.sqrt(a))


def _bbox(lat: float, lon: float, radius_km: float) -> tuple[float, float, float, float]:
    dlat = radius_km / 111.0
    dlon = radius_km / (111.0 * max(0.1, math.cos(math.radians(lat))))
    return (lat - dlat, lat + dlat, lon - dlon, lon + dlon)


def _time_multiplier(dt: datetime) -> float:
    hour = dt.hour
    weekday = dt.weekday()
    f = 1.0
    if 0 <= hour < 6:
        f *= 1.35
    elif 6 <= hour < 10:
        f *= 1.1
    elif 17 <= hour < 21:
        f *= 1.2
    elif 21 <= hour < 24:
        f *= 1.25
    else:
        f *= 0.9
    if weekday in (4, 5):
        f *= 1.15
    elif weekday == 6:
        f *= 1.1
    return round(f, 2)


def _density_score(
    db: Session, lat: float, lon: float, radius_km: float = 1.0
) -> tuple[float, int, int]:
    lat_min, lat_max, lon_min, lon_max = _bbox(lat, lon, radius_km)
    q = (
        db.query(Incident)
        .filter(Incident.lat.between(lat_min, lat_max))
        .filter(Incident.lon.between(lon_min, lon_max))
    )
    nearby = 0
    fatals = 0
    weighted = 0.0
    for inc in q.all():
        d = _haversine_km(lat, lon, inc.lat, inc.lon)
        if d > radius_km:
            continue
        nearby += 1
        fatals += inc.fatalities
        distance_factor = max(0.1, 1 - (d / radius_km))
        severity = inc.severity + inc.fatalities * 3 + inc.injuries * 0.5
        weighted += severity * distance_factor

    base = min(70.0, weighted * 2.2)
    return round(base, 2), nearby, fatals


def _reports_score(db: Session, lat: float, lon: float, radius_km: float = 0.5) -> float:
    from datetime import timedelta

    cutoff = datetime.utcnow() - timedelta(hours=24)
    lat_min, lat_max, lon_min, lon_max = _bbox(lat, lon, radius_km)
    q = (
        db.query(CitizenReport)
        .filter(CitizenReport.reported_at >= cutoff)
        .filter(CitizenReport.lat.between(lat_min, lat_max))
        .filter(CitizenReport.lon.between(lon_min, lon_max))
    )
    total = 0.0
    for r in q.all():
        d = _haversine_km(lat, lon, r.lat, r.lon)
        if d > radius_km:
            continue
        total += r.severity * (1 - d / radius_km) * 2.0
    return round(min(20.0, total), 2)


def _label(score: float) -> str:
    if score >= 75:
        return "critico"
    if score >= 55:
        return "alto"
    if score >= 35:
        return "medio"
    if score >= 15:
        return "bajo"
    return "muy_bajo"


def _xgb_prob(lat: float, lon: float, when: datetime) -> float | None:
    if _XGB is None or _XGB_COLUMNS is None:
        return None
    try:
        import numpy as np
        import pandas as pd

        row = {
            "lat": lat,
            "lon": lon,
            "hour": when.hour,
            "weekday": when.weekday(),
            "month": when.month,
            "severity": 0,
            "fatalities": 0,
            "injuries": 0,
            "vehicles": 0,
        }
        df = pd.DataFrame([row])
        # Rellenar columnas one-hot faltantes con 0
        for col in _XGB_COLUMNS:
            if col not in df.columns:
                df[col] = 0
        df = df[_XGB_COLUMNS]
        prob = float(_XGB.predict_proba(df)[0, 1])
        return prob
    except Exception as e:
        logger.warning("Fallo predicción XGB: %s", e)
        return None


def score_point(
    db: Session,
    lat: float,
    lon: float,
    at_time: datetime | None = None,
    weather_multiplier: float = 1.0,
) -> dict:
    when = at_time or datetime.utcnow()
    density, nearby, fatals = _density_score(db, lat, lon)
    reports = _reports_score(db, lat, lon)
    time_mult = _time_multiplier(when)

    subtotal = density + reports
    baseline = min(100.0, subtotal * time_mult * weather_multiplier)

    xgb_component: float | None = None
    prob = _xgb_prob(lat, lon, when)
    if prob is not None:
        xgb_component = prob * 100
        final = 0.6 * baseline + 0.4 * xgb_component
    else:
        final = baseline

    return {
        "risk_score": round(min(100.0, final), 2),
        "risk_label": _label(final),
        "nearby_incidents_1km": nearby,
        "fatal_incidents_1km": fatals,
        "factor_breakdown": {
            "historical_density": density,
            "live_reports": reports,
            "time_multiplier": time_mult,
            "weather_multiplier": weather_multiplier,
            "baseline_score": round(baseline, 2),
            "xgb_score": round(xgb_component, 2) if xgb_component is not None else 0.0,
        },
    }


def score_route(
    db: Session,
    points: Iterable[tuple[float, float]],
    at_time: datetime | None = None,
    weather_multiplier: float = 1.0,
) -> list[dict]:
    """Optimizado: hace una sola carga masiva de incidentes y reportes de toda la zona."""
    points_list = list(points)
    if not points_list:
        return []

    # 1. Calcular BBOX total de la ruta + buffer de 2km
    lats = [p[0] for p in points_list]
    lons = [p[1] for p in points_list]
    lat_min, lat_max = min(lats) - 0.02, max(lats) + 0.02
    lon_min, lon_max = min(lons) - 0.02, max(lons) + 0.02

    # 2. Carga MASIVA de incidentes y reportes (solo una vez por ruta)
    # Solo pedimos las columnas necesarias para ahorrar memoria
    all_incidents = (
        db.query(Incident.lat, Incident.lon, Incident.severity, Incident.fatalities, Incident.injuries)
        .filter(Incident.lat.between(lat_min, lat_max))
        .filter(Incident.lon.between(lon_min, lon_max))
        .all()
    )

    from datetime import timedelta
    cutoff = datetime.utcnow() - timedelta(hours=24)
    all_reports = (
        db.query(CitizenReport.lat, CitizenReport.lon, CitizenReport.severity)
        .filter(CitizenReport.reported_at >= cutoff)
        .filter(CitizenReport.lat.between(lat_min, lat_max))
        .filter(CitizenReport.lon.between(lon_min, lon_max))
        .all()
    )

    # 3. Procesar cada punto localmente usando los datos cargados
    when = at_time or datetime.utcnow()
    time_mult = _time_multiplier(when)
    results = []

    for lat, lon in points_list:
        # Calcular densidad histórica localmente
        weighted_density = 0.0
        nearby = 0
        fatals = 0
        for i_lat, i_lon, i_sev, i_fat, i_inj in all_incidents:
            d = _haversine_km(lat, lon, i_lat, i_lon)
            if d <= 1.0:
                nearby += 1
                fatals += i_fat
                dist_factor = max(0.1, 1 - (d / 1.0))
                sev_score = i_sev + i_fat * 3 + i_inj * 0.5
                weighted_density += sev_score * dist_factor
        
        density_score = round(min(70.0, weighted_density * 2.2), 2)

        # Calcular reportes ciudadanos localmente
        weighted_reports = 0.0
        for r_lat, r_lon, r_sev in all_reports:
            d = _haversine_km(lat, lon, r_lat, r_lon)
            if d <= 0.5:
                weighted_reports += r_sev * (1 - d / 0.5) * 2.0
        
        rep_score = round(min(20.0, weighted_reports), 2)

        # XGBoost (sigue siendo en memoria)
        xgb_comp = 0.0
        prob = _xgb_prob(lat, lon, when)
        if prob is not None:
            xgb_comp = prob * 100
        
        baseline = min(100.0, (density_score + rep_score) * time_mult * weather_multiplier)
        if prob is not None:
             final = 0.6 * baseline + 0.4 * xgb_comp
        else:
             final = baseline

        results.append({
            "lat": lat,
            "lon": lon,
            "risk_score": round(min(100.0, final), 2),
            "risk_label": _label(final),
            "nearby_incidents_1km": nearby,
            "fatal_incidents_1km": fatals,
            "factor_breakdown": {
                "historical_density": density_score,
                "live_reports": rep_score,
                "time_multiplier": time_mult,
                "weather_multiplier": weather_multiplier,
            }
        })

    return results


def build_recommendations(overall: float, weather: dict | None) -> list[str]:
    tips = []
    if overall >= 75:
        tips.append("Riesgo crítico: evaluá postergar el viaje o tomar ruta alternativa.")
    elif overall >= 55:
        tips.append("Riesgo alto: manejá con atención extra y reducí la velocidad.")
    elif overall >= 35:
        tips.append("Riesgo medio: mantené la distancia y evitá distracciones.")
    else:
        tips.append("Riesgo bajo, pero siempre respetá los límites de velocidad.")

    if weather and weather.get("available"):
        current = weather.get("current", {})
        if (current.get("precipitation") or 0) > 2:
            tips.append("Hay precipitaciones: aumentá distancia de frenado.")
        if (current.get("visibility") or 20000) < 2000:
            tips.append("Visibilidad reducida: usá luces bajas y reducí velocidad.")
        if (current.get("wind_speed_10m") or 0) > 50:
            tips.append("Vientos fuertes: precaución en vehículos altos.")
    return tips
