import MapView from '../components/MapView'
import LayerControl from '../components/LayerControl'
import DetailPanel from '../components/DetailPanel'
import { useStations } from '../hooks/queries'

export default function MapPage() {
  const { isError, isLoading } = useStations()

  return (
    <>
      <MapView />
      <LayerControl />
      <DetailPanel />

      {isLoading && (
        <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center">
          <div className="rounded-full bg-brand-navy/90 px-4 py-1.5 text-xs font-medium text-white shadow-card">
            Loading Canadian weather stations…
          </div>
        </div>
      )}
      {isError && (
        <div className="absolute inset-x-0 top-3 z-10 flex justify-center">
          <div className="rounded-full bg-brand-red px-4 py-1.5 text-xs font-medium text-white shadow-card">
            Unable to reach the weather service. Retrying…
          </div>
        </div>
      )}
    </>
  )
}
