import type { HubDetail } from '../lib/types'
import { iconGlyph, tempColor } from '../lib/weather'
import { dayAbbr, tempC } from '../lib/format'
import { useApp } from '../lib/store'

export default function HubCard({ hub }: { hub: HubDetail }) {
  const flyTo = useApp((s) => s.flyTo)
  const c = hub.current
  const days = hub.daily.filter((d) => !d.night).slice(0, 5)
  const hasAlert = hub.warnings.length > 0

  return (
    <button
      onClick={() => flyTo(hub.lon, hub.lat, hub.id)}
      className="group flex flex-col rounded-2xl border border-surface-line bg-white p-4 text-left shadow-card transition-shadow hover:shadow-panel"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-ink">{hub.name}</span>
            {hub.province && (
              <span className="rounded bg-brand-blue/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand-blue">
                {hub.province}
              </span>
            )}
          </div>
          {hasAlert && (
            <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-red">
              ⚠ {hub.warnings[0].type}
            </span>
          )}
        </div>
        <div className="text-3xl leading-none">{iconGlyph(c.iconCode)}</div>
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-ink">
          {c.temperature !== null ? Math.round(c.temperature) : '—'}°
        </span>
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: tempColor(c.temperature) }}
        />
        <span className="truncate text-sm text-ink-soft">{c.condition ?? '—'}</span>
      </div>
      {c.feelsLike !== null && (
        <div className="text-[11px] text-ink-faint">Feels like {tempC(c.feelsLike)}</div>
      )}

      {/* mini 5-day */}
      <div className="mt-3 flex justify-between border-t border-surface-line pt-2">
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
    </button>
  )
}
