"""Map overlays: the WMS layer catalog plus marine & hurricane passthroughs."""

from __future__ import annotations

from fastapi import APIRouter

from ..cache import cache
from ..config import (
    COLL_HURR_CONE,
    COLL_HURR_TRACK,
    COLL_MARINE,
    GEOMET_WMS_BASE,
    TTL_HURRICANES,
    TTL_MARINE,
    WMS_LAYERS,
)
from ..geomet.client import geomet

router = APIRouter(prefix="/api", tags=["overlays"])


@router.get("/wms/layers")
async def wms_layers() -> dict:
    """Curated raster overlay catalog. The browser fetches tiles from
    ``wmsBase`` directly; we only describe the available layers + legends."""
    return {
        "wmsBase": GEOMET_WMS_BASE,
        "crs": "EPSG:3857",
        "layers": WMS_LAYERS,
    }


@router.get("/marine")
async def marine() -> dict:
    async def factory() -> dict:
        features = await geomet.get_all_items(COLL_MARINE)
        return {"type": "FeatureCollection", "features": features}

    collection = await cache.get_or_set("marine", TTL_MARINE, factory)
    return {**collection, "count": len(collection.get("features", []))}


@router.get("/hurricanes")
async def hurricanes() -> dict:
    """Active tropical cyclone tracks + error cones (empty outside season)."""

    async def factory() -> dict:
        tracks = await geomet.get_all_items(COLL_HURR_TRACK)
        cones = await geomet.get_all_items(COLL_HURR_CONE)
        return {
            "tracks": {"type": "FeatureCollection", "features": tracks},
            "cones": {"type": "FeatureCollection", "features": cones},
        }

    data = await cache.get_or_set("hurricanes", TTL_HURRICANES, factory)
    return {
        **data,
        "active": bool(data.get("tracks", {}).get("features"))
        or bool(data.get("cones", {}).get("features")),
    }
