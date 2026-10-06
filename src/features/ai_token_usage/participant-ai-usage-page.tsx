import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { PageFrame } from '../../components/layout/page-frame'
import { SurfaceSection } from '../../components/layout/surface-section'
import { EmptyState, ErrorState, LoadingState } from '../../shared/components/async-state'
import { ApiError } from '../../shared/api/client'
import { getAiParticipantUsage } from '../../shared/api/ai-token-usage'
import { adaptDimensions, adaptEvent, adaptSummary, adaptTrend } from './usage-api-adapters'
import { formatCurrencyAmounts, formatTokenCount } from './usage-logic'
import { SimulationShareChart, UsageComparisonChart, UsageTrendChart } from './usage-charts'
import { ModelUsageTable, ServerPagination, UsageEventsTable } from './usage-tables'
import './usage-dashboard.css'
import { RequestSizeChart } from './request-size-chart'

const EVENT_PAGE_SIZE = 25

function costSummary(costs: { currency: string; amount: number }[]): string {
  return (
    formatCurrencyAmounts(
      costs.map((cost) => ({ ...cost, amount: Number(cost.amount.toPrecision(6)) })),
    ).join(' / ') || '—'
  )
}

export function ParticipantAiUsagePage() {
  const { participantId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const queryString = searchParams.toString()
  const [eventPage, setEventPage] = useState(1)
  const query = useQuery({
    queryKey: ['ai-token-usage', 'participant', participantId, eventPage],
    queryFn: () => getAiParticipantUsage(participantId, eventPage, EVENT_PAGE_SIZE),
    enabled: Boolean(participantId),
  })
  const data = query.data
  const summary = data ? adaptSummary(data.summary) : null
  const simulations = data
    ? adaptDimensions(data.bySimulation, 'simulation', data.summary.totalTokens)
    : []
  const models = data ? adaptDimensions(data.byModel, 'model', data.summary.totalTokens) : []
  const trend = data ? adaptTrend(data.trend, 'daily') : []
  const events = data ? data.events.items.map(adaptEvent) : []
  const simulationLink = queryString ? `/ai-token-usage?${queryString}` : '/ai-token-usage'
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
        <header className="usage-dashboard__header">
          <h1 className="min-w-0 break-all">Participant {participantId}</h1>
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
              onClick={() => void query.refetch()}
              disabled={query.isFetching}
            >
              <RefreshCw aria-hidden="true" className="size-3.5" />
              {query.isFetching ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>
        </header>
      </div>

      {query.isError && notFound ? (
        <EmptyState
          title="No participant usage found"
          description="The server has no recorded AI usage for this participant."
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

          <div className="usage-dashboard__primary">
            <UsageTrendChart data={trend} interval="daily" />
            {simulations.length <= 5 ? (
              <SimulationShareChart data={simulations} />
            ) : (
              <UsageComparisonChart data={simulations} dimension="simulation" />
            )}
          </div>

          <div className="usage-participant-models">
            <SurfaceSection
              title="Usage by model"
              description="Requests, token counts, provider, and recorded cost by model."
              className="usage-participants"
            >
              <ModelUsageTable rows={models} />
            </SurfaceSection>
            <RequestSizeChart
              data={events}
              totalItems={data.events.totalItems}
              page={data.events.page}
              pageSize={EVENT_PAGE_SIZE}
            />
          </div>

          <SurfaceSection
            title="Request history"
            description="Individual usage records, with timestamps in WIB. Scroll the table to inspect all fields."
            className="usage-participants usage-request-history"
            actions={
              <span className="usage-count">
                {data.events.totalItems.toLocaleString('en-US')} records
              </span>
            }
          >
            <UsageEventsTable rows={events} />
            <ServerPagination
              page={data.events.page}
              totalPages={data.events.totalPages}
              totalItems={data.events.totalItems}
              onPageChange={setEventPage}
            />
          </SurfaceSection>
        </>
      )}
    </PageFrame>
  )
}
