"""Translate GeoMet GeoJSON features into the flat DTOs in ``models.py``.

GeoMet wraps almost every leaf as ``{"value": {"en": X, "fr": Y}}`` with sibling
``units``/``class``/``qaValue`` objects. The helpers below pick the English leaf
defensively so a missing branch yields ``None`` instead of raising.
"""

from __future__ import annotations

from typing import Any

from .models import (
    CurrentConditions,
    DailyForecast,
    HourlyForecast,
    Normals,
    StationDetail,
    StationSummary,
    SunInfo,
    Warning,
)

# --- leaf helpers ------------------------------------------------------------


def _en(value: Any) -> Any:
    """Pick the English variant of a bilingual leaf; pass through scalars."""
    if isinstance(value, dict):
        return value.get("en")
    return value


def _val(node: Any) -> Any:
    """``{"value": {"en": X}}`` -> X. Also handles ``{"value": X}``."""
    if not isinstance(node, dict):
        return None
    return _en(node.get("value"))


def _num(node: Any) -> float | None:
    raw = _val(node)
    if raw is None or raw == "":
        return None
    try:
        return float(raw)
    except (TypeError, ValueError):
        return None


def _int(node: Any) -> int | None:
    raw = _val(node)
    try:
        return int(raw) if raw is not None and raw != "" else None
    except (TypeError, ValueError):
        return None


def _text(value: Any) -> str | None:
    out = _en(value)
    if out is None:
        return None
    out = str(out).strip()
    return out or None


def _province_from_id(feature_id: Any) -> str | None:
    if isinstance(feature_id, str) and "-" in feature_id:
        return feature_id.split("-", 1)[0].upper()
    return None


def _coords(feature: dict) -> tuple[float, float] | None:
    geometry = feature.get("geometry") or {}
    coords = geometry.get("coordinates") or []
    if len(coords) < 2:
        return None
    try:
        return float(coords[0]), float(coords[1])  # lon, lat
    except (TypeError, ValueError):
        return None


def _has_warning(warnings: Any) -> bool:
    if isinstance(warnings, list):
        return any(bool(w) for w in warnings)
    if isinstance(warnings, dict):
        events = warnings.get("events") or warnings.get("event")
        return bool(events)
    return False


def _warnings_list(warnings: Any) -> list[Warning]:
    """The embedded city-page ``warnings`` is a short flag; the authoritative
    alert text comes from the dedicated weather-alerts collection (``/api/alerts``)."""
    out: list[Warning] = []
    if isinstance(warnings, dict):
        base_url = _en(warnings.get("url"))
        events = warnings.get("events") or warnings.get("event") or []
        if isinstance(events, dict):
            events = [events]
        for event in events:
            if not isinstance(event, dict):
                continue
            out.append(
                Warning(
                    type=_text(event.get("type")) or _text(event.get("description")),
                    description=_text(event.get("description")),
                    priority=_text(event.get("priority")),
                    url=base_url,
                )
            )
    elif isinstance(warnings, list):
        for event in warnings:
            if not isinstance(event, dict):
                continue
            out.append(
                Warning(
                    type=_text(event.get("type")) or "Weather warning",
                    description=_text(event.get("description")),
                    priority=_text(event.get("priority")),
                    url=_en(event.get("url")),
                )
            )
    return out


# Highest-severity embedded alert type for a station, so the map marker ring
# can reflect warning vs advisory vs statement (instead of "red = any alert").
_ALERT_SEVERITY = {"warning": 3, "watch": 2, "advisory": 1, "statement": 0}


def _alert_level(warnings: Any) -> str | None:
    if isinstance(warnings, dict):
        events = warnings.get("events") or warnings.get("event") or []
        if isinstance(events, dict):
            events = [events]
        if not events:
            events = [warnings]
    elif isinstance(warnings, list):
        events = warnings
    else:
        return None

    best: str | None = None
    best_rank = -1
    for event in events:
        if not isinstance(event, dict):
            continue
        kind = _text(event.get("type"))
        if not kind:
            continue
        kind = kind.lower()
        rank = _ALERT_SEVERITY.get(kind, 0)
        if rank > best_rank:
            best_rank = rank
            best = kind
    return best


