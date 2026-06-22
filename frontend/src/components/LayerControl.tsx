import { useState } from 'react'
import { useWmsLayers } from '../hooks/queries'
import { useApp } from '../lib/store'
import type { WmsLayer } from '../lib/types'
import { alertTypeColor } from '../lib/weather'

const ALERT_LEGEND = [
  { type: 'warning', label: 'Warning' },
  { type: 'watch', label: 'Watch' },
  { type: 'advisory', label: 'Advisory' },
]

function LegendRow({ color, label, hint }: { color: string; label: string; hint?: string }) {
  return (
    <div className="flex items-center gap-2 py-0.5 text-[11px]">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
      <span className="font-medium text-ink">{label}</span>
      {hint && <span className="text-ink-faint">{hint}</span>}
    </div>
  )
}

function Switch({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 py-1.5 text-left"
    >
      <span className={`text-sm ${on ? 'font-medium text-ink' : 'text-ink-soft'}`}>{label}</span>
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? 'bg-brand-blue' : 'bg-surface-line'}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : 'translate-x-0.5'}`}
        />
      </span>
    </button>
  )
}

function OverlayRow({ layer }: { layer: WmsLayer }) {
  const active = useApp((s) => s.activeOverlays.includes(layer.id))
  const opacity = useApp((s) => s.overlayOpacity[layer.id] ?? layer.defaultOpacity)
  const toggleOverlay = useApp((s) => s.toggleOverlay)
  const setOpacity = useApp((s) => s.setOverlayOpacity)

  return (
    <div className="border-t border-surface-line/70 pt-1.5 first:border-0 first:pt-0">
      <Switch on={active} onClick={() => toggleOverlay(layer.id, layer.defaultOpacity)} label={layer.title} />
      {active && (
        <div className="mb-1.5 pl-0.5">
          <p className="mb-1 text-[11px] leading-snug text-ink-faint">{layer.description}</p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase text-ink-faint">Opacity</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={opacity}
              onChange={(e) => setOpacity(layer.id, Number(e.target.value))}
              className="h-1 flex-1"
            />
          </div>
          <img
            src={layer.legend}
            alt={`${layer.title} legend`}
            className="mt-1.5 max-h-24 rounded border border-surface-line bg-white"
            loading="lazy"
          />
        </div>
      )}
    </div>
  )
}

export default function LayerControl() {
  const { data } = useWmsLayers()
  const [open, setOpen] = useState(true)
  const showStations = useApp((s) => s.showStations)
  const showAlerts = useApp((s) => s.showAlerts)
  const showStatements = useApp((s) => s.showStatements)
  const toggle = useApp((s) => s.toggle)

  const categories = (data?.layers ?? []).reduce<Record<string, WmsLayer[]>>((acc, l) => {
    ;(acc[l.category] ??= []).push(l)
    return acc
  }, {})

  return (
    <div className="absolute left-3 top-3 z-10 w-64 overflow-hidden rounded-xl border border-surface-line bg-white/95 shadow-panel backdrop-blur">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between bg-surface-muted px-3.5 py-2.5"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-ink">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-brand-blue">
            <path d="m12 3 9 5-9 5-9-5 9-5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="m3 13 9 5 9-5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
          Layers
        </span>
        <span className="text-ink-faint">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="scroll-slim max-h-[calc(100vh-9rem)] overflow-y-auto px-3.5 py-2.5">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
            Map data
          </p>
          <Switch on={showStations} onClick={() => toggle('showStations')} label="Station conditions" />
          <Switch on={showAlerts} onClick={() => toggle('showAlerts')} label="Weather alerts" />
          {showAlerts && (
            <div className="mb-1 rounded-lg bg-surface-muted px-2.5 py-1.5">
              <div className="flex flex-wrap gap-x-3">
                {ALERT_LEGEND.map((a) => (
                  <LegendRow key={a.type} color={alertTypeColor(a.type)} label={a.label} />
                ))}
              </div>
              <p className="mt-0.5 text-[10px] leading-snug text-ink-faint">
                Warnings, watches & advisories — only where active.
              </p>
            </div>
          )}
          <Switch
            on={showStatements}
            onClick={() => toggle('showStatements')}
            label="Special statements"
          />
          {showStatements && (
            <div className="mb-1 rounded-lg bg-surface-muted px-2.5 py-1.5">
              <LegendRow color={alertTypeColor('statement')} label="Statement" hint="informational" />
              <p className="mt-0.5 text-[10px] leading-snug text-ink-faint">
                Low-priority special weather statements.
              </p>
            </div>
          )}

          {Object.entries(categories).map(([cat, layers]) => (
            <div key={cat} className="mt-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                {cat}
              </p>
              {layers.map((l) => (
                <OverlayRow key={l.id} layer={l} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
