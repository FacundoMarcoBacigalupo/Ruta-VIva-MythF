"""Descarga e ingesta de siniestros ANSV desde datos.gob.ar.

En un entorno productivo se consume el dataset oficial; en desarrollo usamos
`seed.py` para poblar con datos de ejemplo.
"""
from datetime import datetime
from typing import Iterable

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.incident import Incident

# Resource IDs de ANSV en datos.gob.ar (ajustar si la fuente cambia)
ANSV_DATASETS = [
    # "siniestros-viales" — buscar el id real en https://datos.gob.ar
    # placeholder; se resuelve dinámicamente vía package_search
]


async def search_ansv_datasets() -> list[dict]:
    """Buscar datasets de ANSV en el portal nacional de datos abiertos."""
    url = f"{settings.DATOS_GOB_URL}/package_search"
    params = {"q": "siniestros viales ANSV", "rows": 10}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        return []
    return data.get("result", {}).get("results", [])


def upsert_incidents(db: Session, incidents: Iterable[dict]) -> int:
    """Inserta incidentes nuevos; evita duplicados por (source, external_id)."""
    inserted = 0
    for raw in incidents:
        ext = raw.get("external_id")
        source = raw.get("source", "ANSV")
        if ext:
            existing = (
                db.query(Incident)
                .filter(Incident.source == source, Incident.external_id == ext)
                .first()
            )
            if existing:
                continue
        incident = Incident(
            source=source,
            external_id=ext,
            occurred_at=raw["occurred_at"] if isinstance(raw["occurred_at"], datetime) else datetime.fromisoformat(raw["occurred_at"]),
            province=raw.get("province"),
            department=raw.get("department"),
            locality=raw.get("locality"),
            lat=float(raw["lat"]),
            lon=float(raw["lon"]),
            road_type=raw.get("road_type"),
            severity=int(raw.get("severity", 1)),
            fatalities=int(raw.get("fatalities", 0)),
            injuries=int(raw.get("injuries", 0)),
            vehicles_involved=int(raw.get("vehicles_involved", 1)),
            weather=raw.get("weather"),
            surface=raw.get("surface"),
        )
        db.add(incident)
        inserted += 1
    db.commit()
    return inserted
