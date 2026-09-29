from datetime import datetime

from pydantic import BaseModel, Field


class IncidentOut(BaseModel):
    id: int
    occurred_at: datetime
    province: str | None = None
    lat: float
    lon: float
    road_type: str | None = None
    severity: int
    fatalities: int
    injuries: int

    class Config:
        from_attributes = True


class HeatmapPoint(BaseModel):
    lat: float
    lon: float
    weight: float = Field(ge=0, le=1)


class HeatmapResponse(BaseModel):
    points: list[HeatmapPoint]
    total: int
