import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ReactNode } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
import { formatTokenCount } from './usage-logic'
import type { UsageTimeBucket } from './usage-types'
import { seriesColors } from './usage-chart-palette'

function formatTokens(value: number | string | undefined): string {
  return formatTokenCount(Number(value ?? 0))
}

function ChartFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      className="usage-chart min-w-0 border-b border-slate-200 pb-4 last:border-b-0"
      aria-label={title}
    >
      <h3 className="mb-2 text-sm font-semibold text-slate-800">{title}</h3>
      {children}
    </section>
  )
}

function SinglePeriodUsage({
  bucket,
  interval,
}: {
  bucket: UsageTimeBucket
  interval: 'daily' | 'weekly' | 'monthly'
}) {
  const values = [
    { label: 'Input tokens', tokens: bucket.inputTokens, color: seriesColors.input },
    { label: 'Output tokens', tokens: bucket.outputTokens, color: seriesColors.output },
    { label: 'Recorded total', tokens: bucket.totalTokens, color: seriesColors.total },
  ]
  const maximum = Math.max(1, ...values.map((value) => value.tokens))
  return (
    <div className="usage-single-period">
      <p className="usage-single-period__date">
        <time dateTime={bucket.key}>
          {interval === 'weekly' ? `Week of ${bucket.label}` : bucket.label}
        </time>
        <span>Tokens recorded in this period</span>
      </p>
      <dl className="usage-single-period__bars">
        {values.map((value) => (
          <div className="usage-single-period__row" key={value.label}>
            <dt>{value.label}</dt>
            <dd>{formatTokens(value.tokens)}</dd>
            <span className="usage-single-period__track" aria-hidden="true">
              <span
                style={{
                  width: `${(value.tokens / maximum) * 100}%`,
                  backgroundColor: value.color,
                }}
              />
            </span>
          </div>
        ))}
      </dl>
    </div>
  )
}

export function UsageTrendChart({
  data,
  interval,
  effectiveInterval = interval,
  onIntervalChange,
}: {
  data: UsageTimeBucket[]
  interval: 'daily' | 'weekly' | 'monthly'
  onIntervalChange?: (interval: 'daily' | 'weekly' | 'monthly') => void
  effectiveInterval?: 'daily' | 'weekly' | 'monthly'
}) {
  return (
    <ChartFrame title={data.length === 1 ? 'Token usage by period' : 'Token usage over time'}>
      <>
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="m-0 text-xs text-slate-500">
            {data.length === 1
              ? 'Input, output, and recorded total · WIB'
              : 'Input, output, and recorded total tokens · WIB'}
          </p>
          {onIntervalChange && (
            <Select
              value={interval}
              onValueChange={(value) => onIntervalChange(value as typeof interval)}
            >
              <SelectTrigger
                aria-label="Time interval"
                className="usage-select-trigger w-28 shrink-0"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                className="usage-select-menu"
                position="popper"
                align="end"
                sideOffset={4}
              >
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        <p className="mb-3 text-xs text-slate-600" role="status">
          {!onIntervalChange
            ? `All recorded usage, grouped ${effectiveInterval}.`
            : interval !== effectiveInterval
              ? `Showing ${effectiveInterval} totals for this range. Daily supports up to 90 days; weekly supports up to 90 periods.`
              : `Daily supports up to 90 days. Longer ranges are grouped weekly or monthly.`}
        </p>
        {data.length === 1 ? (
          <SinglePeriodUsage bucket={data[0]} interval={effectiveInterval} />
        ) : data.length ? (
          <div
            className="h-64 min-w-0"
            role="group"
            aria-label="Line chart of input, output, and total tokens over time"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                accessibilityLayer
                data={data}
                margin={{ top: 6, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid stroke="var(--usage-grid)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: 'var(--usage-muted)' }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={40}
                />
                <YAxis
                  tickFormatter={formatTokens}
                  width={54}
                  tick={{ fontSize: 11, fill: 'var(--usage-muted)' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value, name) => [formatTokens(value as number), name]}
                  labelStyle={{ color: 'var(--usage-ink)', fontWeight: 600 }}
                  itemStyle={{ color: 'var(--usage-ink)' }}
                  contentStyle={{
                    borderColor: 'var(--usage-border)',
                    backgroundColor: 'var(--usage-surface)',
                    borderRadius: 'var(--radius-lg)',
                    fontSize: 12,
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={(value) => (
                    <span style={{ color: 'var(--usage-muted)' }}>{value}</span>
                  )}
                />
                <Line
                  type="linear"
                  dataKey="inputTokens"
                  name="Input Tokens"
                  stroke={seriesColors.input}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                />
                <Line
                  type="linear"
                  dataKey="outputTokens"
                  name="Output Tokens"
                  stroke={seriesColors.output}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  strokeDasharray="5 3"
                  isAnimationActive={false}
                />
                <Line
                  type="linear"
                  dataKey="totalTokens"
                  name="Total Tokens"
                  stroke={seriesColors.total}
                  strokeWidth={2.5}
                  strokeDasharray="2 3"
                  dot={false}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-14 text-center text-xs text-slate-500">No usage in this time range.</p>
        )}
        {data.length > 1 && (
          <details className="usage-trend-data mt-3 text-xs text-slate-600">
            <summary className="w-fit cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700">
              View trend data
            </summary>
            <div className="mt-2 max-h-64 overflow-auto">
              <table className="w-full text-right tabular-nums">
                <caption className="sr-only">{effectiveInterval} token usage in WIB</caption>
                <thead>
                  <tr>
                    <th className="text-left">Period</th>
                    <th>Input</th>
                    <th>Output</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => (
                    <tr key={row.key} className="border-t border-slate-100">
                      <th scope="row" className="py-1.5 text-left font-normal">
                        {row.key}
                      </th>
                      <td>{formatTokens(row.inputTokens)}</td>
                      <td>{formatTokens(row.outputTokens)}</td>
                      <td>{formatTokens(row.totalTokens)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </>
    </ChartFrame>
  )
}
