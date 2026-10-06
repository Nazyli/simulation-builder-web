import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { PageFrame } from '../../components/layout/page-frame'
import { SurfaceSection } from '../../components/layout/surface-section'
import { EmptyState, ErrorState, LoadingState } from '../../shared/components/async-state'
import { getAiUsageOverview } from '../../shared/api/ai-token-usage'
import { adaptDimensions, adaptParticipants, adaptSummary, adaptTrend } from './usage-api-adapters'
import { formatCurrencyAmounts, formatTokenCount } from './usage-logic'
import { UsageComparisonChart, UsageTrendChart } from './usage-charts'
import { UsageFiltersBar } from './usage-filters'
import { ParticipantUsageTable } from './usage-tables'
import type { UsageFilters } from './usage-types'
import type { UsageInterval } from '../../shared/api/ai-token-usage'
import './usage-dashboard.css'
import { RequestActivityChart } from './request-activity-chart'

const PAGE_SIZE = 25
const EMPTY_FILTER_OPTIONS = {
  simulationIds: [],
  providers: [],
  models: [],
  activityTypes: [],
}

const filterParams: [keyof UsageFilters, string][] = [
  ['from', 'from'],
  ['to', 'to'],
  ['simulationId', 'simulation'],
  ['participantId', 'participant'],
  ['provider', 'provider'],
  ['model', 'model'],
  ['activityType', 'activity'],
]

function readFilters(params: URLSearchParams): UsageFilters {
  return Object.fromEntries(
    filterParams.flatMap(([key, param]) => {
      const value = params.get(param)
      return value ? [[key, value]] : []
    }),
  ) as UsageFilters
}

function writeFilters(filters: UsageFilters): URLSearchParams {
  const params = new URLSearchParams()
  for (const [key, param] of filterParams) {
    const value = filters[key]
    if (value) params.set(param, value)
  }
  return params
}

function costSummary(costs: { currency: string; amount: number }[]): string {
  return (
    formatCurrencyAmounts(
      costs.map((cost) => ({ ...cost, amount: Number(cost.amount.toPrecision(6)) })),
    ).join(' / ') || '—'
  )
}

