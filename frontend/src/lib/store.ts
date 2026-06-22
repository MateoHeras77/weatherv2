import { create } from 'zustand'

export type Basemap = 'light' | 'dark'
export type View = 'map' | 'briefing' | 'outlook'

interface FlyTarget {
  lon: number
  lat: number
  id: string
  nonce: number
}

interface MapFocus {
  lon: number
  lat: number
  nonce: number
}

interface AppState {
  // top-level view (map stays mounted under briefing/outlook overlays)
  view: View
  setView: (v: View) => void

  // selection
  selectedStationId: string | null
  selectStation: (id: string | null) => void

  // fly-to (search / station selection — moves camera AND selects)
  flyTarget: FlyTarget | null
  flyTo: (lon: number, lat: number, id: string) => void

  // map focus (camera move only, no selection — e.g. "view alert on map")
  mapFocus: MapFocus | null
  focusMap: (lon: number, lat: number) => void

  // vector layer toggles
  showStations: boolean
  showAlerts: boolean
  showAqhi: boolean
  toggle: (key: 'showStations' | 'showAlerts' | 'showAqhi') => void

  // WMS raster overlays
  activeOverlays: string[]
  overlayOpacity: Record<string, number>
  toggleOverlay: (id: string, defaultOpacity: number) => void
  setOverlayOpacity: (id: string, value: number) => void

  // basemap
  basemap: Basemap
  setBasemap: (b: Basemap) => void

  // user-selected cities added to the Outlook page
  outlookCities: string[]
  addOutlookCity: (id: string) => void
  removeOutlookCity: (id: string) => void
}

export const useApp = create<AppState>((set) => ({
  view: 'map',
  setView: (v) => set({ view: v }),

  selectedStationId: null,
  selectStation: (id) => set({ selectedStationId: id }),

  flyTarget: null,
  flyTo: (lon, lat, id) =>
    set((s) => ({
      view: 'map',
      flyTarget: { lon, lat, id, nonce: (s.flyTarget?.nonce ?? 0) + 1 },
      selectedStationId: id,
    })),

  mapFocus: null,
  focusMap: (lon, lat) =>
    set((s) => ({
      view: 'map',
      mapFocus: { lon, lat, nonce: (s.mapFocus?.nonce ?? 0) + 1 },
    })),

  showStations: true,
  showAlerts: true,
  showAqhi: false,
  toggle: (key) => set((s) => ({ [key]: !s[key] }) as Partial<AppState>),

  activeOverlays: [],
  overlayOpacity: {},
  toggleOverlay: (id, defaultOpacity) =>
    set((s) => {
      const active = s.activeOverlays.includes(id)
      return {
        activeOverlays: active
          ? s.activeOverlays.filter((x) => x !== id)
          : [...s.activeOverlays, id],
        overlayOpacity: {
          ...s.overlayOpacity,
          [id]: s.overlayOpacity[id] ?? defaultOpacity,
        },
      }
    }),
  setOverlayOpacity: (id, value) =>
    set((s) => ({ overlayOpacity: { ...s.overlayOpacity, [id]: value } })),

  basemap: 'light',
  setBasemap: (b) => set({ basemap: b }),

  outlookCities: [],
  addOutlookCity: (id) =>
    set((s) =>
      s.outlookCities.includes(id)
        ? s
        : { outlookCities: [...s.outlookCities, id] },
    ),
  removeOutlookCity: (id) =>
    set((s) => ({ outlookCities: s.outlookCities.filter((x) => x !== id) })),
}))
