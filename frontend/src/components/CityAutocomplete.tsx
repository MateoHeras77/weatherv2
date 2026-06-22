import { useMemo, useRef, useState } from 'react'
import { useStations } from '../hooks/queries'
import { tempColor } from '../lib/weather'
import type { StationSummary } from '../lib/types'

interface Props {
  onSelect: (station: StationSummary) => void
  placeholder?: string
  exclude?: string[]
  clearOnSelect?: boolean
}

export default function CityAutocomplete({
  onSelect,
  placeholder = 'Search a Canadian city or province…',
  exclude,
  clearOnSelect,
}: Props) {
  const { data } = useStations()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const blurTimer = useRef<number | undefined>(undefined)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2 || !data) return []
    const ex = new Set(exclude ?? [])
    const matches = data.stations.filter(
      (s) =>
        !ex.has(s.id) &&
        (s.name.toLowerCase().includes(q) ||
          (s.province ?? '').toLowerCase().includes(q) ||
          (s.region ?? '').toLowerCase().includes(q)),
    )
    matches.sort((a, b) => {
      const ap = a.name.toLowerCase().startsWith(q) ? 0 : 1
      const bp = b.name.toLowerCase().startsWith(q) ? 0 : 1
      return ap - bp || a.name.localeCompare(b.name)
    })
    return matches.slice(0, 8)
  }, [query, data, exclude])

  function choose(s: StationSummary) {
    onSelect(s)
    setQuery(clearOnSelect ? '' : s.name)
    setOpen(false)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => (a + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => (a - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(results[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-2 rounded-xl border border-surface-line bg-white px-3 py-2 shadow-card focus-within:border-brand-blue">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-ink-faint">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="m20 20-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          value={query}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            setActive(0)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            blurTimer.current = window.setTimeout(() => setOpen(false), 150)
          }}
          onKeyDown={onKeyDown}
        />
        {query && (
          <button
            className="text-ink-faint hover:text-ink"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setQuery('')
              setOpen(false)
            }}
          >
            ✕
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div
          className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-xl border border-surface-line bg-white shadow-panel"
          onMouseEnter={() => window.clearTimeout(blurTimer.current)}
        >
          {results.map((s, i) => (
            <button
              key={s.id}
              className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm ${
                i === active ? 'bg-surface-muted' : 'hover:bg-surface-muted'
              }`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(s)}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: tempColor(s.temperature) }}
              />
              <span className="flex-1 truncate">
                <span className="font-medium text-ink">{s.name}</span>{' '}
                <span className="text-ink-faint">{s.province}</span>
              </span>
              <span className="text-ink-soft">
                {s.temperature !== null ? `${Math.round(s.temperature)}°` : '—'}
              </span>
              {s.hasWarning && <span className="text-brand-red">▲</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