export function AiTokenUsagePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const searchKey = searchParams.toString()
  const filters = useMemo(() => readFilters(new URLSearchParams(searchKey)), [searchKey])
  const [interval, setInterval] = useState<UsageInterval>('daily')
  const [participantPage, setParticipantPage] = useState(1)
  const query = useQuery({
    queryKey: ['ai-token-usage', 'overview', filters, interval, participantPage],
    queryFn: () => getAiUsageOverview(filters, interval, participantPage, PAGE_SIZE),
  })
  const data = query.data
  const activityQuery = useQuery({
    queryKey: ['ai-token-usage', 'request-activity', filters],
    queryFn: () => getAiUsageOverview(filters, 'daily', 1, 1),
    enabled: interval !== 'daily',
  })
  const summary = data ? adaptSummary(data.summary) : null
  const participants = data ? adaptParticipants(data.participants.items) : []
  const simulations = data
    ? adaptDimensions(data.bySimulation, 'simulation', data.summary.totalTokens)
    : []
  const models = data ? adaptDimensions(data.byModel, 'model', data.summary.totalTokens) : []
  const trend = data ? adaptTrend(data.trend, interval) : []
  const options = {
    simulationId: data?.filterOptions.simulationIds ?? EMPTY_FILTER_OPTIONS.simulationIds,
    provider: data?.filterOptions.providers ?? EMPTY_FILTER_OPTIONS.providers,
    model: data?.filterOptions.models ?? EMPTY_FILTER_OPTIONS.models,
    activityType: data?.filterOptions.activityTypes ?? EMPTY_FILTER_OPTIONS.activityTypes,
  }

  useEffect(() => {
    setParticipantPage(1)
  }, [searchKey])

  function updateFilters(nextFilters: UsageFilters) {
    setParticipantPage(1)
    setSearchParams(writeFilters(nextFilters), { replace: true })
  }

  const hasFilters = Object.values(filters).some(Boolean)

  return (
    <PageFrame mode="operations" className="ai-token-usage-page usage-dashboard">
      <header className="usage-dashboard__header">
        <h1>AI token usage</h1>
        <div className="usage-dashboard__refresh">
          <span className="usage-update" role="status">
            {query.isFetching
              ? 'Updating usage…'
              : query.isError
                ? 'Update unavailable'
                : query.dataUpdatedAt
                  ? `Updated ${new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }).format(query.dataUpdatedAt)} WIB`
                  : 'Awaiting data'}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void query.refetch()
              if (interval !== 'daily') void activityQuery.refetch()
            }}
            disabled={query.isFetching}
          >
            <RefreshCw aria-hidden="true" className="size-3.5" />
            {query.isFetching ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>
      </header>

      <UsageFiltersBar
        filters={filters}
        options={options}
        onChange={updateFilters}
        onClear={() => updateFilters({})}
      />

      {query.isError ? (
        <ErrorState
          message="Unable to load AI usage from the server. Check the API connection and try again."
          action={
            <Button type="button" size="xs" variant="outline" onClick={() => void query.refetch()}>
              Retry
            </Button>
          }
        />
      ) : query.isPending ? (
        <LoadingState label="Loading AI usage analytics" />
      ) : !data || data.summary.requestCount === 0 ? (
        <EmptyState
          title={hasFilters ? 'No matching usage' : 'No AI usage records'}
          description={
            hasFilters
              ? 'No recorded AI usage matches these filters. Adjust or clear the filters to try again.'
              : 'The server has not recorded any AI usage yet.'
          }
          action={
            hasFilters ? (
              <Button type="button" size="xs" variant="outline" onClick={() => updateFilters({})}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <section className="usage-metrics" aria-label="Usage summary">
            {[
              {
                label: 'Total tokens',
                value: formatTokenCount(summary!.totalTokens, true),
                detail: 'Recorded consumption',
              },
              {
                label: 'Recorded cost',
                value: costSummary(summary!.totalCostByCurrency),
                detail: 'Reported by provider',
              },
              {
                label: 'Requests',
                value: summary!.totalRequests.toLocaleString('en-US'),
                detail: 'AI requests recorded',
              },
              {
                label: 'Participants',
                value: summary!.totalParticipants.toLocaleString('en-US'),
                detail: 'With recorded usage',
              },
              {
                label: 'Avg tokens / request',
                value: formatTokenCount(summary!.averageTokensPerRequest, true),
                detail: 'Across matching requests',
              },
            ].map((metric) => (
              <div className="usage-metric" key={metric.label}>
                <span className="usage-metric__label">{metric.label}</span>
                <strong
                  title={
                    metric.label === 'Recorded cost'
                      ? formatCurrencyAmounts(summary!.totalCostByCurrency).join(' / ')
                      : metric.value
                  }
                >
                  {metric.value}
                </strong>
                <span className="usage-metric__detail">{metric.detail}</span>
              </div>
            ))}
          </section>

          <div className="usage-dashboard__primary">
            <UsageTrendChart data={trend} interval={interval} onIntervalChange={setInterval} />
            {interval === 'daily' ? (
              <RequestActivityChart data={data.trend} />
            ) : activityQuery.isError ? (
              <ErrorState
                message="Unable to load daily request activity."
                action={
                  <Button size="sm" variant="outline" onClick={() => void activityQuery.refetch()}>
                    Retry
                  </Button>
                }
              />
            ) : activityQuery.isPending ? (
              <LoadingState label="Loading daily request activity" />
            ) : (
              <RequestActivityChart data={activityQuery.data.trend} />
            )}
          </div>
          <div className="usage-dashboard__breakdowns">
            <UsageComparisonChart data={models} dimension="model" />
            <UsageComparisonChart data={simulations} dimension="simulation" />
          </div>

          <SurfaceSection
            title="Usage by participant"
            description="Select a participant ID to inspect its recorded usage."
            className="usage-participants"
            actions={
              <span className="usage-count">
                {data.participants.totalItems.toLocaleString('en-US')} participants
              </span>
            }
          >
            <ParticipantUsageTable
              rows={participants}
              search={searchKey ? `?${searchKey}` : ''}
              page={data.participants.page}
              totalPages={data.participants.totalPages}
              totalItems={data.participants.totalItems}
              totalTokens={data.summary.totalTokens}
              onPageChange={setParticipantPage}
            />
          </SurfaceSection>
        </>
      )}
    </PageFrame>
  )
}
