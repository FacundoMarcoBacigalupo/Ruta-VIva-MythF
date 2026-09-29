from datetime import datetime

from pydantic import BaseModel, Field

from app.models.report import ReportType


class CitizenReportCreate(BaseModel):
    report_type: ReportType
    description: str | None = Field(default=None, max_length=1000)
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    severity: int = Field(default=2, ge=1, le=5)


class CitizenReportOut(BaseModel):
    id: int
    report_type: ReportType
    description: str | None
    lat: float
    lon: float
    severity: int
    verified: int
    reported_at: datetime

    class Config:
        from_attributes = True