# --- summary (map / search) --------------------------------------------------


def station_summary(feature: dict) -> StationSummary | None:
    coords = _coords(feature)
    if coords is None:
        return None
    lon, lat = coords
    props = feature.get("properties") or {}
    current = props.get("currentConditions") or {}
    return StationSummary(
        id=str(feature.get("id")),
        name=_text(props.get("name")) or "Unknown",
        region=_text(props.get("region")),
        province=_province_from_id(feature.get("id")),
        lat=lat,
        lon=lon,
        temperature=_num(current.get("temperature")),
        condition=_text(current.get("condition")),
        iconCode=_int(current.get("iconCode")),
        hasWarning=_has_warning(props.get("warnings")),
        alertLevel=_alert_level(props.get("warnings")),
        observedAt=_en((current.get("timestamp") or {})),
    )


# --- detail ------------------------------------------------------------------


def _current(props: dict) -> CurrentConditions:
    cc = props.get("currentConditions") or {}
    wind = cc.get("wind") or {}
    temperature = _num(cc.get("temperature"))
    wind_chill = _num(cc.get("windChill"))
    humidex = _num(cc.get("humidex"))
    # Environment Canada only reports wind chill in the cold and humidex in the
    # heat, but the raw field can carry a stale value (e.g. a -3 wind chill on a
    # 22 deg day). Drop values that are not physically applicable.
    if wind_chill is not None and (
        temperature is None or temperature > 10 or wind_chill >= temperature
    ):
        wind_chill = None
    if humidex is not None and (
        temperature is None or temperature < 20 or humidex <= temperature
    ):
        humidex = None
    feels_like = wind_chill if wind_chill is not None else humidex
    pressure = cc.get("pressure") or {}
    return CurrentConditions(
        temperature=temperature,
        feelsLike=feels_like,
        dewpoint=_num(cc.get("dewpoint")),
        humidity=_num(cc.get("relativeHumidity")),
        pressureKpa=_num(pressure),
        pressureTendency=_text(pressure.get("tendency")),
        windSpeed=_num(wind.get("speed")),
        windGust=_num(wind.get("gust")),
        windDirection=_val(wind.get("direction")),
        windBearing=_num(wind.get("bearing")),
        windChill=wind_chill,
        humidex=humidex,
        visibilityKm=_num(cc.get("visibility")),
        condition=_text(cc.get("condition")),
        iconCode=_int(cc.get("iconCode")),
        observedAt=_en(cc.get("timestamp")),
        stationName=_val(cc.get("station")),
    )


def _hourly(props: dict) -> list[HourlyForecast]:
    group = props.get("hourlyForecastGroup") or {}
    out: list[HourlyForecast] = []
    for hour in group.get("hourlyForecasts") or []:
        wind = hour.get("wind") or {}
        out.append(
            HourlyForecast(
                time=hour.get("timestamp"),
                temperature=_num(hour.get("temperature")),
                condition=_text(hour.get("condition")),
                iconCode=_int(hour.get("iconCode")),
                pop=_num(hour.get("lop")),
                windSpeed=_num(wind.get("speed")),
                windDirection=_val(wind.get("direction")),
            )
        )
    return out


def _daily(props: dict) -> list[DailyForecast]:
    group = props.get("forecastGroup") or {}
    out: list[DailyForecast] = []
    for fc in group.get("forecasts") or []:
        period_name = _text((fc.get("period") or {}).get("textForecastName")) or "—"
        temps = (fc.get("temperatures") or {}).get("temperature") or []
        first = temps[0] if temps else {}
        abbreviated = fc.get("abbreviatedForecast") or {}
        out.append(
            DailyForecast(
                period=period_name,
                temperature=_num(first),
                temperatureClass=_text(first.get("class")) if isinstance(first, dict) else None,
                iconCode=_int(abbreviated.get("icon")),
                summary=_text(fc.get("textSummary")),
                pop=_num(abbreviated.get("pop")),
                night="night" in period_name.lower(),
            )
        )
    return out


def _sun(props: dict) -> SunInfo:
    rise_set = props.get("riseSet") or {}
    return SunInfo(
        sunrise=_text(rise_set.get("sunrise")),
        sunset=_text(rise_set.get("sunset")),
    )


