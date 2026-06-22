import { useEffect, useMemo, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import type { GeoJSONSource } from 'maplibre-gl'
import { useStations, useAlerts, useWmsLayers } from '../hooks/queries'
import { useApp } from '../lib/store'
import { baseStyle, wmsTileUrl } from '../lib/mapStyle'
import { tempColor, riskColor, alertTypeColor } from '../lib/weather'
import type { AlertFeature, StationSummary } from '../lib/types'

// Statements (informational) get their own layer + toggle; everything else
// (warning / watch / advisory) stays on the main alerts layer.
const STATEMENT_COLOR = alertTypeColor('statement')

const CANADA_CENTER: [number, number] = [-86, 58]
const FIRST_VECTOR_LAYER = 'statements-fill' // WMS rasters are inserted before this

function stationsGeoJSON(stations: StationSummary[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: stations.map((s) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
      properties: {
        id: s.id,
        name: s.name,
        province: s.province ?? '',
        color: tempColor(s.temperature),
        tempLabel: s.temperature !== null ? `${Math.round(s.temperature)}°` : '',
        // Ring reflects the highest-severity alert covering the station, so red
        // means a warning specifically (not just "some alert").
        ringColor: s.alertLevel ? alertTypeColor(s.alertLevel) : '#ffffff',
        ringWidth: s.alertLevel ? (s.alertLevel === 'statement' ? 2 : 3) : 1.4,
      },
    })),
  }
}

function alertsGeoJSON(features: AlertFeature[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: features.map((f) => ({
      type: 'Feature',
      geometry: f.geometry as GeoJSON.Geometry,
      properties: { ...f.properties, fillColor: riskColor(f.properties.riskColour) },
    })),
  }
}

