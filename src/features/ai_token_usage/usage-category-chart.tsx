import { useState } from 'react'
import { Button } from '../../components/ui/button'
import { formatTokenCount } from './usage-logic'
import { simulationShares } from './usage-chart-logic'
import { categoryColors } from './usage-chart-palette'
import type { DimensionUsage } from './usage-types'

type ChartVariant = 'stacked' | 'columns' | 'dots' | 'share'
const shareColors = categoryColors

function RequestCount({ value }: { value: number }) {
  return (
    <span>
      {value.toLocaleString('en-US')} {value === 1 ? 'request' : 'requests'}
    </span>
  )
}

function ActivityBars({ rows, maximum }: { rows: DimensionUsage[]; maximum: number }) {
  return (
    <>
      <div className="usage-series-key" aria-label="Token series">
        <span>
          <i className="usage-series-key__input" aria-hidden="true" />
          Input
        </span>
        <span>
          <i className="usage-series-key__output" aria-hidden="true" />
          Output
        </span>
      </div>
      <dl className="usage-category-list">
        {rows.map((row) => (
          <div key={row.id} className="usage-category-row">
            <dt className="min-w-0 font-medium break-words text-slate-700">{row.label}</dt>
            <dd
              className="m-0 text-right font-semibold text-slate-900 tabular-nums"
              title="Recorded total tokens"
            >
              Total {formatTokenCount(row.totalTokens)}
            </dd>
            <dd className="usage-stacked-track" aria-hidden="true">
              <span
                className="usage-stacked-track__input"
                style={{ width: `${(row.inputTokens / maximum) * 100}%` }}
              />
              <span
                className="usage-stacked-track__output"
                style={{ width: `${(row.outputTokens / maximum) * 100}%` }}
              />
            </dd>
            <dd className="usage-category-detail">
              <RequestCount value={row.requests} />
              <span>
                Input {formatTokenCount(row.inputTokens)} · Output{' '}
                {formatTokenCount(row.outputTokens)}
              </span>
            </dd>
          </div>
        ))}
      </dl>
      {rows.some((row) => row.totalTokens !== row.inputTokens + row.outputTokens) && (
        <p className="mt-3 mb-0 text-xs">
          Bars show input and output. Recorded totals can differ from their sum.
        </p>
      )}
    </>
  )
}

