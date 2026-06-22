"""Async HTTP client for the MSC GeoMet OGC API."""

from __future__ import annotations

import asyncio

import httpx

from ..config import (
    GEOMET_OGC_BASE,
    GEOMET_WMS_BASE,
    PAGE_LIMIT,
    REQUEST_TIMEOUT,
    USER_AGENT,
)


class GeoMetClient:
    def __init__(self) -> None:
        self._client = httpx.AsyncClient(
            base_url=GEOMET_OGC_BASE,
            timeout=REQUEST_TIMEOUT,
            headers={
                "User-Agent": USER_AGENT,
                "Accept": "application/geo+json",
            },
            follow_redirects=True,
        )
        # Separate client for the WMS endpoint (raster + GetFeatureInfo).
        self._wms = httpx.AsyncClient(
            base_url=GEOMET_WMS_BASE,
            timeout=REQUEST_TIMEOUT,
            headers={"User-Agent": USER_AGENT},
            follow_redirects=True,
        )

    async def close(self) -> None:
        await self._client.aclose()
        await self._wms.aclose()

    async def feature_info(self, layer: str, lon: float, lat: float) -> dict | None:
        """Query a single WMS layer's value at a lon/lat via GetFeatureInfo.

        Returns the first feature's ``properties`` (e.g. ``value`` + ``class``
        for CanSIPS seasonal probabilities), or ``None`` if nothing is returned.
        WMS 1.3.0 + EPSG:4326 uses lat,lon axis order in the bbox.
        """
        d = 0.5
        params = {
            "service": "WMS",
            "version": "1.3.0",
            "request": "GetFeatureInfo",
            "layers": layer,
            "query_layers": layer,
            "crs": "EPSG:4326",
            "bbox": f"{lat - d},{lon - d},{lat + d},{lon + d}",
            "width": "100",
            "height": "100",
            "i": "50",
            "j": "50",
            "info_format": "application/json",
        }
        try:
            resp = await self._wms.get("", params=params)
            resp.raise_for_status()
            data = resp.json()
        except (httpx.HTTPError, ValueError):
            return None
        features = data.get("features") or []
        if not features:
            return None
        return features[0].get("properties") or None

    async def _items_page(self, collection: str, params: dict) -> dict:
        resp = await self._client.get(
            f"/collections/{collection}/items", params=params
        )
        resp.raise_for_status()
        return resp.json()

    async def get_item(self, collection: str, item_id: str) -> dict:
        resp = await self._client.get(
            f"/collections/{collection}/items/{item_id}",
            params={"f": "json", "lang": "en"},
        )
        resp.raise_for_status()
        return resp.json()

    async def get_all_items(
        self,
        collection: str,
        extra_params: dict | None = None,
        page_limit: int = PAGE_LIMIT,
    ) -> list[dict]:
        """Fetch every feature in a collection.

        Reads the first page to learn ``numberMatched``, then fetches any
        remaining pages concurrently. Most collections we use fit in one page
        at ``PAGE_LIMIT`` (city-page returns all 844 at limit=1000).
        """
        params = {"f": "json", "lang": "en", "limit": page_limit, "offset": 0}
        if extra_params:
            params.update(extra_params)

        first = await self._items_page(collection, params)
        features: list[dict] = list(first.get("features") or [])
        matched = first.get("numberMatched")
        if not isinstance(matched, int):
            matched = len(features)

        offsets = list(range(page_limit, matched, page_limit))
        if offsets:
            async def fetch(offset: int) -> list[dict]:
                page_params = dict(params)
                page_params["offset"] = offset
                data = await self._items_page(collection, page_params)
                return data.get("features") or []

            pages = await asyncio.gather(*(fetch(o) for o in offsets))
            for page in pages:
                features.extend(page)
        return features


geomet = GeoMetClient()
