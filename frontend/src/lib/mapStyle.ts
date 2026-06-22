import type { StyleSpecification } from 'maplibre-gl'
import type { Basemap } from './store'

// CARTO basemaps — free raster tiles, no API key, attribution required.
const CARTO = {
  light: 'https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png',
  dark: 'https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png',
}

const ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, © <a href="https://carto.com/attributions">CARTO</a> · Weather © Environment and Climate Change Canada (MSC GeoMet)'

export function baseStyle(basemap: Basemap): StyleSpecification {
  return {
    version: 8,
    // MapLibre's reference glyph server — required for any text/symbol layer.
    // (OpenMapTiles' PBFs failed to parse in the worker -> "Unimplemented type: 4".)
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources: {
      basemap: {
        type: 'raster',
        tiles: [CARTO[basemap]],
        tileSize: 256,
        attribution: ATTRIBUTION,
      },
    },
    layers: [
      {
        id: 'basemap',
        type: 'raster',
        source: 'basemap',
        paint: { 'raster-opacity': basemap === 'dark' ? 0.9 : 1 },
      },
    ],
  }
}

// Build a MapLibre raster source pointing at a GeoMet WMS layer. MapLibre
// substitutes {bbox-epsg-3857} per tile, so GeoMet renders each 256px tile.
export function wmsTileUrl(wmsBase: string, layer: string): string {
  const params = new URLSearchParams({
    service: 'WMS',
    version: '1.3.0',
    request: 'GetMap',
    layers: layer,
    styles: '',
    format: 'image/png',
    transparent: 'true',
    crs: 'EPSG:3857',
    width: '256',
    height: '256',
  })
  return `${wmsBase}?${params.toString()}&bbox={bbox-epsg-3857}`
}
