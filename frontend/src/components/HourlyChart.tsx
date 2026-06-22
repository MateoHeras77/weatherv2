import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { HourlyForecast } from '../lib/types'
import { hourLabel } from '../lib/format'

export default function HourlyChart({ hourly }: { hourly: HourlyForecast[] }) {
  const data = hourly.slice(0, 24).map((h) => ({
    time: hourLabel(h.time),
    temp: h.temperature,
    pop: h.pop ?? 0,
  }))

  if (data.length === 0) {
    return <p className="text-sm text-ink-faint">No hourly data available.</p>
  }

  return (
    <div className="rounded-xl border border-surface-line bg-white p-2">
      <ResponsiveContainer width="100%" height={170}>
        <ComposedChart data={data} margin={{ top: 8, right: 6, bottom: 0, left: -22 }}>
          <defs>
            <linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0033A0" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#0033A0" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#EEF1F6" vertical={false} />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fill: '#8A93A5' }}
            interval={2}
            tickLine={false}
            axisLine={{ stroke: '#E3E8EF' }}
          />
          <YAxis
            yAxisId="temp"
            tick={{ fontSize: 10, fill: '#8A93A5' }}
            tickLine={false}
            axisLine={false}
            width={34}
            unit="°"
          />
          <YAxis yAxisId="pop" orientation="right" hide domain={[0, 100]} />
          <Tooltip
            contentStyle={{
              borderRadius: 10,
              border: '1px solid #E3E8EF',
              fontSize: 12,
              boxShadow: '0 8px 24px -8px rgba(0,26,77,.25)',
            }}
            formatter={(value: number | string, name: string) =>
              name === 'pop' ? [`${value}%`, 'Precip.'] : [`${value}°C`, 'Temp']
            }
          />
          <Bar yAxisId="pop" dataKey="pop" fill="#9BC4F0" radius={[3, 3, 0, 0]} barSize={7} />
          <Area
            yAxisId="temp"
            type="monotone"
            dataKey="temp"
            stroke="#0033A0"
            strokeWidth={2}
            fill="url(#tempFill)"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-4 pb-1 text-[11px] text-ink-soft">
        <span className="flex items-center gap-1">
          <span className="h-2 w-3 rounded-sm bg-brand-blue" /> Temperature
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-3 rounded-sm" style={{ background: '#9BC4F0' }} /> Chance of precip.
        </span>
      </div>
    </div>
  )
}