def _normals(props: dict) -> Normals:
    normals = (props.get("forecastGroup") or {}).get("regionalNormals") or {}
    high = low = None
    for temp in normals.get("temperature") or []:
        cls = _text(temp.get("class"))
        value = _num(temp)
        if cls == "high":
            high = value
        elif cls == "low":
            low = value
    return Normals(summary=_text(normals.get("textSummary")), high=high, low=low)


def station_detail(feature: dict) -> StationDetail:
    props = feature.get("properties") or {}
    coords = _coords(feature) or (0.0, 0.0)
    lon, lat = coords
    return StationDetail(
        id=str(feature.get("id")),
        name=_text(props.get("name")) or "Unknown",
        region=_text(props.get("region")),
        province=_province_from_id(feature.get("id")),
        lat=lat,
        lon=lon,
        url=_en(props.get("url")),
        lastUpdated=_en(props.get("lastUpdated")),
        current=_current(props),
        hourly=_hourly(props),
        daily=_daily(props),
        sun=_sun(props),
        normals=_normals(props),
        warnings=_warnings_list(props.get("warnings")),
    )


# --- alerts ------------------------------------------------------------------

# Coarse severity ranking used for map colour + sorting. Higher = worse.
_ALERT_RANK = {"warning": 3, "watch": 2, "advisory": 1, "statement": 0}


def _alert_rank(alert_type: str | None, risk_colour: str | None) -> int:
    base = _ALERT_RANK.get((alert_type or "").lower(), 0)
    if (risk_colour or "").lower() == "red":
        base = max(base, 3)
    return base


def alert_feature(feature: dict) -> dict:
    props = feature.get("properties") or {}
    alert_type = props.get("alert_type")
    risk_colour = props.get("risk_colour_en")
    return {
        "type": "Feature",
        "geometry": feature.get("geometry"),
        "properties": {
            "id": props.get("id") or feature.get("id"),
            "name": props.get("alert_name_en"),
            "shortName": props.get("alert_short_name_en"),
            "code": props.get("alert_code"),
            "alertType": alert_type,
            "riskColour": risk_colour,
            "impact": props.get("impact_en"),
            "confidence": props.get("confidence_en"),
            "status": props.get("status_en"),
            "province": props.get("province"),
            "area": props.get("feature_name_en"),
            "published": props.get("publication_datetime"),
            "expires": props.get("expiration_datetime"),
            "eventEnd": props.get("event_end_datetime"),
            "text": props.get("alert_text_en"),
            "rank": _alert_rank(alert_type, risk_colour),
        },
    }


def alerts_collection(features: list[dict]) -> dict:
    out = [alert_feature(f) for f in features if f.get("geometry")]
    by_type: dict[str, int] = {}
    by_colour: dict[str, int] = {}
    for feat in out:
        p = feat["properties"]
        key = (p.get("alertType") or "other").lower()
        by_type[key] = by_type.get(key, 0) + 1
        colour = (p.get("riskColour") or "unknown").lower()
        by_colour[colour] = by_colour.get(colour, 0) + 1
    return {
        "type": "FeatureCollection",
        "features": out,
        "summary": {
            "total": len(out),
            "byType": by_type,
            "byColour": by_colour,
        },
    }


# --- AQHI --------------------------------------------------------------------


def _aqhi_category(value: float | None) -> str:
    if value is None:
        return "Unknown"
    if value <= 3:
        return "Low"
    if value <= 6:
        return "Moderate"
    if value <= 10:
        return "High"
    return "Very High"


def aqhi_point(feature: dict) -> dict | None:
    coords = _coords(feature)
    if coords is None:
        return None
    lon, lat = coords
    props = feature.get("properties") or {}
    raw = props.get("aqhi")
    try:
        value = round(float(raw), 1) if raw is not None else None
    except (TypeError, ValueError):
        value = None
    return {
        "id": props.get("id"),
        "location": props.get("location_name_en"),
        "locationId": props.get("location_id"),
        "lat": lat,
        "lon": lon,
        "aqhi": value,
        "category": _aqhi_category(value),
        "observedAt": props.get("observation_datetime"),
        "observedText": props.get("observation_datetime_text_en"),
    }
