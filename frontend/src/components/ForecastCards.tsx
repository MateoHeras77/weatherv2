import type { DailyForecast } from '../lib/types'
import { iconGlyph } from '../lib/weather'

export default function ForecastCards({ daily }: { daily: DailyForecast[] }) {
  if (daily.length === 0) {
    return <p className="text-sm text-ink-faint">No forecast available.</p>
  }

  return (
    <div className="scroll-slim flex gap-2 overflow-x-auto pb-1">
      {daily.map((d, i) => (
        <div
          key={`${d.period}-${i}`}
          className={`flex w-[104px] shrink-0 flex-col rounded-xl border p-2.5 ${
            d.night ? 'border-surface-line bg-surface-muted' : 'border-surface-line bg-white'
          }`}
          title={d.summary ?? d.period}
        >
          <div className="truncate text-[12px] font-semibold text-ink">{d.period}</div>
          <div className="my-1 text-3xl leading-none">{iconGlyph(d.iconCode)}</div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-ink">
              {d.temperature !== null ? `${Math.round(d.temperature)}°` : '—'}
            </span>
            {d.temperatureClass && (
              <span
                className={`text-[11px] font-semibold ${
                  d.temperatureClass === 'high' ? 'text-brand-red' : 'text-brand-blue'
                }`}
              >
                {d.temperatureClass === 'high' ? 'High' : 'Low'}
              </span>
            )}
          </div>
          {d.pop !== null && d.pop > 0 && (
            <div className="mt-0.5 text-[11px] text-brand-blue">💧 {Math.round(d.pop)}%</div>
          )}
          <p className="mt-1 line-clamp-3 text-[11px] leading-snug text-ink-soft">{d.summary}</p>
        </div>
      ))}
    </div>
  )
}
