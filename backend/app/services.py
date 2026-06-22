"""Shared, cached data loaders used by multiple routers.

The full city-page payload is large (~26 MB), so we fetch it once, cache the raw
features, and derive everything else (the slim station index, hub detail cards)
from that single cached copy instead of re-fetching.
"""

from __future__ import annotations

import asyncio

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


async def raw_features() -> list[dict]:
    """All city-page GeoJSON features (cached once; everything derives from this)."""
    return await cache.get_or_set(
        "stations:raw", TTL_STATIONS, lambda: geomet.get_all_items(COLL_CITYPAGE)
    )


async def station_summaries() -> list[dict]:
    async def factory() -> list[dict]:
        features = await raw_features()
        summaries = (normalize.station_summary(f) for f in features)
        return [s.model_dump() for s in summaries if s is not None]

    return await cache.get_or_set("stations", TTL_STATIONS, factory)


async def alerts_all() -> dict:
    async def factory() -> dict:
        features = await geomet.get_all_items(COLL_ALERTS)
        return normalize.alerts_collection(features)

    return await cache.get_or_set("alerts:all", TTL_ALERTS, factory)


def _match_hub(features: list[dict], hub: dict) -> dict | None:
    """Resolve a hub (name + province) to a city-page feature.

    Prefer an exact name+province match (so 'Calgary' beats 'Calgary (Olympic
    Park)' and 'Vancouver' beats 'West Vancouver'); fall back to a contains match.
    """
    target = hub["name"].strip().lower()
    province = hub.get("province")
    fallback: dict | None = None
    for feature in features:
        summary = normalize.station_summary(feature)
        if summary is None:
            continue
        name = summary.name.lower()
        same_province = province is None or summary.province == province
        if name == target and same_province:
            return feature
        if fallback is None and same_province and target in name:
            fallback = feature
    return fallback


async def hub_details() -> list[dict]:
    """Trimmed detail (current + 7-day, no hourly) for each configured hub."""

    async def factory() -> list[dict]:
        features = await raw_features()
        out: list[dict] = []
        for hub in HUBS:
            feature = _match_hub(features, hub)
            if feature is None:
                continue
            detail = normalize.station_detail(feature).model_dump()
            detail.pop("hourly", None)  # not needed for hub cards / trend
            out.append(detail)
        return out

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
        features = await raw_features()
        feature = next(
            (f for f in features if str(f.get("id")) == station_id), None
        )
        if feature is None:
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
