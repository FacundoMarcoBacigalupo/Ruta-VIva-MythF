"""Cliente OSRM público — ruteo gratis (con throttle razonable)."""
import httpx

from app.core.config import settings


async def get_route(
    origin_lat: float,
    origin_lon: float,
    dest_lat: float,
    dest_lon: float,
    waypoints: list[tuple[float, float]] | None = None,
) -> dict | None:
    pairs: list[str] = [f"{origin_lon},{origin_lat}"]
    for wp_lat, wp_lon in waypoints or []:
        pairs.append(f"{wp_lon},{wp_lat}")
    pairs.append(f"{dest_lon},{dest_lat}")
    coords = ";".join(pairs)
    
    # Intentamos con dos servidores diferentes por si uno bloquea a Render
    servers = [
        "https://router.project-osrm.org",
        "https://routing.openstreetmap.de/routed-car"
    ]
    
    headers = {
        "User-Agent": "RutaViva/1.0 (contact: agenciamythf@gmail.com) Python/Httpx"
    }

    for base_url in servers:
        url = f"{base_url}/route/v1/driving/{coords}"
        params = {"overview": "full", "geometries": "geojson", "steps": "false"}
        try:
            async with httpx.AsyncClient(timeout=10.0, headers=headers) as client:
                resp = await client.get(url, params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("code") == "Ok" and data.get("routes"):
                        route = data["routes"][0]
                        return {
                            "distance_m": route["distance"],
                            "duration_s": route["duration"],
                            "geometry": route["geometry"],
                        }
                import logging
                logging.getLogger("rutaviva").warning(f"Ruteador: Fallo en servidor {base_url}: {resp.status_code}")
        except Exception:
            pass

    return None


def sample_route_points(geometry: dict, max_points: int = 25) -> list[tuple[float, float]]:
    """Tomar N puntos (lat, lon) a lo largo de la polyline."""
    coords = geometry.get("coordinates", [])
    if not coords:
        return []
    if len(coords) <= max_points:
        return [(c[1], c[0]) for c in coords]
    step = max(1, len(coords) // max_points)
    sampled = [coords[i] for i in range(0, len(coords), step)]
    if coords[-1] not in sampled:
        sampled.append(coords[-1])
    return [(c[1], c[0]) for c in sampled]
