import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { PageFrame } from '../../components/layout/page-frame'
import { PageHeader } from '../../components/layout/page-header'
import { SurfaceSection } from '../../components/layout/surface-section'
import { EmptyState, ErrorState, LoadingState } from '../../shared/components/async-state'
import { getAiUsageOverview } from '../../shared/api/ai-token-usage'
import { adaptDimensions, adaptSummary, adaptTrend } from './usage-api-adapters'
import { formatCurrencyAmounts, formatTokenCount } from './usage-logic'
import { UsageTrendChart } from './usage-charts'
import { UsageFiltersBar } from './usage-filters'
import { ParticipantUsageTable } from './usage-tables'
import type { UsageFilters } from './usage-types'
import type { UsageInterval } from '../../shared/api/ai-token-usage'
import './usage-dashboard.css'
import { readUsageFilters, writeUsageFilters } from './usage-filter-params'
import { UsageCategoryChart } from './usage-category-chart'
import { RequestActivityChart } from './request-activity-chart'

const EMPTY_FILTER_OPTIONS = {
  simulationIds: [],
  providers: [],
  models: [],
  activityTypes: [],
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
  const filters = useMemo(() => readUsageFilters(new URLSearchParams(searchKey)), [searchKey])
  const [interval, setInterval] = useState<UsageInterval>('daily')
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['ai-token-usage', 'overview', filters, interval],
    queryFn: () => getAiUsageOverview(filters, interval),
    placeholderData: keepPreviousData,
  })
  const data = query.data
  const summary = data ? adaptSummary(data.summary) : null
  const simulations = data
    ? adaptDimensions(data.bySimulation, 'simulation', data.summary.totalTokens)
    : []
  const models = data ? adaptDimensions(data.byModel, 'model', data.summary.totalTokens) : []
  const trend = data ? adaptTrend(data.trend, data.trendInterval) : []
  const activities = data
    ? adaptDimensions(data.byActivityType, 'activityType', data.summary.totalTokens)
    : []
  const nodes = data ? adaptDimensions(data.byNodeType, 'nodeType', data.summary.totalTokens) : []
  const options = {
    simulationId: data?.filterOptions.simulationIds ?? EMPTY_FILTER_OPTIONS.simulationIds,
    provider: data?.filterOptions.providers ?? EMPTY_FILTER_OPTIONS.providers,
    model: data?.filterOptions.models ?? EMPTY_FILTER_OPTIONS.models,
    activityType: data?.filterOptions.activityTypes ?? EMPTY_FILTER_OPTIONS.activityTypes,
  }

  function updateFilters(nextFilters: UsageFilters) {
    setSearchParams(writeUsageFilters(nextFilters), { replace: true })
  }

  const hasFilters = Object.values(filters).some(Boolean)

  return (
    <PageFrame mode="operations" className="ai-token-usage-page usage-dashboard">
      <PageHeader
        title="AI token usage"
        actions={
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
              onClick={() => void queryClient.invalidateQueries({ queryKey: ['ai-token-usage'] })}
              disabled={query.isFetching}
            >
              <RefreshCw aria-hidden="true" className="size-3.5" />
              {query.isFetching ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>
        }
      />

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
                value: data.summary.participantCount.toLocaleString('en-US'),
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
            <UsageTrendChart
              data={trend}
              interval={interval}
              effectiveInterval={data.trendInterval}
              onIntervalChange={setInterval}
            />
            <RequestActivityChart activity={data.requestActivity} />
          </div>
          <div className="usage-dashboard__breakdowns">
            <UsageCategoryChart data={activities} dimension="activity type" variant="stacked" />
            <UsageCategoryChart data={nodes} dimension="node type" variant="columns" />
          </div>
          <div className="usage-dashboard__breakdowns">
            <UsageCategoryChart data={models} dimension="model" variant="dots" />
            <UsageCategoryChart data={simulations} dimension="simulation" variant="share" />
          </div>

          <SurfaceSection
            title="Usage by participant"
            description="Select a participant ID to inspect its recorded usage."
            className="usage-participants"
            actions={
              <span className="usage-count">
                {data.summary.participantCount.toLocaleString('en-US')} participants
              </span>
            }
          >
            <ParticipantUsageTable
              key={searchKey}
              filters={filters}
              totalTokens={data.summary.totalTokens}
            />
          </SurfaceSection>
        </>
      )}
    </PageFrame>
  )
}
