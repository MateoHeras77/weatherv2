"""Weatherv2 backend — FastAPI app exposing normalized MSC GeoMet data.

Endpoints (all under ``/api``):
  GET /api/stations            all ~844 city-page locations (slim markers)
  GET /api/stations/{id}       full detail: current, 24h hourly, multi-day, sun, normals
  GET /api/alerts[?bbox=]      active weather alerts as GeoJSON polygons + summary
  GET /api/aqhi                latest Air Quality Health Index per location
  GET /api/wms/layers          curated raster overlay catalog (radar, model, satellite…)
  GET /api/briefing            manager digest: active alerts + key-hub conditions
  GET /api/outlook             per-hub 7-day trend + CanSIPS seasonal outlook
  GET /api/marine              marine forecast features
  GET /api/hurricanes          active tropical-cyclone tracks + error cones
  GET /api/health              liveness probe
"""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import CORS_ORIGINS
from .geomet.client import geomet
from .routers import alerts, aqhi, briefing, outlook, overlays, stations
from .services import alerts_all, station_summaries

log = logging.getLogger("weatherv2")


async def _warm_cache() -> None:
    """Pre-fetch the heavy station index + alerts so the first user request is
    instant. Failures are non-fatal — endpoints will fetch lazily instead."""
    try:
        await asyncio.gather(station_summaries(), alerts_all())
        log.info("Cache warmed (stations + alerts)")
    except Exception as exc:  # pragma: no cover - best effort
        log.warning("Cache warmup failed (will fetch lazily): %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    warm = asyncio.create_task(_warm_cache())
    try:
        yield
    finally:
        warm.cancel()
        await geomet.close()


app = FastAPI(
    title="Weatherv2 GeoMet API",
    version="1.0.0",
    description="Normalized Environment Canada (MSC GeoMet) weather for planners.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stations.router)
app.include_router(alerts.router)
app.include_router(aqhi.router)
app.include_router(overlays.router)
app.include_router(briefing.router)
app.include_router(outlook.router)


@app.get("/api/health", tags=["meta"])
async def health() -> dict:
    return {"status": "ok", "service": "weatherv2-backend"}