export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const readyRef = useRef(false) // style loaded
  const installedRef = useRef(false) // custom sources/layers added

  const { data: stationsData } = useStations()
  const { data: alertsData } = useAlerts()
  const { data: wmsData } = useWmsLayers()

  const flyTo = useApp((s) => s.flyTo)
  const flyTarget = useApp((s) => s.flyTarget)
  const mapFocus = useApp((s) => s.mapFocus)
  const selectedStationId = useApp((s) => s.selectedStationId)
  const showStations = useApp((s) => s.showStations)
  const showAlerts = useApp((s) => s.showAlerts)
  const showStatements = useApp((s) => s.showStatements)
  const basemap = useApp((s) => s.basemap)
  const activeOverlays = useApp((s) => s.activeOverlays)
  const overlayOpacity = useApp((s) => s.overlayOpacity)

  const stationsFC = useMemo(
    () => stationsGeoJSON(stationsData?.stations ?? []),
    [stationsData],
  )
  const alertsFC = useMemo(
    () => alertsGeoJSON(alertsData?.features ?? []),
    [alertsData],
  )

  // Keep latest GeoJSON in refs so installLayers (registered once on map 'load')
  // always seeds sources with current data, regardless of fetch/render timing.
  const stationsFCRef = useRef(stationsFC)
  const alertsFCRef = useRef(alertsFC)
  stationsFCRef.current = stationsFC
  alertsFCRef.current = alertsFC

  // --- install all sources + vector layers (idempotent) ----------------------
  function installLayers(map: maplibregl.Map) {
    if (!map.getSource('stations')) {
      map.addSource('stations', {
        type: 'geojson',
        data: stationsFCRef.current,
        cluster: true,
        clusterRadius: 48,
        clusterMaxZoom: 7,
      })
    }
    if (!map.getSource('alerts')) {
      map.addSource('alerts', { type: 'geojson', data: alertsFCRef.current })
    }

    // Statements (informational) — drawn beneath the actionable alerts.
    if (!map.getLayer('statements-fill')) {
      map.addLayer({
        id: 'statements-fill',
        type: 'fill',
        source: 'alerts',
        filter: ['==', ['get', 'alertType'], 'statement'],
        layout: { visibility: 'none' },
        paint: { 'fill-color': STATEMENT_COLOR, 'fill-opacity': 0.16 },
      })
      map.addLayer({
        id: 'statements-outline',
        type: 'line',
        source: 'alerts',
        filter: ['==', ['get', 'alertType'], 'statement'],
        layout: { visibility: 'none' },
        paint: { 'line-color': STATEMENT_COLOR, 'line-width': 1.1, 'line-opacity': 0.8 },
      })
    }

    // Alerts: warnings / watches / advisories (below station markers)
    if (!map.getLayer('alerts-fill')) {
      map.addLayer({
        id: 'alerts-fill',
        type: 'fill',
        source: 'alerts',
        filter: ['!=', ['get', 'alertType'], 'statement'],
        paint: { 'fill-color': ['get', 'fillColor'], 'fill-opacity': 0.22 },
      })
      map.addLayer({
        id: 'alerts-outline',
        type: 'line',
        source: 'alerts',
        filter: ['!=', ['get', 'alertType'], 'statement'],
        paint: { 'line-color': ['get', 'fillColor'], 'line-width': 1.4, 'line-opacity': 0.9 },
      })
    }

    // Station clusters
    if (!map.getLayer('clusters')) {
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'stations',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#0033A0',
          'circle-opacity': 0.88,
          'circle-radius': ['step', ['get', 'point_count'], 15, 25, 20, 100, 27],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
        },
      })
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'stations',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-size': 12,
          'text-font': ['Noto Sans Bold'],
        },
        paint: { 'text-color': '#ffffff' },
      })
    }

    // Selected halo (under the dots)
    if (!map.getLayer('station-selected')) {
      map.addLayer({
        id: 'station-selected',
        type: 'circle',
        source: 'stations',
        filter: ['==', ['get', 'id'], selectedStationId ?? '__none__'],
        paint: {
          'circle-radius': 13,
          'circle-color': '#0033A0',
          'circle-opacity': 0.18,
          'circle-stroke-color': '#0033A0',
          'circle-stroke-width': 2,
        },
      })
    }

    // Unclustered station dots
    if (!map.getLayer('stations-point')) {
      map.addLayer({
        id: 'stations-point',
        type: 'circle',
        source: 'stations',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 4.5, 8, 7],
          'circle-color': ['get', 'color'],
          'circle-stroke-color': ['get', 'ringColor'],
          'circle-stroke-width': ['get', 'ringWidth'],
        },
      })
      map.addLayer({
        id: 'stations-temp',
        type: 'symbol',
        source: 'stations',
        filter: ['!', ['has', 'point_count']],
        minzoom: 5.5,
        layout: {
          'text-field': ['get', 'tempLabel'],
          'text-size': 11,
          'text-offset': [0, -1.2],
          'text-font': ['Noto Sans Bold'],
        },
        paint: {
          'text-color': '#1A2233',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.4,
        },
      })
    }

    syncOverlays(map)
    applyVisibility(map)
  }

  // --- WMS raster overlays ----------------------------------------------------
  function syncOverlays(map: maplibregl.Map) {
    if (!wmsData) return
    const beforeId = map.getLayer(FIRST_VECTOR_LAYER) ? FIRST_VECTOR_LAYER : undefined
    for (const layer of wmsData.layers) {
      const sourceId = `wms-${layer.id}`
      const layerId = `wms-layer-${layer.id}`
      const active = activeOverlays.includes(layer.id)
      const opacity = overlayOpacity[layer.id] ?? layer.defaultOpacity
      if (active) {
        if (!map.getSource(sourceId)) {
          map.addSource(sourceId, {
            type: 'raster',
            tiles: [wmsTileUrl(wmsData.wmsBase, layer.layer)],
            tileSize: 256,
          })
        }
        if (!map.getLayer(layerId)) {
          map.addLayer(
            { id: layerId, type: 'raster', source: sourceId, paint: { 'raster-opacity': opacity } },
            beforeId,
          )
        } else {
          map.setPaintProperty(layerId, 'raster-opacity', opacity)
        }
      } else if (map.getLayer(layerId)) {
        map.removeLayer(layerId)
        if (map.getSource(sourceId)) map.removeSource(sourceId)
      }
    }
  }

  function applyVisibility(map: maplibregl.Map) {
    const set = (id: string, visible: boolean) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none')
    }
    set('clusters', showStations)
    set('cluster-count', showStations)
    set('stations-point', showStations)
    set('stations-temp', showStations)
    set('station-selected', showStations)
    set('alerts-fill', showAlerts)
    set('alerts-outline', showAlerts)
    set('statements-fill', showStatements)
    set('statements-outline', showStatements)
  }

  // Install sources/layers exactly once, only when the style is loaded AND
  // station data is present AND the map is idle. Creating the clustered GeoJSON
  // source during the busy 'load' phase races its worker and produces an
  // "Unimplemented type: 4" error that permanently stops the source from
  // tiling — so we always install from an idle map with real data in hand.
  function tryInstall(map: maplibregl.Map) {
    if (installedRef.current || !readyRef.current) return
    if (!stationsFCRef.current.features.length) return
    installLayers(map)
    installedRef.current = true
  }

  // --- init map once ----------------------------------------------------------
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: baseStyle(basemap),
      center: CANADA_CENTER,
      zoom: 3.2,
      attributionControl: { compact: true },
    })
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left')

    const popup = new maplibregl.Popup({ closeButton: true, maxWidth: '320px' })

    map.on('load', () => {
      readyRef.current = true
      // Defer past the load burst — install when the map first goes idle.
      map.once('idle', () => tryInstall(map))
    })

    // cluster zoom-in
    map.on('click', 'clusters', (e) => {
      const feature = e.features?.[0]
      if (!feature) return
      const clusterId = feature.properties?.cluster_id
      const src = map.getSource('stations') as GeoJSONSource
      src.getClusterExpansionZoom(clusterId).then((zoom) => {
        map.easeTo({
          center: (feature.geometry as GeoJSON.Point).coordinates as [number, number],
          zoom: zoom + 0.4,
        })
      })
    })

    // station select
    map.on('click', 'stations-point', (e) => {
      const f = e.features?.[0]
      if (!f) return
      const id = f.properties?.id as string
      const [lon, lat] = (f.geometry as GeoJSON.Point).coordinates as [number, number]
      flyTo(lon, lat, id)
    })

    // alert / statement popup
    const showAlertPopup = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0]
      if (!f) return
      const p = f.properties as Record<string, string>
      const colour =
        p.alertType === 'statement' ? STATEMENT_COLOR : riskColor(p.riskColour)
      popup
        .setLngLat(e.lngLat)
        .setHTML(
          `<div style="padding:12px 14px;max-width:300px">
             <div style="display:inline-block;font-size:11px;font-weight:700;color:#fff;background:${colour};padding:2px 8px;border-radius:999px;text-transform:capitalize">${p.alertType ?? 'alert'}</div>
             <div style="font-weight:700;margin-top:8px;text-transform:capitalize;color:#1A2233">${p.name ?? 'Weather alert'}</div>
             <div style="font-size:12px;color:#5B6577;margin-top:2px">${p.area ?? ''}${p.province ? ', ' + p.province : ''}</div>
             <div style="font-size:12px;color:#1A2233;margin-top:8px;max-height:130px;overflow:auto">${(p.text ?? '').slice(0, 360)}${(p.text ?? '').length > 360 ? '…' : ''}</div>
           </div>`,
        )
        .addTo(map)
    }
    map.on('click', 'alerts-fill', showAlertPopup)
    map.on('click', 'statements-fill', showAlertPopup)

    for (const id of ['clusters', 'stations-point', 'alerts-fill', 'statements-fill']) {
      map.on('mouseenter', id, () => (map.getCanvas().style.cursor = 'pointer'))
      map.on('mouseleave', id, () => (map.getCanvas().style.cursor = ''))
    }

    return () => {
      map.remove()
      mapRef.current = null
      readyRef.current = false
      installedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- data updates (or first install once data arrives) ----------------------
  useEffect(() => {
    const map = mapRef.current
    if (!map || !readyRef.current) return
    if (installedRef.current) {
      ;(map.getSource('stations') as GeoJSONSource | undefined)?.setData(stationsFC)
    } else {
      tryInstall(map) // map is idle by now; safe to create the clustered source
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationsFC])

  useEffect(() => {
    const map = mapRef.current
    if (map && installedRef.current) {
      ;(map.getSource('alerts') as GeoJSONSource | undefined)?.setData(alertsFC)
    }
  }, [alertsFC])

  // --- toggles / overlays -----------------------------------------------------
  useEffect(() => {
    const map = mapRef.current
    if (map && installedRef.current) applyVisibility(map)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showStations, showAlerts, showStatements])

  useEffect(() => {
    const map = mapRef.current
    if (map && installedRef.current) syncOverlays(map)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOverlays, overlayOpacity, wmsData])

  // --- selection highlight ----------------------------------------------------
  useEffect(() => {
    const map = mapRef.current
    if (!map || !installedRef.current || !map.getLayer('station-selected')) return
    map.setFilter('station-selected', ['==', ['get', 'id'], selectedStationId ?? '__none__'])
  }, [selectedStationId])

  // --- basemap switch (re-install everything once idle) -----------------------
  useEffect(() => {
    const map = mapRef.current
    if (!map || !readyRef.current) return
    installedRef.current = false
    map.setStyle(baseStyle(basemap))
    map.once('idle', () => tryInstall(map))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basemap])

  // --- fly to target (station select) ----------------------------------------
  useEffect(() => {
    const map = mapRef.current
    if (!map || !flyTarget) return
    map.flyTo({ center: [flyTarget.lon, flyTarget.lat], zoom: Math.max(map.getZoom(), 7.5), speed: 1.2 })
  }, [flyTarget])

  // --- focus map (camera only, e.g. "view alert on map") ---------------------
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapFocus) return
    map.flyTo({ center: [mapFocus.lon, mapFocus.lat], zoom: Math.max(map.getZoom(), 6), speed: 1.2 })
  }, [mapFocus])

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full" />
      <MapLegend />
    </div>
  )
}

function MapLegend() {
  return (
    <div className="pointer-events-none absolute bottom-7 left-1/2 hidden -translate-x-1/2 items-center gap-3 rounded-full border border-surface-line bg-white/90 px-4 py-1.5 text-[11px] text-ink-soft shadow-card backdrop-blur md:flex">
      <span className="font-semibold text-ink">Temp</span>
      <div
        className="h-2 w-28 rounded-full"
        style={{
          background:
            'linear-gradient(90deg, rgb(59,76,192), rgb(116,173,209), rgb(246,232,161), rgb(244,161,78), rgb(180,4,38))',
        }}
      />
      <span>−30°</span>
      <span>+40°</span>
      <span className="ml-2 font-semibold text-ink">Ring</span>
      {(['warning', 'advisory', 'statement'] as const).map((t) => (
        <span key={t} className="inline-flex items-center gap-1 capitalize">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full border-2 bg-white"
            style={{ borderColor: alertTypeColor(t) }}
          />
          {t}
        </span>
      ))}
    </div>
  )
}
