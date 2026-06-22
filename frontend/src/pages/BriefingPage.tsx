import { useBriefing } from '../hooks/queries'
import { ageLabel } from '../lib/format'
import AlertsList from '../components/AlertsList'
import HubCard from '../components/HubCard'

function Kpi({ value, label, accent }: { value: number | string; label: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-surface-line bg-white px-4 py-3 shadow-card">
      <div className={`text-2xl font-bold ${accent ?? 'text-ink'}`}>{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-ink-faint">{label}</div>
    </div>
  )
}

export default function BriefingPage() {
  const { data, isLoading, isError } = useBriefing()
  const summary = data?.alerts.summary
  const byType = summary?.byType ?? {}
  const advisories = (byType.advisory ?? 0) + (byType.watch ?? 0)

  return (
    <div className="scroll-slim absolute inset-0 z-30 overflow-y-auto bg-surface-muted">
      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h1 className="text-xl font-bold text-ink">Operations Briefing</h1>
            <p className="text-sm text-ink-soft">
              Active weather alerts and conditions at key Canadian hubs
              {data ? ` · updated ${ageLabel(data.ageSeconds)}` : ''}
            </p>
          </div>
        </div>

        {isLoading && <p className="text-sm text-ink-soft">Loading briefing…</p>}
        {isError && (
          <p className="rounded-xl border border-risk-red/30 bg-risk-red/5 p-4 text-sm text-risk-red">
            Could not load the briefing. The weather service may be temporarily unavailable.
          </p>
        )}

        {data && (
          <>
            {/* KPI strip */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Kpi value={summary?.total ?? 0} label="Active alerts" />
              <Kpi value={byType.warning ?? 0} label="Warnings" accent="text-brand-red" />
              <Kpi value={advisories} label="Watches & advisories" accent="text-risk-orange" />
              <Kpi value={data.hubs.length} label="Hubs tracked" />
            </div>

            <div className="grid gap-6 xl:grid-cols-12">
              {/* Active alerts */}
              <section className="xl:col-span-5">
                <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-ink-faint">
                  Active alerts
                </h2>
                <AlertsList alerts={data.alerts} />
              </section>

              {/* Key hubs */}
              <section className="xl:col-span-7">
                <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-ink-faint">
                  Key hubs — current & 5-day
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                  {data.hubs.map((hub) => (
                    <HubCard key={hub.id} hub={hub} />
                  ))}
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
