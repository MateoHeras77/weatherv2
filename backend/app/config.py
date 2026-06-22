"""Static configuration for the Weatherv2 backend.

All upstream data comes from MSC GeoMet (Environment and Climate Change Canada):
  * OGC API (vector / JSON)  -> https://api.weather.gc.ca
  * WMS    (raster overlays) -> https://geo.weather.gc.ca/geomet
Both are free and require no API key. English is requested everywhere.
"""

from __future__ import annotations

# --- Upstream endpoints ------------------------------------------------------
GEOMET_OGC_BASE = "https://api.weather.gc.ca"
GEOMET_WMS_BASE = "https://geo.weather.gc.ca/geomet"

# --- Collection ids ----------------------------------------------------------
COLL_CITYPAGE = "citypageweather-realtime"
COLL_ALERTS = "weather-alerts"
COLL_AQHI_OBS = "aqhi-observations-realtime"
COLL_AQHI_FCST = "aqhi-forecasts-realtime"
COLL_MARINE = "marineweather-realtime"
COLL_HURR_TRACK = "hurricanes-track-realtime"
COLL_HURR_CONE = "hurricanes-error_cone-realtime"

# --- HTTP --------------------------------------------------------------------
USER_AGENT = "Weatherv2-Planner/1.0 (operational weather dashboard)"
REQUEST_TIMEOUT = 30.0
# citypageweather returns all 844 locations in a single request at this limit.
PAGE_LIMIT = 1000

# --- Cache TTLs (seconds) ----------------------------------------------------
TTL_STATIONS = 300
TTL_STATION_DETAIL = 300
TTL_ALERTS = 120
TTL_AQHI = 600
TTL_MARINE = 900
TTL_HURRICANES = 900

# --- CORS (Vite dev server) --------------------------------------------------
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
]


def _legend(layer: str) -> str:
    return (
        f"{GEOMET_WMS_BASE}?service=WMS&version=1.3.0&request=GetLegendGraphic"
        f"&sld_version=1.1.0&layer={layer}&format=image/png"
    )


# --- Curated WMS overlay catalog (rendered as raster tiles by the frontend) ---
# Each entry maps to a GeoMet WMS layer. The frontend builds GetMap tile URLs
# against GEOMET_WMS_BASE; `legend` points at GetLegendGraphic for that layer.
# Every layer below was verified to render real PNG tiles against the live
# service (GeoMet renamed several model layers, breaking the old GDPS.* ids).
WMS_LAYERS: list[dict] = [
    {
        "id": "radar",
        "layer": "RADAR_1KM_RRAI",
        "title": "Radar — Precipitation",
        "category": "Precipitation",
        "description": "1 km national radar mosaic — shows both rain and snow (latest frame).",
        "legend": _legend("RADAR_1KM_RRAI"),
        "defaultOpacity": 0.7,
    },
    {
        "id": "precip-24h",
        "layer": "GDPS_15km_Precip-Accum24h",
        "title": "Precipitation — next 24 h",
        "category": "Precipitation",
        "description": "Forecast total precipitation accumulation over the next 24 hours.",
        "legend": _legend("GDPS_15km_Precip-Accum24h"),
        "defaultOpacity": 0.6,
    },
    {
        "id": "lightning",
        "layer": "Lightning_2.5km_Density",
        "title": "Lightning — active storms",
        "category": "Severe",
        "description": "Cloud-to-ground lightning density. Usually empty — only active thunderstorms appear.",
        "legend": _legend("Lightning_2.5km_Density"),
        "defaultOpacity": 0.85,
    },
]

# --- CanSIPS seasonal layers (queried per point via WMS GetFeatureInfo) -------
CANSIPS_TEMP_ABOVE = "CanSIPS_100km_AirTemp-ProbAboveNormal-2m"
CANSIPS_TEMP_BELOW = "CanSIPS_100km_AirTemp-ProbBelowNormal-2m"
CANSIPS_PRECIP_ABOVE = "CanSIPS_100km_PrecipAccum-ProbAboveNormal-2m"
CANSIPS_PRECIP_BELOW = "CanSIPS_100km_PrecipAccum-ProbBelowNormal-2m"

# --- Key planning hubs (resolved to city-page stations by name match) ---------
# Major Canadian metros / network hubs. Edit freely — order is the display order.
HUBS: list[dict] = [
    {"name": "Vancouver", "province": "BC"},
    {"name": "Calgary", "province": "AB"},
    {"name": "Edmonton", "province": "AB"},
    {"name": "Saskatoon", "province": "SK"},
    {"name": "Regina", "province": "SK"},
    {"name": "Winnipeg", "province": "MB"},
    {"name": "Thunder Bay", "province": "ON"},
    {"name": "Toronto", "province": "ON"},
    {"name": "Ottawa (Kanata - Orléans)", "province": "ON"},
    {"name": "Montréal", "province": "QC"},
    {"name": "Québec", "province": "QC"},
    {"name": "Halifax", "province": "NS"},
    {"name": "Moncton", "province": "NB"},
    {"name": "St. John's", "province": "NL"},
]

# --- Cache TTLs for the new aggregated views ---------------------------------
TTL_BRIEFING = 300
TTL_OUTLOOK = 3600  # seasonal data updates monthly; 7-day part rides station cache
