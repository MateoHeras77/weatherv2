import { useMemo, useState } from 'react'
import type { AlertFeature, AlertsResponse } from '../lib/types'
import { alertTypeColor } from '../lib/weather'
import { untilLabel } from '../lib/format'
import { useApp } from '../lib/store'

function centroid(geom: GeoJSON.Geometry): [number, number] | null {
  try {
    // @ts-expect-error runtime guard below
    let ring = geom.coordinates[0]
    if (Array.isArray(ring[0][0])) ring = ring[0] // MultiPolygon → first polygon ring
    let x = 0
    let y = 0
    let n = 0
    for (const c of ring as number[][]) {
      x += c[0]
      y += c[1]
      n++
    }
    return n ? [x / n, y / n] : null
  } catch {
    return null
  }
}

function AlertItem({ feature }: { feature: AlertFeature }) {
  const [open, setOpen] = useState(false)
  const focusMap = useApp((s) => s.focusMap)
  const p = feature.properties
  const colour = alertTypeColor(p.alertType)

  return (
    <div
      className="rounded-xl border border-surface-line bg-white shadow-card"
      style={{ borderLeft: `4px solid ${colour}` }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
      >
        <span
          className="mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-white"
          style={{ background: colour }}
        >
          {p.alertType ?? 'alert'}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold capitalize text-ink">{p.name ?? 'Weather alert'}</div>
          <div className="truncate text-[12px] text-ink-soft">
            {p.area}
            {p.province ? `, ${p.province}` : ''}
          </div>
        </div>
        <div className="shrink-0 text-right text-[11px] text-ink-faint">
          {untilLabel(p.eventEnd ?? p.expires) && <div>{untilLabel(p.eventEnd ?? p.expires)}</div>}
          <div className="text-brand-blue">{open ? 'Hide' : 'Details'}</div>
        </div>
      </button>

      {open && (
        <div className="border-t border-surface-line px-4 py-3">
          <p className="whitespace-pre-line text-[13px] leading-relaxed text-ink">
            {p.text || 'No additional detail provided.'}
          </p>
          <button
            onClick={() => {
              const c = centroid(feature.geometry)
              if (c) focusMap(c[0], c[1])
            }}
            className="mt-2 text-[12px] font-semibold text-brand-blue hover:underline"
          >
            View on map →
          </button>
        </div>
      )}
    </div>
  )
}

export default function AlertsList({ alerts }: { alerts: AlertsResponse }) {
  const [showStatements, setShowStatements] = useState(false)

  const { primary, statements } = useMemo(() => {
    const sorted = [...alerts.features].sort(
      (a, b) =>
        b.properties.rank - a.properties.rank ||
        (b.properties.published ?? '').localeCompare(a.properties.published ?? ''),
    )
    return {
      primary: sorted.filter((f) => (f.properties.alertType ?? '') !== 'statement'),
      statements: sorted.filter((f) => (f.properties.alertType ?? '') === 'statement'),
    }
  }, [alerts])

  if (alerts.features.length === 0) {
    return (
      <div className="rounded-xl border border-surface-line bg-white p-6 text-center text-sm text-ink-soft">
        ✅ No active weather alerts across Canada right now.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {primary.map((f) => (
        <AlertItem key={f.properties.id} feature={f} />
      ))}

      {statements.length > 0 && (
        <>
          <button
            onClick={() => setShowStatements((s) => !s)}
            className="w-full rounded-xl border border-dashed border-surface-line bg-white/60 px-4 py-2 text-sm font-medium text-ink-soft hover:bg-white"
          >
            {showStatements ? 'Hide' : 'Show'} {statements.length} special weather statements
          </button>
          {showStatements && statements.map((f) => <AlertItem key={f.properties.id} feature={f} />)}
        </>
      )}
    </div>
  )
}
