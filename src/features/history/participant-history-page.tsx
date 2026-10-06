import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Layers, ListTree, RefreshCw, Route, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '../../components/ui/button'
import { PageFrame } from '../../components/layout/page-frame'
import { PageHeader } from '../../components/layout/page-header'
import { SurfaceSection } from '../../components/layout/surface-section'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../components/ui/dialog'
import { deleteExecution } from '../../shared/api/executions'
import { getExecutionHistory, type ExecutionHistoryItem } from '../../shared/api/sessions'
import { ErrorState, LoadingState } from '../../shared/components/async-state'
import { DataTable, type DataTableColumn, type TableSort } from '../../shared/components/data-table'
import { StatusBadge } from '../../shared/components/status-badge'

interface HistoryRow {
  id: string
  execution: ExecutionHistoryItem
  simulationName: string
}

const SORT_FIELDS: Record<string, string> = {
  participant: 'participantId',
  name: 'participantFullName',
  status: 'status',
  session: 'sessionId',
  simulation: 'simulationName',
  started: 'startedAt',
  completed: 'completedAt',
}

function effectiveStatus(row: HistoryRow) {
  return row.execution?.status ?? 'pending'
}

export function ParticipantHistoryPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [deleteTarget, setDeleteTarget] = useState<HistoryRow | null>(null)
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [tableSort, setTableSort] = useState<TableSort>({ id: 'started', desc: true })
  const sort = tableSort ? [`${SORT_FIELDS[tableSort.id]},${tableSort.desc ? 'desc' : 'asc'}`] : []
  const history = useQuery({
    queryKey: ['participant-history', 'page', page, size, debouncedSearch, sort],
    queryFn: () => getExecutionHistory({ page, size, search: debouncedSearch, sort }),
    placeholderData: keepPreviousData,
  })
  useEffect(() => {
    if (search === debouncedSearch) return
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search)
      setPage(0)
    }, 300)
    return () => window.clearTimeout(timeout)
  }, [search, debouncedSearch])
  useEffect(() => {
    if (history.data && !history.isPlaceholderData && page > 0 && page >= history.data.totalPages) {
      setPage(Math.max(0, history.data.totalPages - 1))
    }
  }, [history.data, history.isPlaceholderData, page])
  const removeExecution = useMutation({
    mutationFn: deleteExecution,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participant-history'] })
      setDeleteTarget(null)
      toast.success('Execution log deleted.')
    },
    onError: () => toast.error('Unable to delete the execution log.'),
  })
  const rows = useMemo(
    () =>
      (history.data?.content ?? []).map((execution) => ({
        id: execution.executionId,
        execution,
        simulationName: execution.simulationName ?? 'Simulation unavailable',
      })),
    [history.data],
  )
  const columns: DataTableColumn<HistoryRow>[] = [
    {
      id: 'participant',
      header: 'ID',
      cell: (row) => (
        <span
          className="block max-w-[150px] truncate font-mono text-xs text-slate-700"
          title={row.execution.participantId}
        >
          {row.execution.participantId}
        </span>
      ),
    },
    {
      id: 'name',
      header: 'Name',
      cell: (row) => (
        <span
          className="block max-w-48 truncate font-medium text-slate-800"
          title={row.execution.participantFullName ?? undefined}
        >
          {row.execution.participantFullName ?? '—'}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row) => <StatusBadge status={effectiveStatus(row)} />,
    },
    {
      id: 'session',
      header: 'Session',
      cell: (row) => (
        <span
          className="block max-w-44 truncate font-mono text-xs text-slate-700"
          title={row.execution.sessionId}
        >
          {row.execution.sessionId.slice(0, 8)}
        </span>
      ),
    },
    {
      id: 'simulation',
      header: 'Simulation',
      cell: (row) => row.simulationName,
    },
    {
      id: 'started',
      header: 'Started at',
      cell: (row) => (
        <time
          className="text-xs text-slate-700 tabular-nums"
          dateTime={row.execution.startedAt ?? row.execution.createdAt}
        >
          {new Date(
            /(?:[zZ]$|[+-]\d{2}:?\d{2}$)/.test(row.execution.startedAt ?? row.execution.createdAt)
              ? (row.execution.startedAt ?? row.execution.createdAt)
              : `${row.execution.startedAt ?? row.execution.createdAt}Z`,
          ).toLocaleString([], { timeZone: 'Asia/Jakarta' })}
        </time>
      ),
    },
    {
      id: 'completed',
      header: 'Completed at',
      cell: (row) => {
        const val = row.execution.completedAt
        const parsed = val
          ? new Date(/(?:[zZ]$|[+-]\d{2}:?\d{2}$)/.test(val) ? val : `${val}Z`)
          : null
        return (
          <time className="text-xs text-slate-700 tabular-nums" dateTime={val ?? ''}>
            {parsed ? parsed.toLocaleString([], { timeZone: 'Asia/Jakarta' }) : '—'}
          </time>
        )
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigate(`/simulation/${row.execution.participantId}`)}
            className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 shadow-none transition hover:border-blue-300 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <ListTree size={12} className="mr-1 inline" />
            Detail
          </button>
          <button
            onClick={() => navigate(`/history/${row.execution.executionId}?tab=flow`)}
            className="rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-[11px] font-semibold text-violet-700 shadow-none transition hover:border-violet-300 hover:bg-violet-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
          >
            <Route size={12} className="mr-1 inline" />
            Flow
          </button>
          <button
            onClick={() => setDeleteTarget(row)}
            aria-label={`Delete execution ${row.execution.executionId}`}
            title="Delete execution log"
            className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700 shadow-none transition hover:border-red-300 hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <PageFrame mode="operations" className="history-page">
      <PageHeader
        title={
          <span className="flex min-w-0 items-center gap-2">
            <span className="grid size-7 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-600">
              <Layers size={14} aria-hidden="true" />
            </span>
            <span>Execution history</span>
          </span>
        }
      />

      <SurfaceSection>
        {history.isPending ? (
          <LoadingState />
        ) : history.isError ? (
          <div className="grid justify-items-start gap-3">
            <ErrorState message="Unable to load execution history." />
            <Button variant="outline" onClick={() => void history.refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <DataTable
            rows={rows}
            columns={columns.map((column) => ({ ...column, sortField: SORT_FIELDS[column.id] }))}
            selectable={false}
            showColumnToggle={false}
            server={{
              page,
              size,
              search,
              sort: tableSort,
              totalPages: history.data?.totalPages ?? 0,
              totalElements: history.data?.totalElements ?? 0,
              isFetching: history.isFetching,
              onPageChange: setPage,
              onSizeChange: (value) => {
                setSize(value)
                setPage(0)
              },
              onSearchChange: setSearch,
              onSortChange: (value) => {
                setTableSort(value)
                setPage(0)
              },
            }}
            toolbarActions={
              <Button
                variant="outline"
                size="sm"
                disabled={history.isFetching}
                onClick={() => void history.refetch()}
              >
                <RefreshCw size={14} aria-hidden="true" /> Refresh
              </Button>
            }
          />
        )}
      </SurfaceSection>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent className="p-6 sm:max-w-md">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Trash2 className="h-5 w-5 text-red-600" /> Delete execution log?
          </DialogTitle>
          <DialogDescription>
            This permanently deletes the execution, its timeline events, node results, waits,
            timers, and the simulation session when no other execution uses it. This cannot be
            undone.
          </DialogDescription>

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={removeExecution.isPending}
              onClick={() =>
                deleteTarget && removeExecution.mutate(deleteTarget.execution.executionId)
              }
              className="border-0 bg-red-600 text-white hover:bg-red-700"
            >
              <Trash2 className="h-3.5 w-3.5" />{' '}
              {removeExecution.isPending ? 'Deleting…' : 'Delete log'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageFrame>
  )
}
