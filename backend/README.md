# Weatherv2 Backend

FastAPI service that fetches, normalizes, and caches **MSC GeoMet** (Environment
and Climate Change Canada) weather data for the Weatherv2 planner dashboard.

See the [project README](../README.md) for full setup. Quick start:

```bash
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
uvicorn app.main:app --reload --port 8787
```

## Endpoints

| Method & path            | Description                                             |
| ------------------------ | ------------------------------------------------------- |
| `GET /api/stations`      | All ~844 city-page locations (slim markers)             |
| `GET /api/stations/{id}` | Full detail: current, 24h hourly, multi-day, sun, normals |
| `GET /api/alerts[?bbox=]`| Active weather alerts as GeoJSON polygons + summary     |
| `GET /api/aqhi`          | Latest Air Quality Health Index per location            |
| `GET /api/wms/layers`    | Curated raster overlay catalog (radar, model, satellite)|
| `GET /api/briefing`      | Manager digest: active alerts + key-hub conditions      |
| `GET /api/outlook`       | Per-hub 7-day trend + CanSIPS seasonal outlook          |
| `GET /api/marine`        | Marine forecast features                                |
| `GET /api/hurricanes`    | Active tropical-cyclone tracks + error cones            |
| `GET /api/health`        | Liveness probe                                          |

Upstream responses are cached in-memory (TTL per endpoint) with single-flight
and stale-on-error fallback, so the dashboard stays fast and resilient.
