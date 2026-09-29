"""Cliente para API Georef (datos.gob.ar) — normalización de direcciones AR.

Cadena de geocoding, en orden:
1. Photon (photon.komoot.io) — OSM con tolerancia de rate-limit razonable.
2. Nominatim (OSM) — bloqueante a 1 req/seg; queda como backup.
3. Georef (datos.gob.ar) — API del gobierno, actualmente 404 a todo pero
   cuando vuelva queda lista.

Resultados cacheados en memoria 5 min por query normalizada.
"""
import logging
import time

import httpx

from app.core.config import settings
from app.services import ar_gazetteer

logger = logging.getLogger(__name__)

# Cache simple en memoria: query normalizada → (timestamp, resultados). TTL 5 min.
_CACHE_TTL = 300
_loc_cache: dict[str, tuple[float, list[dict]]] = {}
_addr_cache: dict[str, tuple[float, list[dict]]] = {}


def _cache_get(bucket: dict, key: str) -> list[dict] | None:
    entry = bucket.get(key)
    if not entry:
        return None
    ts, data = entry
    if time.time() - ts > _CACHE_TTL:
        bucket.pop(key, None)
        return None
    return data


def _cache_set(bucket: dict, key: str, data: list[dict]) -> None:
    if len(bucket) > 500:
        bucket.clear()  # GC rudimentario para evitar memory bloat
    bucket[key] = (time.time(), data)


async def geocode(address: str, max_results: int = 5) -> list[dict]:
    """Geocoding de direcciones. Cadena: cache → Photon → Nominatim → Georef.
    Photon y Nominatim manejan tanto 'Av Corrientes 1000' como 'Caballito'.
    Devuelve [] si ninguna fuente responde."""
    cache_key = address.strip().lower()
    cached = _cache_get(_addr_cache, cache_key)
    if cached is not None:
        return cached[:max_results]

    results: list[dict] = []
    seen: set[tuple[float, float]] = set()

    def extend(items: list[dict]) -> None:
        for r in items:
            key = (round(r["lat"], 4), round(r["lon"], 4))
            if key in seen:
                continue
            seen.add(key)
            results.append(r)

    async with httpx.AsyncClient(timeout=6.0) as client:
        # 1) Photon (más tolerante de rate-limit)
        try:
            extend(await _try_photon(client, address, max_results))
        except Exception:
            pass

        # 2) Nominatim si hace falta más
        if len(results) < max_results:
            try:
                extend(await _try_nominatim(client, address, max_results))
            except Exception:
                pass

        # 2) Georef /direcciones — solo si el circuit breaker no lo deshabilitó
        if len(results) < max_results and _georef_enabled():
            try:
                resp = await client.get(
                    f"{settings.GEOREF_URL}/direcciones",
                    params={"direccion": address, "max": max_results},
                )
                resp.raise_for_status()
                data = resp.json()
                _georef_record(ok=True)
                for item in data.get("direcciones", []):
                    ubi = item.get("ubicacion") or {}
                    lat = ubi.get("lat")
                    lon = ubi.get("lon")
                    if lat is None or lon is None:
                        continue
                    key = (round(float(lat), 4), round(float(lon), 4))
                    if key in seen:
                        continue
                    seen.add(key)
                    results.append(
                        {
                            "label": item.get("nomenclatura", ""),
                            "lat": float(lat),
                            "lon": float(lon),
                            "province": (item.get("provincia") or {}).get("nombre"),
                            "department": (item.get("departamento") or {}).get("nombre"),
                            "locality": (item.get("localidad_censal") or {}).get("nombre"),
                        }
                    )
            except Exception:
                _georef_record(ok=False)

        # Fallback offline (gazetteer) si todas las fuentes fallaron
        if len(results) < max_results:
            extend(ar_gazetteer.search(address, max_results=max_results))

    final = results[:max_results]
    if final:
        _cache_set(_addr_cache, cache_key, final)
    return final


async def _try_georef(client: httpx.AsyncClient, path: str, key: str, name: str, max_results: int) -> list[dict]:
    """Helper: consulta un endpoint de Georef (/localidades, /municipios, etc.)
    y normaliza al shape de geocode()."""
    try:
        resp = await client.get(
            f"{settings.GEOREF_URL}{path}", params={"nombre": name, "max": max_results}
        )
        resp.raise_for_status()
        items = resp.json().get(key) or []
    except Exception:
        return []
    out: list[dict] = []
    for item in items:
        centro = item.get("centroide") or {}
        lat = centro.get("lat")
        lon = centro.get("lon")
        if lat is None or lon is None:
            continue
        nombre = item.get("nombre") or ""
        prov = (item.get("provincia") or {}).get("nombre")
        label = f"{nombre}{', ' + prov if prov else ''}"
        out.append(
            {
                "label": label,
                "lat": float(lat),
                "lon": float(lon),
                "province": prov,
                "department": (item.get("departamento") or {}).get("nombre"),
                "locality": nombre,
            }
        )
    return out


