// Environment Canada icon-code -> emoji glyph, plus the colour scales used on
// the map and in the panel. Icon codes follow weather.gc.ca/weathericons.

const ICONS: Record<number, string> = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '🌥️', 4: '🌥️', 5: '🌤️',
  6: '🌦️', 7: '🌧️', 8: '🌧️', 9: '⛈️', 10: '☁️',
  11: '🌧️', 12: '🌧️', 13: '🌧️', 14: '🌧️', 15: '🌨️',
  16: '🌨️', 17: '❄️', 18: '❄️', 19: '⛈️', 20: '🌧️',
  21: '🌧️', 22: '🌤️', 23: '🌫️', 24: '🌫️', 25: '🌬️',
  26: '🌨️', 27: '🌨️', 28: '🌧️', 29: '🌫️',
  30: '🌙', 31: '🌙', 32: '☁️', 33: '☁️', 34: '☁️',
  35: '🌥️', 36: '🌦️', 37: '🌧️', 38: '🌨️', 39: '⛈️',
  40: '🌨️', 41: '🌪️', 42: '🌪️', 43: '🌬️', 44: '🌫️',
  45: '🌫️', 46: '⛈️', 47: '⛈️', 48: '🌊',
}

export function iconGlyph(code: number | null | undefined): string {
  if (code === null || code === undefined) return '🌡️'
  return ICONS[code] ?? '🌡️'
}

// --- temperature colour scale (cold blue -> warm red) ------------------------

type Stop = [number, [number, number, number]]
const TEMP_STOPS: Stop[] = [
  [-30, [59, 76, 192]],
  [-15, [90, 127, 224]],
  [0, [116, 173, 209]],
  [8, [154, 208, 194]],
  [15, [246, 232, 161]],
  [22, [244, 161, 78]],
  [30, [225, 80, 42]],
  [40, [180, 4, 38]],
]

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t)
}

export function tempColor(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '#9AA3B2'
  const v = Math.max(TEMP_STOPS[0][0], Math.min(TEMP_STOPS[TEMP_STOPS.length - 1][0], value))
  for (let i = 0; i < TEMP_STOPS.length - 1; i++) {
    const [t0, c0] = TEMP_STOPS[i]
    const [t1, c1] = TEMP_STOPS[i + 1]
    if (v >= t0 && v <= t1) {
      const t = (v - t0) / (t1 - t0)
      return `rgb(${lerp(c0[0], c1[0], t)}, ${lerp(c0[1], c1[1], t)}, ${lerp(c0[2], c1[2], t)})`
    }
  }
  return '#9AA3B2'
}

// --- alert severity colours --------------------------------------------------

export function riskColor(colour: string | null | undefined): string {
  switch ((colour ?? '').toLowerCase()) {
    case 'red':
      return '#D7263D'
    case 'orange':
      return '#F46036'
    case 'yellow':
      return '#F2C037'
    case 'green':
      return '#3FA34D'
    case 'grey':
    case 'gray':
      return '#9AA3B2'
    default:
      return '#7A8699'
  }
}

export function alertTypeColor(type: string | null | undefined): string {
  switch ((type ?? '').toLowerCase()) {
    case 'warning':
      return '#D7263D'
    case 'watch':
      return '#F46036'
    case 'advisory':
      return '#F2C037'
    case 'statement':
      return '#3B82C4'
    default:
      return '#7A8699'
  }
}

// --- AQHI category colours (Environment Canada scale) ------------------------

export function aqhiColor(value: number | null | undefined): string {
  if (value === null || value === undefined) return '#9AA3B2'
  if (value <= 3) return '#3FA34D' // low
  if (value <= 6) return '#F2C037' // moderate
  if (value <= 10) return '#F46036' // high
  return '#7A1F2B' // very high
}

export function aqhiCategory(value: number | null | undefined): {
  label: string
  description: string
} {
  if (value === null || value === undefined)
    return { label: 'Unknown', description: 'No reading' }
  if (value <= 3) return { label: 'Low', description: 'Low health risk' }
  if (value <= 6) return { label: 'Moderate', description: 'Moderate health risk' }
  if (value <= 10) return { label: 'High', description: 'High health risk' }
  return { label: 'Very High', description: 'Very high health risk' }
}

// Static AQHI scale for the map legend.
export const AQHI_BANDS: { range: string; label: string; color: string }[] = [
  { range: '1–3', label: 'Low', color: '#3FA34D' },
  { range: '4–6', label: 'Moderate', color: '#F2C037' },
  { range: '7–10', label: 'High', color: '#F46036' },
  { range: '10+', label: 'Very High', color: '#7A1F2B' },
]
