import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { PageFrame } from '../../components/layout/page-frame'
import { PageHeader } from '../../components/layout/page-header'
import { SurfaceSection } from '../../components/layout/surface-section'
import { EmptyState, ErrorState, LoadingState } from '../../shared/components/async-state'
import { ApiError } from '../../shared/api/client'
import { getAiParticipantUsage } from '../../shared/api/ai-token-usage'
import { adaptDimensions, adaptSummary, adaptTrend } from './usage-api-adapters'
import { formatCurrencyAmounts, formatTokenCount } from './usage-logic'
import { UsageTrendChart } from './usage-charts'
import { ModelUsageTable, UsageEventsTable } from './usage-tables'
import './usage-dashboard.css'
import { UsageCategoryChart } from './usage-category-chart'

function costSummary(costs: { currency: string; amount: number }[]): string {
  return (
    formatCurrencyAmounts(
      costs.map((cost) => ({ ...cost, amount: Number(cost.amount.toPrecision(6)) })),
    ).join(' / ') || '—'
  )
}

export function ParticipantAiUsagePage() {
  const { participantId = '' } = useParams()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['ai-token-usage', 'participant', participantId],
    queryFn: () => getAiParticipantUsage(participantId),
    enabled: Boolean(participantId),
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[2] === participantId ? keepPreviousData(previous) : undefined,
  })
  const data = query.data
  const summary = data ? adaptSummary(data.summary) : null
  const simulations = data
    ? adaptDimensions(data.bySimulation, 'simulation', data.summary.totalTokens)
    : []
  const models = data ? adaptDimensions(data.byModel, 'model', data.summary.totalTokens) : []
  const trendInterval = data?.trendInterval ?? 'daily'
  const trend = data?.trend ? adaptTrend(data.trend, trendInterval) : []
  const activities = data
    ? adaptDimensions(data.byActivityType, 'activityType', data.summary.totalTokens)
    : []
  const nodes = data ? adaptDimensions(data.byNodeType, 'nodeType', data.summary.totalTokens) : []
  const simulationLink = '/ai-token-usage'
  const notFound = query.error instanceof ApiError && query.error.status === 404

  return (
    <PageFrame
      mode="operations"
      className="ai-token-usage-page usage-dashboard usage-participant-detail"
    >
      <div className="usage-participant-heading">
        <Link className="usage-back" to={simulationLink}>
          <ArrowLeft aria-hidden="true" className="size-3.5" /> Back to usage overview
        </Link>
        <PageHeader
          title={<span className="break-all">Participant {participantId}</span>}
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
      </div>

      {query.isError && notFound ? (
        <EmptyState
          title="No participant usage found"
          description="No recorded AI usage exists for this participant."
          action={
            <Button asChild type="button" size="xs" variant="outline">
              <Link to={simulationLink}>Back to AI Token Usage</Link>
            </Button>
          }
        />
      ) : query.isError ? (
        <ErrorState
          message="Unable to load participant AI usage from the server. Check the API connection and try again."
          action={
            <Button type="button" size="xs" variant="outline" onClick={() => void query.refetch()}>
              Retry
            </Button>
          }
        />
      ) : query.isPending ? (
        <LoadingState label="Loading participant AI usage" />
      ) : !data || !summary ? null : (
        <>
          <section className="usage-metrics" aria-label="Participant usage summary">
            {[
              {
                label: 'Total tokens',
                value: formatTokenCount(summary.totalTokens, true),
                detail: 'Recorded consumption',
              },
              {
                label: 'Recorded cost',
                value: costSummary(summary.totalCostByCurrency),
                detail: 'Reported by provider',
              },
              {
                label: 'Requests',
                value: summary.totalRequests.toLocaleString('en-US'),
                detail: 'AI requests recorded',
              },
              {
                label: 'Input tokens',
                value: formatTokenCount(data.summary.inputTokens, true),
                detail: 'Sent to models',
              },
              {
                label: 'Output tokens',
                value: formatTokenCount(data.summary.outputTokens, true),
                detail: 'Generated by models',
              },
            ].map((metric) => (
              <div className="usage-metric" key={metric.label}>
                <span className="usage-metric__label">{metric.label}</span>
                <strong
                  title={
                    metric.label === 'Recorded cost'
                      ? formatCurrencyAmounts(summary.totalCostByCurrency).join(' / ')
                      : metric.value
                  }
                >
                  {metric.value}
                </strong>
                <span className="usage-metric__detail">{metric.detail}</span>
              </div>
            ))}
          </section>
          <dl className="usage-participant-context">
            <div>
              <dt>Simulations</dt>
              <dd>{simulations.length.toLocaleString('en-US')}</dd>
            </div>
            <div>
              <dt>Model / provider combinations</dt>
              <dd>{models.length.toLocaleString('en-US')}</dd>
            </div>
            <div>
              <dt>Avg tokens / request</dt>
              <dd>{formatTokenCount(summary.averageTokensPerRequest, true)}</dd>
            </div>
            <div className="usage-participant-context__scope">
              <dt>Scope</dt>
              <dd>All recorded usage</dd>
            </div>
          </dl>

          <div className="usage-participant-workspace">
            <div className="usage-participant-workspace__charts">
              {trend.length > 1 && (
                <div className="usage-dashboard__trend">
                  <UsageTrendChart data={trend} interval={trendInterval} />
                </div>
              )}
              <UsageCategoryChart data={activities} dimension="activity type" variant="stacked" />
              <UsageCategoryChart data={nodes} dimension="node type" variant="columns" />
            </div>
            <SurfaceSection
              title="Request history"
              description="Individual usage records, with timestamps in WIB. Scroll the table to inspect all fields."
              className="usage-participants usage-request-history"
              actions={
                <span className="usage-count">
                  {data.summary.requestCount.toLocaleString('en-US')} requests
                </span>
              }
            >
              <UsageEventsTable key={participantId} participantId={participantId} />
            </SurfaceSection>
          </div>
          <div className="usage-dashboard__breakdowns">
            <SurfaceSection
              title="Usage by model"
              description="Requests, token counts, provider, and recorded cost by model."
              className="usage-participants"
            >
              <ModelUsageTable rows={models} />
            </SurfaceSection>
            <UsageCategoryChart data={simulations} dimension="simulation" variant="share" />
          </div>
        </>
      )}
    </PageFrame>
  )
}
