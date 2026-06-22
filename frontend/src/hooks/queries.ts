import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

const MIN = 60_000

export function useStations() {
  return useQuery({
    queryKey: ['stations'],
    queryFn: api.stations,
    refetchInterval: 5 * MIN,
    staleTime: 4 * MIN,
  })
}

export function useStationDetail(id: string | null) {
  return useQuery({
    queryKey: ['station', id],
    queryFn: () => api.stationDetail(id as string),
    enabled: !!id,
    refetchInterval: 5 * MIN,
    staleTime: 4 * MIN,
  })
}

export function useAlerts() {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: api.alerts,
    refetchInterval: 2 * MIN,
    staleTime: 90_000,
  })
}

export function useAqhi() {
  return useQuery({
    queryKey: ['aqhi'],
    queryFn: api.aqhi,
    refetchInterval: 10 * MIN,
    staleTime: 8 * MIN,
  })
}

export function useWmsLayers() {
  return useQuery({
    queryKey: ['wms'],
    queryFn: api.wmsLayers,
    staleTime: Infinity,
  })
}

export function useBriefing() {
  return useQuery({
    queryKey: ['briefing'],
    queryFn: api.briefing,
    refetchInterval: 5 * MIN,
    staleTime: 4 * MIN,
  })
}

export function useOutlook() {
  return useQuery({
    queryKey: ['outlook'],
    queryFn: api.outlook,
    staleTime: 30 * MIN,
  })
}

export function useOutlookStation(id: string) {
  return useQuery({
    queryKey: ['outlook-station', id],
    queryFn: () => api.outlookStation(id),
    staleTime: 30 * MIN,
  })
}
