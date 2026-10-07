import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { DataTable, type DataTableColumn } from '../../shared/components/data-table'
import { ErrorState } from '../../shared/components/async-state'
import { getAiParticipantEvents, getAiUsageParticipants } from '../../shared/api/ai-token-usage'
import { adaptEvent, adaptParticipants } from './usage-api-adapters'
import { useUsageTable } from './use-usage-table'
import { RequestSizeChart } from './request-size-chart'
import { formatCurrencyAmounts, formatTokenCount } from './usage-logic'
import type { DimensionUsage, ParticipantUsage, UsageEvent, UsageFilters } from './usage-types'

function costCell(values: { currency: string; amount: number }[]): string {
  return formatCurrencyAmounts(values).join(' / ') || '—'
}

function formatTimestamp(value: string): string {
  const date = new Date(/(?:z$|[+-]\d{2}:?\d{2}$)/i.test(value) ? value : `${value}Z`)
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function numberCell(value: number, compact = false) {
  return <span className="text-slate-700 tabular-nums">{formatTokenCount(value, compact)}</span>
}

export function ParticipantUsageTable({
  filters,
  totalTokens,
}: {
  filters: UsageFilters
  totalTokens: number
}) {
  const { query, server } = useUsageTable(
    ['ai-token-usage', 'participants', filters],
    (request) => getAiUsageParticipants(filters, request),
    { id: 'totalTokens', desc: true },
  )
  const rows = adaptParticipants(query.data?.content ?? [])
  const fields: Record<string, string> = {
    participant: 'participantId',
    requests: 'requestCount',
    input: 'inputTokens',
    output: 'outputTokens',
    total: 'totalTokens',
    average: 'averageTokensPerRequest',
  }
  const columns: DataTableColumn<ParticipantUsage & { id: string }>[] = [
    {
      id: 'participant',
      header: 'Participant',
      cell: (row) => (
        <Link
          to={`/ai-token-usage/${encodeURIComponent(row.participantId)}`}
          className="usage-participant-link"
          title={row.participantId}
        >
          <span className="truncate font-mono">{row.participantId}</span>
        </Link>
      ),
      sortValue: (row) => row.participantId,
      filterValue: (row) => row.participantId,
    },
    {
      id: 'requests',
      header: 'Requests',
      cell: (row) => numberCell(row.requests),
      sortValue: (row) => row.requests,
      headerClassName: 'text-right',
      cellClassName: 'text-right tabular-nums',
    },
    {
      id: 'input',
      header: 'Input tokens',
      cell: (row) => numberCell(row.inputTokens, true),
      sortValue: (row) => row.inputTokens,
      headerClassName: 'text-right',
      cellClassName: 'text-right tabular-nums',
    },
    {
      id: 'output',
      header: 'Output tokens',
      cell: (row) => numberCell(row.outputTokens, true),
      sortValue: (row) => row.outputTokens,
      headerClassName: 'text-right',
      cellClassName: 'text-right tabular-nums',
    },
    {
      id: 'total',
      header: 'Total tokens',
      cell: (row) => (
        <div className="usage-token-cell">
          <strong
            className="font-semibold text-slate-900 tabular-nums"
            title={formatTokenCount(row.totalTokens)}
          >
            {formatTokenCount(row.totalTokens, true)}
          </strong>
          <span className="usage-token-share">
            {totalTokens ? ((row.totalTokens / totalTokens) * 100).toFixed(1) : '0.0'}% of filtered
            usage
          </span>
        </div>
      ),
      sortValue: (row) => row.totalTokens,
      headerClassName: 'text-right',
      cellClassName: 'text-right tabular-nums',
    },
    {
      id: 'average',
      header: 'Avg tokens / request',
      cell: (row) => numberCell(row.averageTokensPerRequest, true),
      sortValue: (row) => row.averageTokensPerRequest,
      headerClassName: 'text-right',
      cellClassName: 'text-right tabular-nums',
    },
    {
      id: 'details',
      header: 'Details',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      cell: (row) => (
        <Link
          className="usage-inspect-link"
          to={`/ai-token-usage/${encodeURIComponent(row.participantId)}`}
          aria-label={`View usage for participant ${row.participantId}`}
        >
          View usage <ArrowUpRight aria-hidden="true" className="size-3.5" />
        </Link>
      ),
    },
  ]

  return (
    <div className="usage-participant-table min-w-0">
      {query.isError && (
        <ErrorState
          message="Unable to load participants."
          action={
            <Button size="xs" variant="outline" onClick={() => void query.refetch()}>
              Retry
            </Button>
          }
        />
      )}
      <DataTable
        rows={rows.map((row) => ({ ...row, id: row.participantId }))}
        columns={columns.map((column) => ({
          ...column,
          id: fields[column.id] ?? column.id,
          sortField: fields[column.id],
        }))}
        selectable={false}
        showColumnToggle={false}
        server={server}
        toolbarActions={
          <span role="status" className="usage-table-hint">
            {query.isFetching ? 'Loading participants…' : 'Search participant ID'}
          </span>
        }
      />
    </div>
  )
}

export function ModelUsageTable({ rows }: { rows: DimensionUsage[] }) {
  const columns: DataTableColumn<DimensionUsage>[] = [
    {
      id: 'model',
      header: 'Model',
      cell: (row) => (
        <span className="block max-w-52 truncate font-medium text-slate-800" title={row.label}>
          {row.label}
        </span>
      ),
      sortValue: (row) => row.label,
      filterValue: (row) => `${row.label} ${row.provider ?? ''}`,
    },
    {
      id: 'provider',
      header: 'Provider',
      cell: (row) => row.provider ?? '—',
      sortValue: (row) => row.provider ?? '',
    },
    {
      id: 'requests',
      header: 'Requests',
      cell: (row) => numberCell(row.requests),
      sortValue: (row) => row.requests,
      headerClassName: 'text-right',
      cellClassName: 'text-right tabular-nums',
    },
    {
      id: 'input',
      header: 'Input tokens',
      cell: (row) => numberCell(row.inputTokens),
      sortValue: (row) => row.inputTokens,
      headerClassName: 'text-right',
      cellClassName: 'text-right tabular-nums',
    },
    {
      id: 'output',
      header: 'Output tokens',
      cell: (row) => numberCell(row.outputTokens),
      sortValue: (row) => row.outputTokens,
      headerClassName: 'text-right',
      cellClassName: 'text-right tabular-nums',
    },
    {
      id: 'total',
      header: 'Total tokens',
      cell: (row) => (
        <strong className="font-semibold tabular-nums">{formatTokenCount(row.totalTokens)}</strong>
      ),
      sortValue: (row) => row.totalTokens,
      headerClassName: 'text-right',
      cellClassName: 'text-right tabular-nums',
    },
    {
      id: 'cost',
      header: 'Cost',
      cell: (row) => (
        <span className="whitespace-nowrap tabular-nums">{costCell(row.costByCurrency)}</span>
      ),
      headerClassName: 'text-right',
      cellClassName: 'text-right tabular-nums',
    },
  ]
  return (
    <div className="min-w-0 overflow-x-auto">
      <DataTable
        rows={rows}
        columns={columns}
        selectable={false}
        showColumnToggle={false}
        pagination={false}
      />
    </div>
  )
}

export function UsageEventsTable({ participantId }: { participantId: string }) {
  const { query, server } = useUsageTable(
    ['ai-token-usage', 'events', participantId],
    (request) => getAiParticipantEvents(participantId, request),
    { id: 'capturedAt', desc: true },
  )
  const rows = (query.data?.content ?? []).map(adaptEvent)
  const fields: Record<string, string> = {
    capturedAt: 'capturedAt',
    simulation: 'simulationId',
    activity: 'activityType',
    node: 'nodeType',
    service: 'serviceType',
    provider: 'provider',
    model: 'model',
    input: 'inputTokens',
    output: 'outputTokens',
    total: 'totalTokens',
    cost: 'totalCost',
  }
  const columns: DataTableColumn<UsageEvent & { id: string }>[] = [
    {
      id: 'capturedAt',
      header: 'Captured at',
      cell: (row) => (
        <time className="whitespace-nowrap tabular-nums" dateTime={row.captured_at}>
          {formatTimestamp(row.captured_at)}
        </time>
      ),
      sortValue: (row) => new Date(row.captured_at).getTime(),
    },
    {
      id: 'simulation',
      header: 'Simulation',
      cell: (row) => (
        <span className="block max-w-44 truncate" title={row.simulation_id}>
          {row.simulation_id}
        </span>
      ),
      sortValue: (row) => row.simulation_id,
      filterValue: (row) => row.simulation_id,
    },
    {
      id: 'activity',
      header: 'Activity type',
      cell: (row) => row.activity_type,
      sortValue: (row) => row.activity_type,
    },
    {
      id: 'node',
      header: 'Node type',
      cell: (row) => row.node_type ?? '—',
      sortValue: (row) => row.node_type ?? '',
    },
    {
      id: 'service',
      header: 'Service',
      cell: (row) => row.service_type,
      sortValue: (row) => row.service_type,
    },
    {
      id: 'provider',
      header: 'Provider',
      cell: (row) => row.provider ?? '—',
      sortValue: (row) => row.provider ?? '',
    },
    {
      id: 'model',
      header: 'Model',
      cell: (row) => (
        <span className="block max-w-40 truncate" title={row.model ?? undefined}>
          {row.model ?? '—'}
        </span>
      ),
      sortValue: (row) => row.model ?? '',
    },
    {
      id: 'input',
      header: 'Input tokens',
      cell: (row) => numberCell(row.input_tokens),
      sortValue: (row) => row.input_tokens,
      headerClassName: 'text-right',
      cellClassName: 'text-right tabular-nums',
    },
    {
      id: 'output',
      header: 'Output tokens',
      cell: (row) => numberCell(row.output_tokens),
      sortValue: (row) => row.output_tokens,
      headerClassName: 'text-right',
      cellClassName: 'text-right tabular-nums',
    },
    {
      id: 'total',
      header: 'Total tokens',
      cell: (row) => (
        <strong className="font-semibold tabular-nums">{formatTokenCount(row.total_tokens)}</strong>
      ),
      sortValue: (row) => row.total_tokens,
      headerClassName: 'text-right',
      cellClassName: 'text-right tabular-nums',
    },
    {
      id: 'cost',
      header: 'Cost',
      cell: (row) => (
        <span className="whitespace-nowrap tabular-nums">
          {costCell([{ currency: row.currency, amount: row.total_cost }])}
        </span>
      ),
      headerClassName: 'text-right',
      cellClassName: 'text-right tabular-nums',
    },
  ]
  return (
    <div className="min-w-0 overflow-x-auto">
      {query.isError && (
        <ErrorState
          message="Unable to load request history."
          action={
            <Button size="xs" variant="outline" onClick={() => void query.refetch()}>
              Retry
            </Button>
          }
        />
      )}
      {query.data && (
        <RequestSizeChart
          data={rows}
          totalItems={query.data.totalElements}
          page={query.data.number}
          pageSize={query.data.size}
        />
      )}
      <DataTable
        rows={rows.map((row) => ({ ...row, id: row.usage_id }))}
        columns={columns.map((column) => ({
          ...column,
          id: fields[column.id],
          sortField: fields[column.id],
        }))}
        selectable={false}
        showColumnToggle={false}
        server={server}
        toolbarActions={
          <span role="status" className="usage-table-hint">
            {query.isFetching ? 'Loading requests…' : 'Search activity, node, simulation, or model'}
          </span>
        }
      />
    </div>
  )
}
