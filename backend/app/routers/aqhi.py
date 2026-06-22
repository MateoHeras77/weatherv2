"""Air Quality Health Index (AQHI) — latest observation per location."""

from __future__ import annotations

from fastapi import APIRouter

from ..cache import cache
from ..config import COLL_AQHI_OBS, TTL_AQHI
from ..geomet import normalize
from ..geomet.client import geomet

router = APIRouter(prefix="/api", tags=["aqhi"])


@router.get("/aqhi")
async def aqhi() -> dict:
    async def factory() -> list[dict]:
        features = await geomet.get_all_items(
            COLL_AQHI_OBS, extra_params={"latest": "true"}
        )
        points = (normalize.aqhi_point(f) for f in features)
        return [p for p in points if p is not None and p.get("aqhi") is not None]

    points = await cache.get_or_set("aqhi", TTL_AQHI, factory)
    return {
        "count": len(points),
        "ageSeconds": cache.age_seconds("aqhi"),
        "points": points,
    }
