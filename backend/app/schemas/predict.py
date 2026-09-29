from datetime import datetime

from pydantic import BaseModel, Field


class Waypoint(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)


class RouteRiskRequest(BaseModel):
    origin_lat: float = Field(ge=-90, le=90)
    origin_lon: float = Field(ge=-180, le=180)
    dest_lat: float = Field(ge=-90, le=90)
    dest_lon: float = Field(ge=-180, le=180)
    # Paradas intermedias opcionales, en orden. Máx 8 para no abusar OSRM público.
    waypoints: list[Waypoint] = Field(default_factory=list, max_length=8)
    departure_time: datetime | None = None


class RiskSegment(BaseModel):
    lat: float
    lon: float
    risk_score: float = Field(ge=0, le=100)
    factor_breakdown: dict[str, float]


class RouteRiskResponse(BaseModel):
    overall_risk: float = Field(ge=0, le=100)
    risk_label: str
    distance_km: float
    duration_min: float
    segments: list[RiskSegment]
    recommendations: list[str]
    geometry: dict | None = None
    weather: dict | None = None


class PointRiskRequest(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    at_time: datetime | None = None


class PointRiskResponse(BaseModel):
    risk_score: float = Field(ge=0, le=100)
    risk_label: str
    nearby_incidents_1km: int
    fatal_incidents_1km: int
    factor_breakdown: dict[str, float]
