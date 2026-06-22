"""Weather alerts: normalized GeoJSON polygons plus a severity summary."""

from __future__ import annotations

from fastapi import APIRouter, Query

from ..cache import cache
from ..config import COLL_ALERTS, TTL_ALERTS
from ..geomet import normalize
from ..geomet.client import geomet

router = APIRouter(prefix="/api", tags=["alerts"])


@router.get("/alerts")
async def alerts(
    bbox: str | None = Query(
        default=None,
        description="Optional 'minLon,minLat,maxLon,maxLat' spatial filter.",
    ),
) -> dict:
    key = f"alerts:{bbox or 'all'}"

    async def factory() -> dict:
        extra = {"bbox": bbox} if bbox else None
        features = await geomet.get_all_items(COLL_ALERTS, extra_params=extra)
        return normalize.alerts_collection(features)

    collection = await cache.get_or_set(key, TTL_ALERTS, factory)
    return {**collection, "ageSeconds": cache.age_seconds(key)}
