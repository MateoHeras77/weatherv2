"""Manager briefing: active alerts list + key-hub conditions in one payload."""

from __future__ import annotations

from fastapi import APIRouter

from ..cache import cache
from ..services import alerts_all, hub_details

router = APIRouter(prefix="/api", tags=["briefing"])


@router.get("/briefing")
async def briefing() -> dict:
    alerts = await alerts_all()
    hubs = await hub_details()
    return {
        "alerts": alerts,
        "hubs": hubs,
        "ageSeconds": cache.age_seconds("hubs:details"),
    }
