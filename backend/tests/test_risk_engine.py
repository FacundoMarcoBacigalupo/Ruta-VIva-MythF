from datetime import datetime

from app.ml.risk_engine import (
    _haversine_km,
    _label,
    _time_multiplier,
    build_recommendations,
)


def test_haversine_zero_distance():
    assert _haversine_km(-34.6, -58.4, -34.6, -58.4) == 0.0


def test_haversine_known_distance():
    # Obelisco (BA) → La Plata ≈ 55 km
    d = _haversine_km(-34.603, -58.381, -34.921, -57.954)
    assert 50 < d < 60


def test_label_boundaries():
    assert _label(0) == "muy_bajo"
    assert _label(14.9) == "muy_bajo"
    assert _label(15) == "bajo"
    assert _label(34.9) == "bajo"
    assert _label(35) == "medio"
    assert _label(54.9) == "medio"
    assert _label(55) == "alto"
    assert _label(74.9) == "alto"
    assert _label(75) == "critico"
    assert _label(100) == "critico"


def test_time_multiplier_night_is_higher():
    night = _time_multiplier(datetime(2026, 4, 15, 2, 0))  # martes 02:00
    midday = _time_multiplier(datetime(2026, 4, 15, 13, 0))
    assert night > midday


def test_time_multiplier_weekend():
    friday = _time_multiplier(datetime(2026, 4, 17, 22, 0))  # viernes 22h
    monday = _time_multiplier(datetime(2026, 4, 13, 22, 0))  # lunes 22h
    assert friday > monday


def test_recommendations_scale_with_risk():
    low = build_recommendations(20, {"available": False})
    high = build_recommendations(90, {"available": False})
    assert any("crítico" in r.lower() for r in high)
    assert not any("crítico" in r.lower() for r in low)


def test_recommendations_include_weather_warnings():
    weather = {
        "available": True,
        "current": {"precipitation": 5, "visibility": 500, "wind_speed_10m": 60},
    }
    tips = build_recommendations(50, weather)
    text = " ".join(tips).lower()
    assert "precipitaciones" in text
    assert "visibilidad" in text
    assert "vientos" in text
