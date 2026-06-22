import { useAlerts } from '../hooks/queries'
import { alertTypeColor } from '../lib/weather'

const ORDER = ['warning', 'watch', 'advisory', 'statement']
const LABEL: Record<string, string> = {
  warning: 'Warnings',
  watch: 'Watches',
  advisory: 'Advisories',
  statement: 'Statements',
}

export default function AlertSummary() {
  const { data, isLoading } = useAlerts()
  const byType = data?.summary.byType ?? {}
  const total = data?.summary.total ?? 0

  return (
    <div className="flex items-center gap-2">
      <div className="hidden flex-col items-end leading-tight lg:flex">
        <span className="text-[11px] uppercase tracking-wide text-white/60">Active alerts</span>
        <span className="text-lg font-bold text-white">{isLoading ? '…' : total}</span>
      </div>
      <div className="flex items-center gap-1.5">
        {ORDER.map((type) => {
          const count = byType[type] ?? 0
          if (!count) return null
          return (
            <div
              key={type}
              title={LABEL[type]}
              className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: alertTypeColor(type) }}
              />
              <span className="text-sm font-semibold text-white">{count}</span>
              <span className="hidden text-[11px] text-white/70 xl:inline">{LABEL[type]}</span>
            </div>
          )
        })}
        {total === 0 && !isLoading && (
          <span className="rounded-lg bg-white/10 px-2.5 py-1.5 text-xs text-white/80">
            No active alerts
          </span>
        )}
      </div>
    </div>
  )
}
