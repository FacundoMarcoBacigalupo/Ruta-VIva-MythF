"""Ingesta real de siniestros viales desde portales de datos abiertos.

Estrategia:
1. Busca datasets en varios portales CKAN (datos.gob.ar, BA Ciudad).
2. Para cada recurso CSV, descarga, detecta columnas lat/lon/fecha por
   heurística multi-idioma y normaliza a nuestro modelo Incident.
3. Filtra por bbox de Argentina y evita duplicados por (source, external_id).

Ejecución:
    python -m app.ingest_real              # ingest completo
    python -m app.ingest_real --dry-run    # descubre pero no inserta
"""
from __future__ import annotations

import argparse
import asyncio
import logging
import sys
from datetime import datetime
from io import StringIO
from typing import Iterable

import httpx
import pandas as pd
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.models.incident import Incident

logger = logging.getLogger(__name__)

# Portales CKAN a consultar. Los que mejor cubren siniestros viales georeferenciados:
CKAN_PORTALS = [
    ("datos.gob.ar", settings.DATOS_GOB_URL),
    ("BA Ciudad", "https://data.buenosaires.gob.ar/api/3/action"),
]

SEARCH_QUERIES = [
    "siniestros viales",
    "victimas siniestros",
    "accidentes transito",
    "homicidios siniestros viales",
]

# El package name (slug) o title debe contener alguno de estos tokens para que
# lo consideremos dataset de siniestros viales. Así excluimos "delitos", "robos",
# "obras vialidad" y demás ruido que sale por matching parcial.
VIAL_KEYWORDS = (
    "siniestr", "accident", "vial", "transit", "choque", "colision",
    "homicidi", "victim",
)
# Pero si el nombre también contiene esto, probablemente sea crimen/seguridad
# y no tráfico. Excluimos incluso si tiene "homicidio" solo.
EXCLUDE_KEYWORDS_IF_NO_VIAL = (
    "delito", "crimen", "robo", "hurto", "seguridad_publica", "arma",
)
# Keywords fuertes que descartan el dataset aunque tenga otros matches
HARD_EXCLUDE_KEYWORDS = (
    "obras_publicas", "transparencia", "mujer", "genero", "infraestructura",
)

# Columnas candidatas (todo lowercase, sin tildes). Pandas normaliza abajo.
LAT_COLS = {
    "lat", "latitud", "latitude", "y", "coord_y", "coordy", "y_coord",
    "pos_y", "geo_y", "punto_y", "ycoord", "y_pos",
}
LON_COLS = {
    "lon", "lng", "longitud", "longitude", "x", "coord_x", "coordx", "x_coord",
    "pos_x", "geo_x", "punto_x", "xcoord", "x_pos",
}
DATE_COLS = {"fecha", "fecha_hecho", "fecha_siniestro", "date", "occurred_at",
             "fecha_accidente", "fecha_choque", "fechahecho", "fechaaccidente"}
PROVINCE_COLS = {"provincia", "province", "jurisdiccion", "prov"}
DEPT_COLS = {"departamento", "department", "partido", "comuna"}
LOCALITY_COLS = {"localidad", "locality", "barrio", "ciudad", "municipio"}
SEVERITY_COLS = {"gravedad", "severidad"}
FATAL_COLS = {"victimas_fatales", "fallecidos", "muertos", "vfatales", "cant_fatales"}
INJURED_COLS = {"heridos", "lesionados", "cant_heridos"}
VEHICLES_COLS = {"vehiculos", "cant_vehiculos", "participantes"}
ROAD_COLS = {"tipo_calle", "tipo_via", "via", "clase_calle"}
WEATHER_COLS = {"condicion_climatica", "clima", "tiempo"}

# Bbox aproximado de Argentina — filtramos coords claramente fuera del país
# (muchos datasets tienen filas con lat/lon en 0,0 o invertidas)
AR_BBOX = (-55.5, -21.5, -75.0, -53.0)  # (min_lat, max_lat, min_lon, max_lon)


def _norm(s: str) -> str:
    """Normaliza nombre de columna: lowercase, sin tildes ni espacios."""
    if s is None:
        return ""
    s = str(s).strip().lower()
    for a, b in [("á", "a"), ("é", "e"), ("í", "i"), ("ó", "o"), ("ú", "u"), ("ñ", "n")]:
        s = s.replace(a, b)
    return s.replace(" ", "_").replace("-", "_")