function NodeColumns({ rows, maximum }: { rows: DimensionUsage[]; maximum: number }) {
  return (
    <div
      className="usage-columns-scroll"
      tabIndex={0}
      role="group"
      aria-label="Node token comparison; scroll horizontally for more nodes"
    >
      <ol
        className="usage-columns"
        style={{ gridTemplateColumns: `repeat(${rows.length}, minmax(100px, 1fr))` }}
      >
        {rows.map((row, index) => (
          <li key={row.id}>
            <strong className="usage-column-value">{formatTokenCount(row.totalTokens)}</strong>
            <span className="usage-column-plot" aria-hidden="true">
              <span
                style={{
                  height: `${(row.totalTokens / maximum) * 100}%`,
                  backgroundColor: categoryColors[index % categoryColors.length],
                }}
              />
            </span>
            <span className="usage-column-label">{row.label}</span>
            <span className="usage-column-requests">
              <RequestCount value={row.requests} />
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function ModelDots({ rows, maximum }: { rows: DimensionUsage[]; maximum: number }) {
  return (
    <dl className="usage-category-list">
      {rows.map((row) => (
        <div key={row.id} className="usage-category-row">
          <dt className="min-w-0 font-medium break-words text-slate-700">{row.label}</dt>
          <dd className="m-0 font-semibold text-slate-900 tabular-nums">
            {formatTokenCount(row.totalTokens)}
          </dd>
          <dd className="usage-dot-track" aria-hidden="true">
            <span style={{ width: `${(row.totalTokens / maximum) * 100}%` }} />
          </dd>
          <dd className="usage-category-detail">
            <span>{row.provider ?? 'Unknown provider'}</span>
            <RequestCount value={row.requests} />
            <span>{row.contributionPercent.toFixed(1)}% of tokens</span>
          </dd>
        </div>
      ))}
    </dl>
  )
}

function SimulationShare({ data }: { data: DimensionUsage[] }) {
  const segments = simulationShares(data)
  const total = data.reduce((sum, row) => sum + row.totalTokens, 0)
  return (
    <>
      <div className="usage-share-layout">
        <div
          className="usage-share-ring"
          role="img"
          aria-label={`Simulation proportions across ${formatTokenCount(total)} total tokens; values listed alongside`}
        >
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle
              cx="60"
              cy="60"
              r="45"
              fill="none"
              stroke="var(--usage-track)"
              strokeWidth="14"
            />
            {segments.map(
              (segment, index) =>
                segment.percent > 0 && (
                  <circle
                    key={segment.id}
                    cx="60"
                    cy="60"
                    r="45"
                    fill="none"
                    stroke={shareColors[index]}
                    strokeWidth="14"
                    pathLength="100"
                    strokeDasharray={`${segment.percent} ${100 - segment.percent}`}
                    strokeDashoffset={-segment.offset}
                    transform="rotate(-90 60 60)"
                  />
                ),
            )}
          </svg>
          <div className="usage-share-total">
            <strong title={formatTokenCount(total)}>{formatTokenCount(total, true)}</strong>
            <span>total tokens</span>
          </div>
        </div>
        <dl className="usage-share-legend">
          {segments.map((segment, index) => (
            <div key={segment.id}>
              <dt>
                <i aria-hidden="true" style={{ backgroundColor: shareColors[index] }} />
                <span>{segment.label}</span>
              </dt>
              <dd>
                <strong>{segment.percent.toFixed(1)}%</strong>
                <span>{formatTokenCount(segment.tokens)} tokens</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
      {total === 0 && <p className="m-0 text-xs">No tokens recorded for these requests.</p>}
      {data.length > 5 && (
        <details className="usage-share-details">
          <summary>View all {data.length} simulations</summary>
          <dl className="usage-category-list">
            {data.map((row) => (
              <div className="usage-category-row" key={row.id}>
                <dt>{row.label}</dt>
                <dd className="m-0 text-right tabular-nums">
                  {formatTokenCount(row.totalTokens)} tokens
                </dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </>
  )
}

export function UsageCategoryChart({
  data,
  dimension,
  variant,
}: {
  data: DimensionUsage[]
  dimension: string
  variant: ChartVariant
}) {
  const [expanded, setExpanded] = useState(false)
  const rows = expanded ? data : data.slice(0, 8)
  const maximum = Math.max(
    1,
    ...data.map((row) =>
      variant === 'stacked' ? row.inputTokens + row.outputTokens : row.totalTokens,
    ),
  )
  return (
    <section
      className="usage-chart usage-category-chart"
      aria-label={`Usage by ${dimension}`}
      data-chart-kind={variant}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3>Usage by {dimension}</h3>
        <span className="text-xs text-slate-600">
          {variant === 'share' ? 'Share of tokens' : 'Recorded tokens'}
        </span>
      </div>
      {data.length ? (
        variant === 'stacked' ? (
          <ActivityBars rows={rows} maximum={maximum} />
        ) : variant === 'columns' ? (
          <NodeColumns rows={rows} maximum={maximum} />
        ) : variant === 'dots' ? (
          <ModelDots rows={rows} maximum={maximum} />
        ) : (
          <SimulationShare data={data} />
        )
      ) : (
        <p className="py-10 text-center text-xs">No {dimension} usage for this selection.</p>
      )}
      {data.length > 8 && variant !== 'share' && (
        <Button
          size="xs"
          variant="ghost"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Show fewer' : `Show all ${data.length}`}
        </Button>
      )}
    </section>
  )
}
