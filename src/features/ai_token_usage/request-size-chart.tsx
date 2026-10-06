import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { UsageEvent } from './usage-types'
import { formatTokenCount } from './usage-logic'

export function RequestSizeChart({
  data,
  totalItems,
  page,
  pageSize,
}: {
  data: UsageEvent[]
  totalItems: number
  page: number
  pageSize: number
}) {
  const start = (page - 1) * pageSize + 1
  const end = start + data.length - 1
  return (
    <section className="usage-chart" aria-label="Request size">
      <h3 className="mb-2 text-sm font-semibold text-slate-800">Request size</h3>
      <p className="mt-0 text-xs text-slate-500">
        Each point is one AI request: input tokens vs output tokens.
      </p>
      {data.length ? (
        <>
          <div
            className="h-64 min-w-0"
            role="img"
            aria-label={`Input and output token sizes for requests ${start} to ${end} of ${totalItems}. Largest request: ${formatTokenCount(Math.max(...data.map((row) => row.total_tokens)), true)} total tokens.`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 12, right: 20, bottom: 24, left: 8 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="input_tokens"
                  name="Input tokens"
                  domain={[0, 'auto']}
                  tickFormatter={(value) => formatTokenCount(Number(value))}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  label={{
                    value: 'Input tokens',
                    position: 'bottom',
                    offset: 6,
                    fontSize: 11,
                    fill: '#64748b',
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="output_tokens"
                  name="Output tokens"
                  domain={[0, 'auto']}
                  tickFormatter={(value) => formatTokenCount(Number(value))}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  width={50}
                  label={{
                    value: 'Output tokens',
                    angle: -90,
                    position: 'insideLeft',
                    fontSize: 11,
                    fill: '#64748b',
                  }}
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    const row = payload?.[0]?.payload as UsageEvent | undefined
                    if (!active || !row) return null
                    return (
                      <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
                        <p className="m-0 font-medium">
                          {row.node_type ?? row.activity_type} · {row.model ?? 'Unknown model'}
                        </p>
                        <p className="my-1 text-slate-500">
                          {new Intl.DateTimeFormat('en-GB', {
                            timeZone: 'Asia/Jakarta',
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          }).format(new Date(row.captured_at))}{' '}
                          WIB
                        </p>
                        <p className="m-0">
                          Input {formatTokenCount(row.input_tokens, true)} · Output{' '}
                          {formatTokenCount(row.output_tokens, true)}
                        </p>
                        <p className="mt-1 mb-0">
                          Total {formatTokenCount(row.total_tokens, true)} tokens
                        </p>
                      </div>
                    )
                  }}
                />
                <Scatter data={data} fill="#0f766e" fillOpacity={0.75} isAnimationActive={false} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <p className="mb-0 text-xs text-slate-500">
            Showing requests {start}–{end} of {totalItems}.{' '}
            {totalItems > pageSize && 'Use the request history pages to inspect more requests.'}
          </p>
        </>
      ) : (
        <p className="py-12 text-center text-xs text-slate-500">No requests to compare.</p>
      )}
    </section>
  )
}
