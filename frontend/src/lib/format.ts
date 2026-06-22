// Display formatting helpers. The app is metric + English throughout.

export function temp(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${value.toFixed(digits)}°`
}

export function tempC(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${value.toFixed(digits)}°C`
}

export function num(value: number | null | undefined, unit = '', digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${value.toFixed(digits)}${unit}`
}

export function pct(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${Math.round(value)}%`
}

export function hourLabel(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString([], { hour: 'numeric', hour12: true })
}

export function clockTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function dateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString([], {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return 'unknown'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'unknown'
  const seconds = Math.round((Date.now() - d.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  return `${days} d ago`
}

export function ageLabel(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return '—'
  if (seconds < 60) return 'moments ago'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  return `${hours} h ago`
}

// Short label for a daily forecast period ("Today", "Tuesday" -> "Now", "Tue").
export function dayAbbr(period: string): string {
  if (/^today/i.test(period)) return 'Now'
  return period.slice(0, 3)
}

export function untilLabel(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime()) || d.getTime() <= Date.now()) return null
  return `until ${d.toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })}`
}

const COMPASS = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
]

export function bearingToCompass(bearing: number | null | undefined): string | null {
  if (bearing === null || bearing === undefined || Number.isNaN(bearing)) return null
  return COMPASS[Math.round(bearing / 22.5) % 16]
}
