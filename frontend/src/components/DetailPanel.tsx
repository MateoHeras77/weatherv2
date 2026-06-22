import { useStationDetail } from '../hooks/queries'
import { useApp } from '../lib/store'
import { clockTime, relativeTime, tempC } from '../lib/format'
import CurrentConditions from './CurrentConditions'
import HourlyChart from './HourlyChart'
import ForecastCards from './ForecastCards'

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-wider text-ink-faint">
      {children}
    </h3>
  )
}

export default function DetailPanel() {
  const selectedStationId = useApp((s) => s.selectedStationId)
  const selectStation = useApp((s) => s.selectStation)
  const { data, isLoading, isError } = useStationDetail(selectedStationId)

  if (!selectedStationId) return null

  return (
    <aside className="absolute right-0 top-0 z-20 flex h-full w-full animate-slide-in flex-col border-l border-surface-line bg-surface-muted shadow-panel sm:w-[420px]">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-surface-line bg-white px-5 py-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-lg font-bold text-ink">{data?.name ?? 'Loading…'}</h2>
            {data?.province && (
              <span className="rounded-md bg-brand-blue/10 px-1.5 py-0.5 text-[11px] font-semibold text-brand-blue">
                {data.province}
              </span>
            )}
          </div>
          {data?.region && <p className="truncate text-[12px] text-ink-soft">{data.region}</p>}
          {data?.current.observedAt && (
            <p className="text-[11px] text-ink-faint">
              Observed {relativeTime(data.current.observedAt)}
              {data.current.stationName ? ` · ${data.current.stationName}` : ''}
            </p>
          )}
        </div>
        <button
          onClick={() => selectStation(null)}
          className="shrink-0 rounded-lg p-1.5 text-ink-soft hover:bg-surface-muted"
          aria-label="Close panel"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="scroll-slim flex-1 overflow-y-auto px-5 py-4">
        {isLoading && <PanelSkeleton />}
        {isError && (
          <div className="rounded-xl border border-risk-red/30 bg-risk-red/5 p-4 text-sm text-risk-red">
            Could not load details for this location. It may be temporarily unavailable.
          </div>
        )}

        {data && (
          <>
            {data.warnings.length > 0 && (
              <div className="mb-4 rounded-xl border-l-4 border-brand-red bg-brand-red/5 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-bold text-brand-red">
                  <span>⚠</span> Active weather alert
                </div>
                {data.warnings.map((w, i) => (
                  <p key={i} className="mt-1 text-[13px] text-ink">
                    {w.type}
                    {w.description ? ` — ${w.description}` : ''}
                  </p>
                ))}
              </div>
            )}

            <CurrentConditions current={data.current} />

            {/* Sun & normals */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-surface-line bg-white px-3 py-2.5">
                <div className="text-[11px] uppercase tracking-wide text-ink-faint">Sun</div>
                <div className="mt-0.5 flex items-center gap-3 text-sm text-ink">
                  <span title="Sunrise">🌅 {clockTime(data.sun.sunrise)}</span>
                  <span title="Sunset">🌇 {clockTime(data.sun.sunset)}</span>
                </div>
              </div>
              <div className="rounded-xl border border-surface-line bg-white px-3 py-2.5">
                <div className="text-[11px] uppercase tracking-wide text-ink-faint">Seasonal normals</div>
                <div className="mt-0.5 text-sm text-ink">
                  <span className="text-brand-red">↑ {tempC(data.normals.high)}</span>{' '}
                  <span className="text-brand-blue">↓ {tempC(data.normals.low)}</span>
                </div>
              </div>
            </div>

            <SectionTitle>Next 24 hours</SectionTitle>
            <HourlyChart hourly={data.hourly} />

            <SectionTitle>Extended forecast</SectionTitle>
            <ForecastCards daily={data.daily} />

            {data.url && (
              <a
                href={data.url}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-1 text-[12px] font-medium text-brand-blue hover:underline"
              >
                Full forecast on weather.gc.ca ↗
              </a>
            )}
          </>
        )}
      </div>
    </aside>
  )
}

function PanelSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-28 rounded-2xl bg-surface-line/60" />
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-surface-line/60" />
        ))}
      </div>
      <div className="h-40 rounded-xl bg-surface-line/60" />
    </div>
  )
}
