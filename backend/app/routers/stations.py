"""Station endpoints: the slim map/search index and per-station detail."""

from __future__ import annotations

import httpx
from fastapi import APIRouter, HTTPException

from ..cache import cache
from ..config import COLL_CITYPAGE, TTL_STATION_DETAIL
from ..geomet import normalize
from ..geomet.client import geomet
from ..services import station_summaries

router = APIRouter(prefix="/api", tags=["stations"])


@router.get("/stations")
async def list_stations() -> dict:
    """All ~844 Canadian city-page locations as lightweight markers."""
    stations = await station_summaries()
    return {
        "count": len(stations),
        "ageSeconds": cache.age_seconds("stations"),
        "stations": stations,
    }


@router.get("/stations/{station_id}")
async def station_detail(station_id: str) -> dict:
    async def factory() -> dict:
        feature = await geomet.get_item(COLL_CITYPAGE, station_id)
        return normalize.station_detail(feature).model_dump()

    try:
        return await cache.get_or_set(
            f"station:{station_id}", TTL_STATION_DETAIL, factory
        )
    except httpx.HTTPStatusError as exc:
        status = exc.response.status_code
        if status == 404:
            raise HTTPException(status_code=404, detail="Station not found") from exc
        raise HTTPException(status_code=502, detail="Upstream GeoMet error") from exc
