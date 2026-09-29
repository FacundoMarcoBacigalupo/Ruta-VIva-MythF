"""Poblar la base con incidentes de muestra para tener el modelo funcionando desde día 1.

Uso:
    python seed.py

Los datos son sintéticos, inspirados en patrones reales (AU Riccheri, RN9, RN7, RP2, RN3).
Reemplazar por ingesta real cuando se consolide el dataset ANSV.
"""
import random
from datetime import datetime, timedelta

from app.core.database import Base, SessionLocal, engine
from app.models.incident import Incident
from app.models.report import CitizenReport, ReportType

# (nombre, lat, lon, provincia, road_type, peso)
HOTSPOTS = [
    ("Acceso Oeste KM 30", -34.651, -58.712, "Buenos Aires", "autopista", 3.0),
    ("Autopista Riccheri", -34.755, -58.506, "Buenos Aires", "autopista", 3.2),
    ("RN 9 - San Pedro", -33.680, -59.666, "Buenos Aires", "ruta_nacional", 2.5),
    ("RN 7 - Junín", -34.584, -60.948, "Buenos Aires", "ruta_nacional", 2.8),
    ("RP 2 - Dolores", -36.319, -57.680, "Buenos Aires", "ruta_provincial", 3.0),
    ("RN 3 - Azul", -36.777, -59.858, "Buenos Aires", "ruta_nacional", 2.2),
    ("Córdoba capital - Av Colón", -31.419, -64.183, "Córdoba", "avenida", 2.4),
    ("RN 8 - Río Cuarto", -33.130, -64.348, "Córdoba", "ruta_nacional", 2.0),
    ("RN 14 - Gualeguaychú", -33.015, -58.515, "Entre Ríos", "ruta_nacional", 2.6),
    ("Rosario - Av. Circunvalación", -32.946, -60.689, "Santa Fe", "avenida", 2.5),
    ("Mendoza - Acceso Este", -32.889, -68.831, "Mendoza", "autopista", 2.0),
    ("Mar del Plata - Av. Constitución", -38.026, -57.549, "Buenos Aires", "avenida", 1.8),
]


def make_incident(
    base_lat: float,
    base_lon: float,
    province: str,
    road_type: str,
    weight: float,
    days_ago: int,
) -> dict:
    # pequeña dispersión geográfica alrededor del hotspot
    lat = base_lat + random.uniform(-0.02, 0.02)
    lon = base_lon + random.uniform(-0.02, 0.02)
    occurred = datetime.utcnow() - timedelta(days=days_ago, hours=random.randint(0, 23))
    severity = random.choices([1, 2, 3, 4, 5], weights=[30, 35, 20, 10, 5])[0]
    fatalities = 1 if severity == 5 and random.random() < 0.55 else 0
    injuries = random.choices([0, 1, 2, 3], weights=[40, 35, 15, 10])[0]
    return {
        "source": "SEED",
        "external_id": f"seed-{random.randint(1, 10**9)}",
        "occurred_at": occurred,
        "province": province,
        "department": None,
        "locality": None,
        "lat": lat,
        "lon": lon,
        "road_type": road_type,
        "severity": severity,
        "fatalities": fatalities,
        "injuries": injuries,
        "vehicles_involved": random.choice([1, 2, 2, 3]),
        "weather": random.choice(["despejado", "lluvia", "niebla", "despejado", "despejado"]),
        "surface": random.choice(["seca", "mojada", "seca", "seca"]),
    }


def main(total: int = 2000):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_incidents(db, total=total)
        seed_reports(db)
    finally:
        db.close()


def seed_incidents(db, total: int = 2000) -> None:
    existing = db.query(Incident).count()
    if existing >= total:
        print(f"Ya hay {existing} incidentes; omitiendo seed de incidentes.")
        return

    to_create = []
    for _ in range(total - existing):
        hs = random.choices(HOTSPOTS, weights=[h[5] for h in HOTSPOTS], k=1)[0]
        _, lat, lon, prov, rtype, w = hs
        days_ago = random.randint(0, 730)
        to_create.append(make_incident(lat, lon, prov, rtype, w, days_ago))

    for data in to_create:
        db.add(Incident(**data))
    db.commit()
    print(f"Insertados {len(to_create)} incidentes. Total ahora: {db.query(Incident).count()}.")


REPORT_TEMPLATES: list[tuple[ReportType, str, int]] = [
    (ReportType.accidente, "Choque entre dos autos, hay un herido leve.", 4),
    (ReportType.bache, "Bache profundo en el carril central, peligroso a la noche.", 3),
    (ReportType.niebla, "Niebla densa, visibilidad menor a 30 m.", 4),
    (ReportType.inundacion, "Calzada anegada tras la lluvia, pasan solo camionetas.", 4),
    (ReportType.obra, "Obra con reducción a un carril, cola de 2 km.", 2),
    (ReportType.animales, "Caballos sueltos cerca del km, manejar con precaución.", 3),
    (ReportType.sin_senalizacion, "Semáforo apagado en la intersección.", 3),
    (ReportType.otro, "Derrame de aceite sobre la calzada.", 3),
]


def seed_reports(db, total: int = 18) -> None:
    """Crea reportes ciudadanos recientes (últimas 24h) para que el panel
    'Reportes en vivo' tenga contenido desde el día 1. Se saltea si ya hay."""
    existing = db.query(CitizenReport).count()
    if existing >= total // 2:
        print(f"Ya hay {existing} reportes ciudadanos; omitiendo seed de reportes.")
        return

    to_create = []
    for _ in range(total):
        hs = random.choice(HOTSPOTS)
        _, base_lat, base_lon, _, _, _ = hs
        rtype, desc, sev = random.choice(REPORT_TEMPLATES)
        to_create.append(
            CitizenReport(
                user_id=None,
                report_type=rtype,
                description=desc,
                lat=base_lat + random.uniform(-0.03, 0.03),
                lon=base_lon + random.uniform(-0.03, 0.03),
                severity=sev,
                verified=random.randint(0, 6),
                reported_at=datetime.utcnow() - timedelta(minutes=random.randint(5, 23 * 60)),
            )
        )
    db.add_all(to_create)
    db.commit()
    print(f"Insertados {len(to_create)} reportes ciudadanos.")


if __name__ == "__main__":
    main()