def _pick(cols_map: dict[str, str], candidates: set[str]) -> str | None:
    """Busca entre los nombres normalizados cuál matchea alguno de los candidates."""
    for real, norm in cols_map.items():
        if norm in candidates:
            return real
    return None


def _parse_coord(v) -> float | None:
    """Parsea coord, maneja coma decimal y valores inválidos."""
    try:
        if isinstance(v, str):
            v = v.strip().replace(",", ".")
        f = float(v)
        if f == 0:
            return None
        return f
    except (TypeError, ValueError):
        return None


def _parse_date(v) -> datetime | None:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    if isinstance(v, datetime):
        return v
    try:
        # Probar varios formatos comunes
        for fmt in (
            "%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%d/%m/%Y %H:%M:%S",
            "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d", "%d/%m/%y",
        ):
            try:
                return datetime.strptime(str(v).strip(), fmt)
            except ValueError:
                continue
        # Último recurso: pandas
        parsed = pd.to_datetime(v, errors="coerce", dayfirst=True)
        if pd.isna(parsed):
            return None
        return parsed.to_pydatetime()
    except Exception:
        return None


def _to_int(v, default: int = 0) -> int:
    try:
        if isinstance(v, str):
            v = v.strip()
        if v == "" or pd.isna(v):
            return default
        return int(float(v))
    except (TypeError, ValueError):
        return default


def _is_vial_dataset(pkg_name: str, pkg_title: str, pkg_tags: list[str]) -> bool:
    """Filtra datasets que son realmente de siniestros viales vs crimen/obras/etc."""
    text = " ".join(
        _norm(x) for x in [pkg_name, pkg_title, *pkg_tags]
    )
    has_vial = any(kw in text for kw in VIAL_KEYWORDS)
    if not has_vial:
        return False
    # Duro: si hay palabras como "obras publicas" o "mujer", aunque matcheó "vial",
    # casi seguro no es el dataset que queremos.
    if any(kw in text for kw in HARD_EXCLUDE_KEYWORDS):
        return False
    # Blando: si el dataset menciona "delito"/"robo" sin un contexto vial claro
    # (solo matcheó por "homicidio" por ejemplo), excluir.
    mentions_crime = any(kw in text for kw in EXCLUDE_KEYWORDS_IF_NO_VIAL)
    has_strong_vial = any(kw in text for kw in ("siniestr", "accident", "vial", "transit", "choque", "colision"))
    if mentions_crime and not has_strong_vial:
        return False
    return True


async def discover_resources(ckan_url: str, query: str) -> list[dict]:
    """Consulta CKAN package_search y devuelve recursos CSV candidatos.
    Filtra packages que no son de siniestros viales."""
    url = f"{ckan_url}/package_search"
    params = {"q": query, "rows": 25}
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        logger.warning("CKAN %s fallo (q=%s): %s", ckan_url, query, e)
        return []
    resources: list[dict] = []
    for pkg in (data.get("result") or {}).get("results", []):
        pkg_name = pkg.get("name") or ""
        pkg_title = pkg.get("title") or ""
        tags = [t.get("name", "") for t in (pkg.get("tags") or [])]
        if not _is_vial_dataset(pkg_name, pkg_title, tags):
            logger.debug("  ignorado (no vial): %s", pkg_name)
            continue
        label = pkg_name or pkg_title or "dataset"
        for res in pkg.get("resources", []):
            fmt = (res.get("format") or "").lower()
            url_res = res.get("url")
            if not url_res:
                continue
            if fmt in ("csv", "xls", "xlsx"):
                resources.append(
                    {
                        "url": url_res,
                        "format": fmt,
                        "dataset": label,
                        "name": res.get("name") or "",
                    }
                )
    return resources


