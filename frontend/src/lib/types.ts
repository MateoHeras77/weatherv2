// Mirrors the backend DTOs (backend/app/geomet/models.py + normalize.py).

export interface StationSummary {
  id: string
  name: string
  region: string | null
  province: string | null
  lat: number
  lon: number
  temperature: number | null
  condition: string | null
  iconCode: number | null
  hasWarning: boolean
  alertLevel: string | null // warning | watch | advisory | statement | null
  observedAt: string | null
}

export interface StationsResponse {
  count: number
  ageSeconds: number | null
  stations: StationSummary[]
}

export interface CurrentConditions {
  temperature: number | null
  feelsLike: number | null
  dewpoint: number | null
  humidity: number | null
  pressureKpa: number | null
  pressureTendency: string | null
  windSpeed: number | null
  windGust: number | null
  windDirection: string | null
  windBearing: number | null
  windChill: number | null
  humidex: number | null
  visibilityKm: number | null
  condition: string | null
  iconCode: number | null
  observedAt: string | null
  stationName: string | null
}

export interface HourlyForecast {
  time: string | null
  temperature: number | null
  condition: string | null
  iconCode: number | null
  pop: number | null
  windSpeed: number | null
  windDirection: string | null
}

export interface DailyForecast {
  period: string
  temperature: number | null
  temperatureClass: string | null
  iconCode: number | null
  summary: string | null
  pop: number | null
  night: boolean
}

export interface Warning {
  type: string | null
  description: string | null
  priority: string | null
  url: string | null
}

export interface StationDetail {
  id: string
  name: string
  region: string | null
  province: string | null
  lat: number
  lon: number
  url: string | null
  lastUpdated: string | null
  current: CurrentConditions
  hourly: HourlyForecast[]
  daily: DailyForecast[]
  sun: { sunrise: string | null; sunset: string | null }
  normals: { summary: string | null; high: number | null; low: number | null }
  warnings: Warning[]
}

export interface AlertProperties {
  id: string
  name: string | null
  shortName: string | null
  code: string | null
  alertType: string | null
  riskColour: string | null
  impact: string | null
  confidence: string | null
  status: string | null
  province: string | null
  area: string | null
  published: string | null
  expires: string | null
  eventEnd: string | null
  text: string | null
  rank: number
}

export interface AlertFeature {
  type: 'Feature'
  geometry: GeoJSON.Geometry
  properties: AlertProperties
}

export interface AlertsResponse {
  type: 'FeatureCollection'
  features: AlertFeature[]
  summary: {
    total: number
    byType: Record<string, number>
    byColour: Record<string, number>
  }
  ageSeconds: number | null
}

// Hub detail = station detail without the 24h hourly series.
export type HubDetail = Omit<StationDetail, 'hourly'>

export interface BriefingResponse {
  alerts: AlertsResponse
  hubs: HubDetail[]
  ageSeconds: number | null
}

export interface SeasonalClass {
  label: string
  probability: number | null
}

export interface OutlookHub {
  id: string
  name: string
  province: string | null
  lat: number
  lon: number
  current: CurrentConditions
  daily: DailyForecast[]
  seasonal: {
    temperature: SeasonalClass
    precipitation: SeasonalClass
    period: string | null
  }
}

export interface OutlookResponse {
  hubs: OutlookHub[]
  period: string | null
  source: string
  ageSeconds: number | null
}

export interface AqhiPoint {
  id: string
  location: string | null
  locationId: string | null
  lat: number
  lon: number
  aqhi: number | null
  category: string
  observedAt: string | null
  observedText: string | null
}

export interface AqhiResponse {
  count: number
  ageSeconds: number | null
  points: AqhiPoint[]
}

export interface WmsLayer {
  id: string
  layer: string
  title: string
  category: string
  description: string
  legend: string
  defaultOpacity: number
}

export interface WmsResponse {
  wmsBase: string
  crs: string
  layers: WmsLayer[]
}