async def _try_photon(client: httpx.AsyncClient, name: str, max_results: int) -> list[dict]:
    """Photon (komoot) — geocoder OSM sin rate-limit tan estricto como
    Nominatim. Devuelve GeoJSON FeatureCollection."""
    params = {
        "q": name,
        "limit": max_results,
        "lang": "es",
        # bbox como bias (no filtro duro) — Photon prioriza resultados adentro
        "bbox": "-75,-55,-53,-21",
    }
    # User-Agent identificable; algunos endpoints públicos rechazan clients sin UA.
    headers = {"User-Agent": "RutaVivaMythF/0.1 (contact: agenciamythf@gmail.com)"}
    try:
        resp = await client.get("https://photon.komoot.io/api", params=params, headers=headers)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        logger.info("Photon fallo para '%s': %s", name, e)
        return []
    features = data.get("features", [])
    logger.info("Photon devolvió %s features para '%s'", len(features), name)
    out: list[dict] = []
    for feat in features:
        geom = feat.get("geometry") or {}
        coords = geom.get("coordinates") or []
        if len(coords) < 2:
            continue
        lon, lat = float(coords[0]), float(coords[1])
        # Filtramos geográficamente: si está fuera del bbox de Argentina,
        # descartamos (en vez de depender del campo country que a veces falta).
        if not (-55.5 <= lat <= -21.5 and -75.0 <= lon <= -53.0):
            continue
        p = feat.get("properties") or {}
        nombre = (
            p.get("name")
            or p.get("city")
            or p.get("district")
            or p.get("county")
            or p.get("street")
            or "Lugar"
        )
        prov = p.get("state")
        label = nombre
        if prov and prov not in label:
            label = f"{nombre}, {prov}"
        out.append(
            {
                "label": label,
                "lat": lat,
                "lon": lon,
                "province": prov,
                "department": p.get("county") or p.get("district"),
                "locality": nombre,
            }
        )
    return out


async def _try_nominatim(client: httpx.AsyncClient, name: str, max_results: int) -> list[dict]:
    """Nominatim de OSM — fallback cuando Photon no encuentra. Tiene rate-limit
    estricto (1 req/seg) así que el circuit breaker global nos protege."""
    params = {
        "q": f"{name}, Argentina",
        "format": "jsonv2",
        "limit": max_results,
        "countrycodes": "ar",
        "addressdetails": 1,
    }
    headers = {"User-Agent": "RutaVivaMythF/0.1 (contact: agenciamythf@gmail.com)"}
    try:
        resp = await client.get(
            "https://nominatim.openstreetmap.org/search", params=params, headers=headers
        )
        resp.raise_for_status()
        items = resp.json() or []
    except Exception as e:
        logger.debug("Nominatim fallo: %s", e)
        return []
    out: list[dict] = []
    for item in items:
        try:
            lat = float(item["lat"])
            lon = float(item["lon"])
        except (KeyError, ValueError, TypeError):
            continue
        addr = item.get("address") or {}
        nombre = (
            addr.get("suburb")
            or addr.get("neighbourhood")
            or addr.get("city")
            or addr.get("town")
            or addr.get("village")
            or addr.get("municipality")
            or item.get("name")
            or item.get("display_name", "").split(",")[0]
        )
        prov = addr.get("state") or addr.get("region")
        display = item.get("display_name", "")
        label = nombre if nombre else display.split(",")[0]
        if prov and prov not in label:
            label = f"{label}, {prov}"
        out.append(
            {
                "label": label,
                "lat": lat,
                "lon": lon,
                "province": prov,
                "department": addr.get("county") or addr.get("state_district"),
                "locality": nombre,
            }
        )
    return out


# Circuit breaker: si Georef tira muchos 4xx/5xx en poco tiempo, lo saltamos
# durante un rato para no llenar el log y ganar velocidad de respuesta.
_georef_state = {"failures": 0, "disabled_until": 0.0}
_GEOREF_FAIL_THRESHOLD = 3
_GEOREF_DISABLE_SECS = 600  # 10 minutos


def _georef_enabled() -> bool:
    import time
    if _georef_state["disabled_until"] > time.time():
        return False
    return True


def _georef_record(ok: bool) -> None:
    import time
    if ok:
        _georef_state["failures"] = 0
        return
    _georef_state["failures"] += 1
    if _georef_state["failures"] >= _GEOREF_FAIL_THRESHOLD:
        _georef_state["disabled_until"] = time.time() + _GEOREF_DISABLE_SECS
        _georef_state["failures"] = 0


async def _try_georef_tracked(client, path, key, name, max_results):
    """Wrapper que actualiza el circuit breaker según el resultado."""
    out = await _try_georef(client, path, key, name, max_results)
    _georef_record(ok=bool(out))
    return out


