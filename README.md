# Weatherv2 — Canadian Weather Planner

A map-first operational weather dashboard for planners, built on the free
**MSC GeoMet** API from Environment and Climate Change Canada
(`api.weather.gc.ca`). It shows **current conditions**, **multi-day forecasts**,
and **active weather alerts** across every Canadian city-page location (~844),
plus radar, air quality, model, and satellite overlays.

![Weatherv2](docs/screenshot.png)

Three views via the top navigation: **Map**, **Briefing**, and **Outlook**.

### Map
- **Map-first**: every one of the ~844 stations on an interactive MapLibre map,
  clustered and coloured by temperature, with a red ring on locations under an alert.
- **Weather alerts**: official Environment Canada alert polygons coloured by risk,
  click-through to the full warning text; a legend explains that alerts appear only
  where a hazard is currently active.
- **Station detail panel**: current conditions (temp, feels-like, wind + gusts,
  humidity, pressure + tendency, dew point, visibility), a 24-hour temperature &
  precipitation chart, a multi-day extended forecast, sunrise/sunset, and seasonal normals.
- **Raster overlays (WMS)**: precipitation radar, 24 h precipitation forecast,
  surface air temperature (HRDPS), lightning, GOES satellite, and the seasonal
  temperature outlook — each with a legend and opacity control.
- **Air Quality (AQHI)**: latest index per location, with a legend explaining the
  1–3 Low → 10+ Very High health-risk scale.
- **Search** any Canadian city/province with autocomplete, and **auto-refresh**
  with a last-updated indicator.

### Briefing (manager digest)
- KPI strip (active alerts by severity, hubs tracked).
- **Readable active-alerts list** — type, area, "until" time, expandable full text,
  and "view on map" to jump to the affected area.
- **Key-hub cards** — current conditions + a 5-day forecast for major Canadian hubs.

### Outlook (next weeks)
- Per-hub **7-day** trend plus a **seasonal outlook** from Environment Canada's
  **CanSIPS** model: plain-language "warmer/cooler" and "wetter/drier than normal"
  with the model's confidence.

## Architecture

```
Weatherv2/
  backend/    FastAPI (uv) — proxies, normalizes & caches MSC GeoMet
  frontend/   React + Vite + TypeScript + Tailwind + MapLibre GL
```

The backend flattens GeoMet's deeply-nested, bilingual GeoJSON into clean
English DTOs and caches them (in-memory TTL, single-flight, stale-on-error).
The frontend renders a MapLibre map and a TanStack-Query data layer against the
backend, and streams WMS raster tiles straight from `geo.weather.gc.ca`.

No API key is required anywhere — GeoMet is a free, open service.

## Prerequisites

- Python 3.12+ and [`uv`](https://docs.astral.sh/uv/)
- Node.js 18+

## Run it

**1. Backend** (terminal 1):

```bash
cd backend
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
uvicorn app.main:app --reload --port 8787
```

On startup the backend warms its cache (station index + alerts) so the first
page load is instant. Verify with `curl http://127.0.0.1:8787/api/health`.

**2. Frontend** (terminal 2):

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. Vite proxies `/api` to the backend on `:8787`,
so both run as a single origin in development.

### Production build

```bash
cd frontend && npm run build   # type-checks and bundles to dist/
```

## Data sources

All weather data © Environment and Climate Change Canada, via
[MSC GeoMet](https://api.weather.gc.ca/). Basemap © OpenStreetMap contributors,
© CARTO. Map glyphs via the MapLibre demo glyph server.
