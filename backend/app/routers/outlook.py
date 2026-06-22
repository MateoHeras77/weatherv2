"""Forecast outlook: per-hub 7-day trend + CanSIPS seasonal classification."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ..cache import cache
from ..services import outlook as build_outlook
from ..services import outlook_for_station

router = APIRouter(prefix="/api", tags=["outlook"])


@router.get("/outlook")
async def outlook() -> dict:
    data = await build_outlook()
    return {**data, "ageSeconds": cache.age_seconds("outlook")}


@router.get("/outlook/station/{station_id}")
async def outlook_station(station_id: str) -> dict:
    data = await outlook_for_station(station_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Station not found")
    return data
