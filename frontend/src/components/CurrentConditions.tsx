import type { CurrentConditions as CC } from '../lib/types'
import { iconGlyph, tempColor } from '../lib/weather'
import { num, pct, tempC, bearingToCompass } from '../lib/format'

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-surface-line bg-white px-3 py-2.5">
      <div className="text-[11px] uppercase tracking-wide text-ink-faint">{label}</div>
      <div className="mt-0.5 text-lg font-semibold text-ink">{value}</div>
      {sub && <div className="text-[11px] text-ink-soft">{sub}</div>}
    </div>
  )
}

export default function CurrentConditions({ current }: { current: CC }) {
  const wind =
    current.windSpeed !== null
      ? `${Math.round(current.windSpeed)} km/h${current.windDirection ? ' ' + current.windDirection : ''}`
      : '—'
  const gust = current.windGust ? `gusts ${Math.round(current.windGust)} km/h` : undefined
  const feels =
    current.feelsLike !== null
      ? `Feels like ${tempC(current.feelsLike)} · ${current.windChill !== null ? 'wind chill' : 'humidex'}`
      : null
  const bearing = bearingToCompass(current.windBearing)

  return (
    <div>
      {/* Hero */}
      <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-br from-brand-blue to-brand-blueDark px-5 py-4 text-white">
        <div className="text-5xl leading-none">{iconGlyph(current.iconCode)}</div>
        <div className="flex-1">
          <div className="flex items-end gap-2">
            <span
              className="text-5xl font-bold leading-none"
              style={{ textShadow: '0 1px 2px rgba(0,0,0,.25)' }}
            >
              {current.temperature !== null ? Math.round(current.temperature) : '—'}°
            </span>
            <span
              className="mb-1 h-3 w-3 rounded-full ring-2 ring-white/50"
              style={{ background: tempColor(current.temperature) }}
            />
          </div>
          <div className="text-sm text-white/90">{current.condition ?? 'Conditions unavailable'}</div>
          {feels && <div className="text-[12px] text-white/70">{feels}</div>}
        </div>
      </div>

      {/* Metric grid */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Tile label="Wind" value={wind} sub={gust ?? (bearing ? `from the ${bearing}` : undefined)} />
        <Tile label="Humidity" value={pct(current.humidity)} sub={`dew pt ${tempC(current.dewpoint)}`} />
        <Tile
          label="Pressure"
          value={num(current.pressureKpa, ' kPa', 1)}
          sub={current.pressureTendency ?? undefined}
        />
        <Tile
          label="Visibility"
          value={current.visibilityKm !== null ? num(current.visibilityKm, ' km', 0) : '—'}
        />
      </div>
    </div>
  )
}