async def fetch_csv(url: str) -> pd.DataFrame | None:
    """Descarga una URL y la parsea como DataFrame (probando encoding/separador)."""
    try:
        async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            content = resp.content
    except Exception as e:
        logger.warning("Download fallo %s: %s", url, e)
        return None

    # Detectar encoding — los datasets argentinos suelen estar en latin-1 o utf-8
    text: str | None = None
    for enc in ("utf-8", "utf-8-sig", "latin-1", "cp1252"):
        try:
            text = content.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    if text is None:
        return None

    # Detectar separador probando ; luego , luego tab
    for sep in (";", ",", "\t", "|"):
        try:
            df = pd.read_csv(StringIO(text), sep=sep, low_memory=False, on_bad_lines="skip")
            if len(df.columns) >= 3:
                return df
        except Exception:
            continue
    return None


def _fuzzy_find_coord(cols_map: dict[str, str], df: pd.DataFrame, needle: str, rng: tuple[float, float]) -> str | None:
    """Último recurso: busca columnas que contengan 'lat' o 'lon' en el nombre
    y cuyos valores muestren estar dentro del rango esperado."""
    for real, norm in cols_map.items():
        if needle not in norm:
            continue
        sample = df[real].dropna().head(20)
        try:
            floats = [float(str(v).strip().replace(",", ".")) for v in sample]
        except (ValueError, TypeError):
            continue
        if not floats:
            continue
        in_range = sum(1 for f in floats if rng[0] <= f <= rng[1])
        if in_range / len(floats) >= 0.7:
            return real
    return None


def extract_incidents(df: pd.DataFrame, source: str, dataset: str) -> list[dict]:
    """Mapea un DataFrame a la lista de dicts de Incident. Descarta filas sin lat/lon."""
    cols_map = {c: _norm(c) for c in df.columns}
    lat_col = _pick(cols_map, LAT_COLS) or _fuzzy_find_coord(cols_map, df, "lat", (-90, 90))
    lon_col = _pick(cols_map, LON_COLS) or _fuzzy_find_coord(cols_map, df, "lon", (-180, 180)) \
        or _fuzzy_find_coord(cols_map, df, "lng", (-180, 180))
    if not lat_col or not lon_col:
        logger.info("  %s: sin columnas lat/lon; skip (cols=%s)", dataset, list(df.columns)[:8])
        return []
    date_col = _pick(cols_map, DATE_COLS)
    prov_col = _pick(cols_map, PROVINCE_COLS)
    dept_col = _pick(cols_map, DEPT_COLS)
    loc_col = _pick(cols_map, LOCALITY_COLS)
    fatal_col = _pick(cols_map, FATAL_COLS)
    inj_col = _pick(cols_map, INJURED_COLS)
    veh_col = _pick(cols_map, VEHICLES_COLS)
    road_col = _pick(cols_map, ROAD_COLS)
    weather_col = _pick(cols_map, WEATHER_COLS)

    min_lat, max_lat, min_lon, max_lon = AR_BBOX
    out: list[dict] = []
    for idx, row in df.iterrows():
        lat = _parse_coord(row[lat_col])
        lon = _parse_coord(row[lon_col])
        if lat is None or lon is None:
            continue
        if not (min_lat <= lat <= max_lat and min_lon <= lon <= max_lon):
            continue
        occurred = _parse_date(row[date_col]) if date_col else None
        if occurred is None:
            occurred = datetime.utcnow()
        fatalities = _to_int(row[fatal_col]) if fatal_col else 0
        injuries = _to_int(row[inj_col]) if inj_col else 0
        vehicles = max(1, _to_int(row[veh_col], default=1)) if veh_col else 1
        # Severidad inferida: si hubo fatal → 5, herido grave → 4, solo daños → 2
        if fatalities > 0:
            severity = 5
        elif injuries > 1:
            severity = 4
        elif injuries == 1:
            severity = 3
        else:
            severity = 2
        ext_id = f"{source}:{dataset}:{idx}"[:118]  # columna limitada a 120
        out.append(
            {
                "source": source[:40],
                "external_id": ext_id,
                "occurred_at": occurred,
                "province": str(row[prov_col]).strip() if prov_col and pd.notna(row[prov_col]) else None,
                "department": str(row[dept_col]).strip() if dept_col and pd.notna(row[dept_col]) else None,
                "locality": str(row[loc_col]).strip() if loc_col and pd.notna(row[loc_col]) else None,
                "lat": lat,
                "lon": lon,
                "road_type": str(row[road_col]).strip()[:60] if road_col and pd.notna(row[road_col]) else None,
                "severity": severity,
                "fatalities": fatalities,
                "injuries": injuries,
                "vehicles_involved": vehicles,
                "weather": str(row[weather_col]).strip()[:60] if weather_col and pd.notna(row[weather_col]) else None,
                "surface": None,
            }
        )
    return out


