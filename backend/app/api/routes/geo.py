from fastapi import APIRouter, Query

from app.services.georef import geocode, reverse_geocode, search_localities

router = APIRouter(prefix="/geo", tags=["geo"])


@router.get("/geocode")
async def geocode_endpoint(q: str = Query(..., min_length=3, max_length=255)):
    return {"results": await geocode(q)}


@router.get("/localities")
async def localities_endpoint(q: str = Query(..., min_length=2, max_length=120)):
    """Busca localidades / municipios por nombre. Usado por la barra flotante
    de /mapa y /ruta para volar el mapa a una zona con zoom."""
    return {"results": await search_localities(q)}


@router.get("/reverse")
async def reverse_endpoint(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
):
    return await reverse_geocode(lat, lon) or {}
