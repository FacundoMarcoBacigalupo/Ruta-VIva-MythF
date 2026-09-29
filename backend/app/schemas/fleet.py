from pydantic import BaseModel, Field


class FleetCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    cuit: str | None = Field(default=None, max_length=20)
    contact_email: str | None = Field(default=None, max_length=255)


class FleetOut(BaseModel):
    id: int
    name: str
    cuit: str | None
    contact_email: str | None

    class Config:
        from_attributes = True


class VehicleCreate(BaseModel):
    plate: str = Field(min_length=3, max_length=20)
    model: str | None = None
    driver_name: str | None = None


class VehicleOut(BaseModel):
    id: int
    plate: str
    model: str | None
    driver_name: str | None

    class Config:
        from_attributes = True


class FleetStats(BaseModel):
    total_vehicles: int
    routes_analyzed_30d: int
    avg_risk_30d: float
    high_risk_trips_30d: int
    incidents_near_routes: int