def upsert_incidents(db: Session, incidents: Iterable[dict], batch_size: int = 500) -> int:
    """Inserta incidentes nuevos en batch. Evita duplicados por (source, external_id)."""
    inserted = 0
    batch: list[Incident] = []
    # Pre-cargar external_ids existentes para no hacer N queries
    all_list = list(incidents)
    if not all_list:
        return 0
    sources = {i["source"] for i in all_list}
    existing_keys: set[tuple[str, str]] = set()
    for src in sources:
        rows = db.query(Incident.source, Incident.external_id).filter(Incident.source == src).all()
        existing_keys.update((r[0], r[1]) for r in rows if r[1])

    for raw in all_list:
        key = (raw["source"], raw.get("external_id") or "")
        if key in existing_keys:
            continue
        existing_keys.add(key)
        batch.append(Incident(**raw))
        if len(batch) >= batch_size:
            db.add_all(batch)
            db.commit()
            inserted += len(batch)
            batch = []
    if batch:
        db.add_all(batch)
        db.commit()
        inserted += len(batch)
    return inserted


async def run(dry_run: bool = False, reset: bool = False) -> dict:
    """Orquesta el ingest completo. Devuelve stats.

    reset=True borra los incidentes previamente ingestados desde fuentes reales
    (todo lo que no sea source='SEED') antes de re-ingestar. Útil cuando cambiás
    el filtro de datasets y querés re-poblar sin basura vieja.
    """
    Base.metadata.create_all(bind=engine)
    if reset and not dry_run:
        db = SessionLocal()
        try:
            deleted = db.query(Incident).filter(Incident.source != "SEED").delete()
            db.commit()
            logger.info("Reset: borrados %s incidentes de ingesta previa", deleted)
        finally:
            db.close()

    all_resources: list[tuple[str, dict]] = []  # (source_name, resource)
    seen_urls: set[str] = set()

    for source_name, portal_url in CKAN_PORTALS:
        for q in SEARCH_QUERIES:
            resources = await discover_resources(portal_url, q)
            for r in resources:
                if r["url"] in seen_urls:
                    continue
                seen_urls.add(r["url"])
                all_resources.append((source_name, r))

    logger.info("Recursos descubiertos: %s", len(all_resources))
    if dry_run:
        for src, r in all_resources:
            logger.info("  [%s] %s (%s) -> %s", src, r["dataset"], r["format"], r["url"])
        return {"resources": len(all_resources), "inserted": 0, "dry_run": True}

    db = SessionLocal()
    total_inserted = 0
    try:
        for src, r in all_resources:
            if r["format"] not in ("csv",):
                continue  # XLS se puede agregar después; por ahora solo CSV
            logger.info("→ %s :: %s", src, r["dataset"])
            df = await fetch_csv(r["url"])
            if df is None or df.empty:
                continue
            incidents = extract_incidents(df, source=src, dataset=r["dataset"])
            if not incidents:
                continue
            n = upsert_incidents(db, incidents)
            total_inserted += n
            logger.info("  %s filas parseadas → %s nuevas insertadas", len(incidents), n)
    finally:
        db.close()

    logger.info("Ingesta completa — total insertados: %s", total_inserted)
    return {"resources": len(all_resources), "inserted": total_inserted, "dry_run": False}


def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s - %(message)s",
        stream=sys.stdout,
    )
    parser = argparse.ArgumentParser(description="Ingesta real de siniestros desde CKAN")
    parser.add_argument("--dry-run", action="store_true", help="Descubre pero no inserta")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Borra incidentes ingestados previamente (source != SEED) antes de re-ingestar",
    )
    args = parser.parse_args()
    stats = asyncio.run(run(dry_run=args.dry_run, reset=args.reset))
    print(stats)


if __name__ == "__main__":
    main()
