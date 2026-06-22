import type {
  AlertsResponse,
  AqhiResponse,
  BriefingResponse,
  OutlookHub,
  OutlookResponse,
  StationDetail,
  StationsResponse,
  WmsResponse,
} from './types'

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}) for ${url}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  stations: () => getJSON<StationsResponse>('/api/stations'),
  stationDetail: (id: string) =>
    getJSON<StationDetail>(`/api/stations/${encodeURIComponent(id)}`),
  alerts: () => getJSON<AlertsResponse>('/api/alerts'),
  aqhi: () => getJSON<AqhiResponse>('/api/aqhi'),
  wmsLayers: () => getJSON<WmsResponse>('/api/wms/layers'),
  briefing: () => getJSON<BriefingResponse>('/api/briefing'),
  outlook: () => getJSON<OutlookResponse>('/api/outlook'),
  outlookStation: (id: string) =>
    getJSON<OutlookHub>(`/api/outlook/station/${encodeURIComponent(id)}`),
}
