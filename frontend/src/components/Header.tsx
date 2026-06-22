import { useStations } from '../hooks/queries'
import { useApp } from '../lib/store'
import type { View } from '../lib/store'
import { ageLabel } from '../lib/format'
import SearchBar from './SearchBar'
import AlertSummary from './AlertSummary'

const NAV: { id: View; label: string }[] = [
  { id: 'map', label: 'Map' },
  { id: 'briefing', label: 'Briefing' },
  { id: 'outlook', label: 'Outlook' },
]

export default function Header() {
  const { data: stations, isFetching } = useStations()
  const view = useApp((s) => s.view)
  const setView = useApp((s) => s.setView)
  const basemap = useApp((s) => s.basemap)
  const setBasemap = useApp((s) => s.setBasemap)
  const isMap = view === 'map'

  return (
    <header className="z-20 flex items-center gap-4 bg-brand-navy px-4 py-2.5 text-white shadow-lg">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 items-center justify-center rounded-lg bg-white px-2.5 shadow-sm">
          <img src="/logov2.svg" alt="Purolator" className="h-5 w-auto" />
        </div>
        <div className="hidden leading-tight sm:block">
          <div className="text-sm font-bold tracking-tight">Weather Planner</div>
          <div className="text-[11px] text-white/60">Canada · Environment Canada</div>
        </div>
      </div>

      {/* Nav tabs */}
      <nav className="flex items-center gap-1 rounded-xl bg-white/10 p-1">
        {NAV.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              view === item.id ? 'bg-white text-brand-navy shadow' : 'text-white/80 hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* Search (map only) */}
      <div className="flex flex-1 justify-center px-2">
        {isMap && <SearchBar />}
      </div>

      {/* Status + controls */}
      <div className="flex items-center gap-4">
        <div className="hidden flex-col items-end leading-tight md:flex">
          <span className="flex items-center gap-1.5 text-[11px] text-white/60">
            <span
              className={`h-1.5 w-1.5 rounded-full ${isFetching ? 'animate-pulse bg-risk-yellow' : 'bg-risk-green'}`}
            />
            {stations ? `${stations.count} stations` : 'loading…'}
          </span>
          <span className="text-[11px] text-white/50">updated {ageLabel(stations?.ageSeconds)}</span>
        </div>

        <AlertSummary />

        {isMap && (
          <button
            onClick={() => setBasemap(basemap === 'light' ? 'dark' : 'light')}
            title="Toggle basemap"
            className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-2 text-xs hover:bg-white/10"
          >
            {basemap === 'light' ? '🌙' : '☀️'}
          </button>
        )}
      </div>
    </header>
  )
}
