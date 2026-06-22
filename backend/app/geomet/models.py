"""Provider-independent DTOs returned by the API.

GeoMet's city-page payload is deeply nested and bilingual
(``temperature.value.en``, ``wind.speed.units.en`` …). These flat English
models are what the frontend actually consumes; the messy shape stops at
``normalize.py``.
"""

from __future__ import annotations

from pydantic import BaseModel


class StationSummary(BaseModel):
    """Lightweight record for the map / search index (one per location)."""

    id: str
    name: str
    region: str | None = None
    province: str | None = None
    lat: float
    lon: float
    temperature: float | None = None
    condition: str | None = None
    iconCode: int | None = None
    hasWarning: bool = False
    alertLevel: str | None = None  # warning | watch | advisory | statement | None
    observedAt: str | None = None


class CurrentConditions(BaseModel):
    temperature: float | None = None
    feelsLike: float | None = None  # wind chill or humidex, whichever is active
    dewpoint: float | None = None
    humidity: float | None = None
    pressureKpa: float | None = None
    pressureTendency: str | None = None
    windSpeed: float | None = None
    windGust: float | None = None
    windDirection: str | None = None
    windBearing: float | None = None
    windChill: float | None = None
    humidex: float | None = None
    visibilityKm: float | None = None
    condition: str | None = None
    iconCode: int | None = None
    observedAt: str | None = None
    stationName: str | None = None


class HourlyForecast(BaseModel):
    time: str | None = None
    temperature: float | None = None
    condition: str | None = None
    iconCode: int | None = None
    pop: float | None = None  # probability of precipitation (%)
    windSpeed: float | None = None
    windDirection: str | None = None


class DailyForecast(BaseModel):
    period: str
    temperature: float | None = None
    temperatureClass: str | None = None  # "high" | "low"
    iconCode: int | None = None
    summary: str | None = None
    pop: float | None = None
    night: bool = False


class Warning(BaseModel):
    type: str | None = None
    description: str | None = None
    priority: str | None = None
    url: str | None = None


class SunInfo(BaseModel):
    sunrise: str | None = None
    sunset: str | None = None


class Normals(BaseModel):
    summary: str | None = None
    high: float | None = None
    low: float | None = None


class StationDetail(BaseModel):
    id: str
    name: str
    region: str | None = None
    province: str | None = None
    lat: float
    lon: float
    url: str | None = None
    lastUpdated: str | None = None
    current: CurrentConditions
    hourly: list[HourlyForecast]
    daily: list[DailyForecast]
    sun: SunInfo
    normals: Normals
    warnings: list[Warning]
