"""Shared, cached data loaders used by multiple routers.

The full city-page payload is large (~26 MB), so we fetch it once, cache the raw
features, and derive everything else (the slim station index, hub detail cards)
from that single cached copy instead of re-fetching.
"""

from __future__ import annotations

import asyncio

import httpx

from .cache import cache
from .config import (
    CANSIPS_PRECIP_ABOVE,
    CANSIPS_PRECIP_BELOW,
    CANSIPS_TEMP_ABOVE,
    CANSIPS_TEMP_BELOW,
    COLL_ALERTS,
    COLL_CITYPAGE,
    HUBS,
    TTL_ALERTS,
    TTL_BRIEFING,
    TTL_OUTLOOK,
    TTL_STATIONS,
)
from .geomet import normalize
from .geomet.client import geomet


async def station_summaries() -> list[dict]:
    """Slim marker per location. Paginated + page-discarded so the full ~26 MB
    city-page payload is never held in memory (Render free tier = 512 MB)."""

    def extract(features: list[dict]) -> list[dict]:
        out = []
        for f in features:
            s = normalize.station_summary(f)
            if s is not None:
                out.append(s.model_dump())
        return out

    async def factory() -> list[dict]:
        return await geomet.map_pages(COLL_CITYPAGE, extract)

    return await cache.get_or_set("stations", TTL_STATIONS, factory)


async def alerts_all() -> dict:
    async def factory() -> dict:
        features = await geomet.get_all_items(COLL_ALERTS)
        return normalize.alerts_collection(features)

    return await cache.get_or_set("alerts:all", TTL_ALERTS, factory)


def _resolve_hub_id(summaries: list[dict], hub: dict) -> str | None:
    """Resolve a hub (name + province) to a station id using the slim summaries.

    Prefer an exact name+province match (so 'Calgary' beats 'Calgary (Olympic
    Park)' and 'Vancouver' beats 'West Vancouver'); fall back to a contains match.
    """
    target = hub["name"].strip().lower()
    province = hub.get("province")
    fallback: str | None = None
    for s in summaries:
        name = (s.get("name") or "").lower()
        same_province = province is None or s.get("province") == province
        if name == target and same_province:
            return s["id"]
        if fallback is None and same_province and target in name:
            fallback = s["id"]
    return fallback


async def _hub_detail(station_id: str) -> dict:
    feature = await geomet.get_item(COLL_CITYPAGE, station_id)
    detail = normalize.station_detail(feature).model_dump()
    detail.pop("hourly", None)  # not needed for hub cards / trend
    return detail


async def hub_details() -> list[dict]:
    """Trimmed detail (current + 7-day, no hourly) for each configured hub.

    Resolves each hub to a station id via the cached slim summaries, then
    fetches that one city's detail — a handful of small requests instead of
    holding the full 26 MB payload."""

    async def factory() -> list[dict]:
        summaries = await station_summaries()
        ids = [sid for hub in HUBS if (sid := _resolve_hub_id(summaries, hub))]
        details = await asyncio.gather(
            *(_hub_detail(sid) for sid in ids), return_exceptions=True
        )
        return [d for d in details if isinstance(d, dict)]

    return await cache.get_or_set("hubs:details", TTL_BRIEFING, factory)


# --- seasonal outlook (CanSIPS via WMS GetFeatureInfo) -----------------------


def _classify(above: float | None, below: float | None, warm: str, cool: str) -> dict:
    a = above or 0.0
    b = below or 0.0
    near = max(0.0, 100.0 - a - b)
    label, prob = max(
        [(warm, a), ("near normal", near), (cool, b)], key=lambda c: c[1]
    )
    return {"label": label, "probability": round(prob)}


async def _seasonal_for_point(lon: float, lat: float) -> dict:
    ta, tb, pa, pb = await asyncio.gather(
        geomet.feature_info(CANSIPS_TEMP_ABOVE, lon, lat),
        geomet.feature_info(CANSIPS_TEMP_BELOW, lon, lat),
        geomet.feature_info(CANSIPS_PRECIP_ABOVE, lon, lat),
        geomet.feature_info(CANSIPS_PRECIP_BELOW, lon, lat),
    )

    def val(props: dict | None) -> float | None:
        if not props:
            return None
        try:
            return float(props.get("value"))
        except (TypeError, ValueError):
            return None

    period = (ta or {}).get("time") or (pa or {}).get("time")
    return {
        "temperature": _classify(val(ta), val(tb), "warmer", "cooler"),
        "precipitation": _classify(val(pa), val(pb), "wetter", "drier"),
        "period": period,
    }


def _outlook_entry(detail: dict, seasonal: dict) -> dict:
    return {
        "id": detail["id"],
        "name": detail["name"],
        "province": detail["province"],
        "lat": detail["lat"],
        "lon": detail["lon"],
        "daily": detail["daily"],
        "current": detail["current"],
        "seasonal": seasonal,
    }


async def outlook_for_station(station_id: str) -> dict | None:
    """7-day + seasonal outlook for any single city-page station (by id)."""

    async def factory() -> dict | None:
        try:
            feature = await geomet.get_item(COLL_CITYPAGE, station_id)
        except httpx.HTTPStatusError:
            return None
        detail = normalize.station_detail(feature).model_dump()
        seasonal = await _seasonal_for_point(detail["lon"], detail["lat"])
        return _outlook_entry(detail, seasonal)

    return await cache.get_or_set(
        f"outlook:station:{station_id}", TTL_OUTLOOK, factory
    )


async def outlook() -> dict:
    async def factory() -> dict:
        hubs = await hub_details()
        seasonal = await asyncio.gather(
            *(_seasonal_for_point(h["lon"], h["lat"]) for h in hubs)
        )
        period = next((s["period"] for s in seasonal if s.get("period")), None)
        return {
            "hubs": [_outlook_entry(h, s) for h, s in zip(hubs, seasonal)],
            "period": period,
            "source": "Environment Canada CanSIPS seasonal model",
        }

    return await cache.get_or_set("outlook", TTL_OUTLOOK, factory)
