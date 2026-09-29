from datetime import datetime

from pydantic import BaseModel, Field


class SavedRouteCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    origin_label: str
    origin_lat: float
    origin_lon: float
    dest_label: str
    dest_lat: float
    dest_lon: float


class SavedRouteOut(BaseModel):
    id: int
    name: str
    origin_label: str
    origin_lat: float
    origin_lon: float
    dest_label: str
    dest_lat: float
    dest_lon: float
    created_at: datetime

    class Config:
        from_attributes = True
