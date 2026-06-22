import { useOutlook, useOutlookStation } from '../hooks/queries'
import type { OutlookHub, SeasonalClass } from '../lib/types'
import { iconGlyph } from '../lib/weather'
import { dayAbbr } from '../lib/format'
import { useApp } from '../lib/store'
import CityAutocomplete from '../components/CityAutocomplete'

function tempTone(label: string): string {
  if (label === 'warmer') return '#E25C3B'
  if (label === 'cooler') return '#2F6FB0'
  return '#7A8699'
}
function precipTone(label: string): string {
  if (label === 'wetter') return '#2F8FB0'
  if (label === 'drier') return '#B8862F'
  return '#7A8699'
}

function Pill({ kind, data }: { kind: 'temp' | 'precip'; data: SeasonalClass }) {
  const tone = kind === 'temp' ? tempTone(data.label) : precipTone(data.label)
  return (
    <div className="flex items-center justify-between rounded-lg px-2.5 py-1.5" style={{ background: `${tone}14` }}>
      <span className="text-[11px] uppercase tracking-wide text-ink-faint">
        {kind === 'temp' ? 'Temperature' : 'Precipitation'}
      </span>
      <span className="flex items-center gap-1.5 text-sm font-semibold capitalize" style={{ color: tone }}>
        {data.label}
        {data.probability !== null && (
          <span className="text-[11px] font-normal text-ink-faint">{data.probability}%</span>
        )}
      </span>
    </div>
  )
}

function OutlookCard({ hub, onRemove }: { hub: OutlookHub; onRemove?: () => void }) {
  const flyTo = useApp((s) => s.flyTo)
  const days = hub.daily.filter((d) => !d.night).slice(0, 5)
  return (
    <div className="relative flex flex-col rounded-2xl border border-surface-line bg-white p-4 shadow-card">
      {onRemove && (
        <button
          onClick={onRemove}
          title="Remove city"
          className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-ink-faint hover:bg-surface-muted hover:text-ink"
        >
          ✕
        </button>
      )}
      <div className="flex items-center justify-between">
        <button onClick={() => flyTo(hub.lon, hub.lat, hub.id)} className="text-left">
          <span className="font-bold text-ink hover:text-brand-blue">{hub.name}</span>
          {hub.province && <span className="ml-1.5 text-[11px] text-ink-faint">{hub.province}</span>}
        </button>
        <span className="mr-6 text-2xl leading-none">{iconGlyph(hub.current.iconCode)}</span>
      </div>

      {/* Next days (highs) */}
      <div className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
        Next days
      </div>
      <div className="mt-1 flex justify-between border-b border-surface-line pb-2">
        {days.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <span className="text-[10px] text-ink-faint">{dayAbbr(d.period)}</span>
            <span className="text-base leading-none">{iconGlyph(d.iconCode)}</span>
            <span className="text-[11px] font-semibold text-ink">
              {d.temperature !== null ? `${Math.round(d.temperature)}°` : '—'}
            </span>
          </div>
        ))}
      </div>

      {/* Season ahead */}
      <div className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
        Season ahead vs normal
      </div>
      <div className="mt-1 space-y-1.5">
        <Pill kind="temp" data={hub.seasonal.temperature} />
        <Pill kind="precip" data={hub.seasonal.precipitation} />
      </div>
    </div>
  )
}

// Fetches a user-selected city's outlook on demand.
function CityOutlookCard({ id, onRemove }: { id: string; onRemove: () => void }) {
  const { data, isLoading, isError } = useOutlookStation(id)
  if (isLoading) {
    return <div className="h-56 animate-pulse rounded-2xl border border-surface-line bg-white/60" />
  }
  if (isError || !data) {
    return (
      <div className="flex h-56 flex-col items-center justify-center gap-2 rounded-2xl border border-surface-line bg-white text-sm text-ink-soft">
        Could not load this city.
        <button onClick={onRemove} className="text-brand-blue hover:underline">
          Remove
        </button>
      </div>
    )
  }
  return <OutlookCard hub={data} onRemove={onRemove} />
}

function periodLabel(iso: string | null): string {
  if (!iso) return 'the coming season'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'the coming season'
  // The CanSIPS period is a UTC month boundary — format in UTC to avoid
  // slipping to the previous month in negative-offset timezones.
  return d.toLocaleDateString([], { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

export default function OutlookPage() {
  const { data, isLoading, isError } = useOutlook()
  const outlookCities = useApp((s) => s.outlookCities)
  const addOutlookCity = useApp((s) => s.addOutlookCity)
  const removeOutlookCity = useApp((s) => s.removeOutlookCity)

  const hubIds = data?.hubs.map((h) => h.id) ?? []
  const exclude = [...hubIds, ...outlookCities]

  // National gist: dominant temperature tendency across hubs.
  const gist = (() => {
    if (!data) return null
    const counts: Record<string, number> = {}
    for (const h of data.hubs) {
      const l = h.seasonal.temperature.label
      counts[l] = (counts[l] ?? 0) + 1
    }
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
    return top ? top[0] : null
  })()

  return (
    <div className="scroll-slim absolute inset-0 z-30 overflow-y-auto bg-surface-muted">
      <div className="mx-auto max-w-7xl px-6 py-6">
        <h1 className="text-xl font-bold text-ink">Forecast Outlook</h1>
        <p className="text-sm text-ink-soft">
          The week ahead plus the seasonal outlook for {periodLabel(data?.period ?? null)}
          {gist ? ` — most hubs leaning ${gist} than normal.` : '.'}
        </p>

        <div className="mt-3 rounded-xl border border-surface-line bg-white px-4 py-3 text-[13px] text-ink-soft shadow-card">
          <span className="font-semibold text-ink">How to read this:</span> the season-ahead pills show
          whether temperature and precipitation are likely to run <em>above</em> ("warmer"/"wetter"),
          <em> near</em>, or <em>below</em> ("cooler"/"drier") the long-term normal, with the model's
          confidence. Source: Environment Canada CanSIPS seasonal model.
        </div>

        {/* City picker — any of the ~844 locations */}
        <div className="mt-5">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-ink-faint">
            Add any city
          </h2>
          <div className="max-w-md">
            <CityAutocomplete
              onSelect={(s) => addOutlookCity(s.id)}
              exclude={exclude}
              clearOnSelect
              placeholder="Search any Canadian city to add its outlook…"
            />
          </div>

          {outlookCities.length > 0 && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {outlookCities.map((id) => (
                <CityOutlookCard key={id} id={id} onRemove={() => removeOutlookCity(id)} />
              ))}
            </div>
          )}
        </div>

        {isLoading && <p className="mt-6 text-sm text-ink-soft">Loading outlook…</p>}
        {isError && (
          <p className="mt-6 rounded-xl border border-risk-red/30 bg-risk-red/5 p-4 text-sm text-risk-red">
            Could not load the seasonal outlook.
          </p>
        )}

        {data && (
          <div className="mt-6">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-ink-faint">
              Key hubs
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {data.hubs.map((hub) => (
                <OutlookCard key={hub.id} hub={hub} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
