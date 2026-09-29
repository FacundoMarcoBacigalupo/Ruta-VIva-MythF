"""Cliente de Open-Meteo (gratis, sin API key)."""
import httpx

from app.core.config import settings

_CACHE: dict[str, tuple[float, dict]] = {}
_CACHE_TTL_SEC = 600


async def get_weather(lat: float, lon: float) -> dict:
    """Devuelve condiciones actuales y un índice de riesgo climático 0..1."""
    import time

    key = f"{round(lat, 2)},{round(lon, 2)}"
    now = time.time()
    if key in _CACHE and now - _CACHE[key][0] < _CACHE_TTL_SEC:
        return _CACHE[key][1]

    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,precipitation,rain,showers,snowfall,weather_code,wind_speed_10m,visibility",
        "timezone": "America/Argentina/Buenos_Aires",
    }
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(settings.OPEN_METEO_URL, params=params)
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        return {
            "available": False,
            "error": str(e),
            "risk_multiplier": 1.0,
        }

    current = data.get("current", {})
    risk = _weather_risk(current)
    out = {
        "available": True,
        "current": current,
        "risk_multiplier": risk,
    }
    _CACHE[key] = (now, out)
    return out


def _weather_risk(current: dict) -> float:
    """Devuelve multiplicador 1.0..2.0 según severidad del clima."""
    risk = 1.0
    precipitation = current.get("precipitation", 0) or 0
    wind = current.get("wind_speed_10m", 0) or 0
    visibility = current.get("visibility", 20000) or 20000
    snow = current.get("snowfall", 0) or 0
    code = current.get("weather_code", 0) or 0

    if precipitation > 0:
        risk += min(precipitation * 0.08, 0.4)
    if wind > 40:
        risk += 0.15
    if visibility < 5000:
        risk += 0.25
    if visibility < 1000:
        risk += 0.25
    if snow > 0:
        risk += 0.3
    # Códigos WMO: 45-48 niebla, 95-99 tormenta, 65+ lluvia fuerte
    if code in (45, 48):
        risk += 0.3
    if code in (95, 96, 99):
        risk += 0.35
    if code in (65, 67, 75, 82):
        risk += 0.2

    return round(min(risk, 2.0), 2)