async def search_localities(name: str, max_results: int = 8) -> list[dict]:
    """Busca zonas argentinas por nombre (localidad, municipio, barrio, ciudad).
    Cadena: cache → Photon → Nominatim → Georef. Resultados normalizados al
    shape de geocode()."""
    cache_key = name.strip().lower()
    cached = _cache_get(_loc_cache, cache_key)
    if cached is not None:
        return cached[:max_results]

    combined: list[dict] = []
    seen: set[tuple[float, float]] = set()

    def extend(items: list[dict]) -> None:
        for r in items:
            key = (round(r["lat"], 4), round(r["lon"], 4))
            if key in seen:
                continue
            seen.add(key)
            combined.append(r)
            if len(combined) >= max_results:
                return

    async with httpx.AsyncClient(timeout=6.0) as client:
        # 1) Photon — OSM con tolerancia de rate-limit más laxa.
        photon_results = await _try_photon(client, name, max_results)
        logger.info("search_localities('%s'): photon=%s", name, len(photon_results))
        extend(photon_results)

        # 2) Nominatim — backup si Photon devolvió poco.
        if len(combined) < max_results:
            nom_results = await _try_nominatim(client, name, max_results)
            logger.info("search_localities('%s'): nominatim=%s", name, len(nom_results))
            extend(nom_results)

        # 3) Georef — solo si el circuit breaker no lo deshabilitó.
        if len(combined) < max_results and _georef_enabled():
            extend(await _try_georef_tracked(client, "/localidades", "localidades", name, max_results))
            if len(combined) < max_results:
                extend(await _try_georef_tracked(client, "/municipios", "municipios", name, max_results))

    # 4) Fallback offline — gazetteer local con ~200 zonas argentinas clave
    # (barrios CABA, GBA, capitales provinciales, turismo). Garantiza que si
    # todas las APIs externas están bloqueadas, al menos lugares populares
    # responden. Se agrega solo si no se hallaron suficientes resultados online.
    if len(combined) < max_results:
        gazetteer = ar_gazetteer.search(name, max_results=max_results)
        logger.info("search_localities('%s'): gazetteer=%s", name, len(gazetteer))
        extend(gazetteer)

    result = combined[:max_results]
    logger.info("search_localities('%s') → %s resultados totales", name, len(result))
    if result:
        _cache_set(_loc_cache, cache_key, result)
    return result


async def reverse_geocode(lat: float, lon: float) -> dict | None:
    """Devuelve un dict con label legible + lat/lon normalizado.
    Cadena: Photon reverse → Nominatim reverse → Georef. El primero que
    devuelve algo útil gana. Si todos fallan → fallback con lat/lon en label."""
    async with httpx.AsyncClient(timeout=6.0) as client:
        headers = {"User-Agent": "RutaVivaMythF/0.1 (contact: agenciamythf@gmail.com)"}

        # 1) Photon reverse
        try:
            resp = await client.get(
                "https://photon.komoot.io/reverse",
                params={"lat": lat, "lon": lon, "lang": "es", "limit": 1},
                headers=headers,
            )
            resp.raise_for_status()
            feats = (resp.json().get("features") or [])
            if feats:
                p = feats[0].get("properties") or {}
                nombre = p.get("name") or p.get("street") or p.get("city")
                prov = p.get("state")
                parts = [x for x in (nombre, p.get("city"), prov) if x]
                if parts:
                    return {
                        "label": ", ".join(dict.fromkeys(parts)),  # dedupe preservando orden
                        "lat": lat,
                        "lon": lon,
                        "province": prov,
                        "department": p.get("county"),
                        "locality": p.get("city") or nombre,
                    }
        except Exception:
            pass

        # 2) Nominatim reverse
        try:
            resp = await client.get(
                "https://nominatim.openstreetmap.org/reverse",
                params={"lat": lat, "lon": lon, "format": "jsonv2", "addressdetails": 1, "zoom": 14},
                headers=headers,
            )
            resp.raise_for_status()
            data = resp.json()
            addr = data.get("address") or {}
            display = data.get("display_name") or ""
            label = addr.get("suburb") or addr.get("neighbourhood") or addr.get("city") \
                or addr.get("town") or addr.get("village") or display.split(",")[0]
            prov = addr.get("state")
            if label and prov:
                label = f"{label}, {prov}"
            if label:
                return {
                    "label": label,
                    "lat": lat,
                    "lon": lon,
                    "province": prov,
                    "department": addr.get("county"),
                    "locality": addr.get("city") or addr.get("town"),
                }
        except Exception:
            pass

        # 3) Georef ubicacion (si está arriba)
        if _georef_enabled():
            try:
                resp = await client.get(
                    f"{settings.GEOREF_URL}/ubicacion", params={"lat": lat, "lon": lon}
                )
                resp.raise_for_status()
                _georef_record(ok=True)
                ubi = (resp.json().get("ubicacion") or {})
                if ubi:
                    prov = (ubi.get("provincia") or {}).get("nombre")
                    locality = (ubi.get("municipio") or {}).get("nombre")
                    label_parts = [x for x in (locality, prov) if x]
                    return {
                        "label": ", ".join(label_parts) if label_parts else f"{lat:.4f}, {lon:.4f}",
                        "lat": lat,
                        "lon": lon,
                        "province": prov,
                        "department": (ubi.get("departamento") or {}).get("nombre"),
                        "locality": locality,
                    }
            except Exception:
                _georef_record(ok=False)

    # Fallback total: mostrar coordenadas como label
    return {
        "label": f"Punto {lat:.4f}, {lon:.4f}",
        "lat": lat,
        "lon": lon,
        "province": None,
        "department": None,
        "locality": None,
    }
