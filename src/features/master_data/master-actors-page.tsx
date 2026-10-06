import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Pencil, Plus, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { Button } from '../../components/ui/button'
import { PageFrame } from '../../components/layout/page-frame'
import { PageHeader } from '../../components/layout/page-header'
import { SurfaceSection } from '../../components/layout/surface-section'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import { DataTable, type DataTableColumn, type TableSort } from '../../shared/components/data-table'
import { LoadingState } from '../../shared/components/async-state'
import { ApiError } from '../../shared/api/client'
import { getMasterActors, type MasterActor } from '../../shared/api/master-data'
import { RICH_TEXT_CLASS, SafeHtml } from '../../shared/safe-html'
import { hasActorPersonality, renderActorPersonality } from './actor-crud-logic'
import { ActorCrudDialog } from './actor-crud-dialog'

const ACTOR_QUERY_KEY = ['master', 'actors']
const SORT_FIELDS: Record<string, string> = {
  actor: 'actorId',
  name: 'actorName',
  email: 'actorEmail',
  position: 'actorPosition',
  participant: 'isParticipant',
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    try {
      const body = JSON.parse(error.message) as { info?: { message?: string } }
      return body.info?.message ?? error.message
    } catch {
      return error.message
    }
  }
  return error instanceof Error ? error.message : 'Unable to load actors.'
}

function scalar(value: string | null | undefined): string {
  return value?.trim() || '—'
}

export function MasterActorsPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedActor, setSelectedActor] = useState<MasterActor | null>(null)
  const [personalityActor, setPersonalityActor] = useState<MasterActor | null>(null)
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [tableSort, setTableSort] = useState<TableSort>({ id: 'name', desc: false })
  const sort = tableSort ? [`${SORT_FIELDS[tableSort.id]},${tableSort.desc ? 'desc' : 'asc'}`] : []
  const actorsQuery = useQuery({
    queryKey: [...ACTOR_QUERY_KEY, 'page', page, size, debouncedSearch, sort],
    queryFn: () => getMasterActors({ page, size, search: debouncedSearch, sort }),
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
    if (
      actorsQuery.data &&
      !actorsQuery.isPlaceholderData &&
      page > 0 &&
      page >= actorsQuery.data.totalPages
    ) {
      setPage(Math.max(0, actorsQuery.data.totalPages - 1))
    }
  }, [actorsQuery.data, actorsQuery.isPlaceholderData, page])

  function openCreate() {
    setSelectedActor(null)
    setDialogOpen(true)
  }

  function openEdit(actor: MasterActor) {
    setSelectedActor(actor)
    setDialogOpen(true)
  }

  const actors = useMemo(
    () => (actorsQuery.data?.content ?? []).map((actor) => ({ ...actor, id: actor.actorId })),
    [actorsQuery.data],
  )
  const columns: DataTableColumn<(typeof actors)[number]>[] = [
    {
      id: 'actor',
      header: 'ID',
      cell: (actor) => (
        <span
          className="block max-w-44 truncate font-mono text-xs text-slate-700"
          title={actor.actorId}
        >
          {actor.actorId}
        </span>
      ),
    },
    {
      id: 'name',
      header: 'Name',
      cell: (actor) => (
        <span
          className="block max-w-48 truncate font-medium text-slate-800"
          title={actor.actorName}
        >
          {actor.actorName}
        </span>
      ),
    },
    {
      id: 'email',
      header: 'Email',
      cell: (actor) => (
        <span className="block max-w-56 truncate" title={actor.actorEmail ?? undefined}>
          {scalar(actor.actorEmail)}
        </span>
      ),
    },
    { id: 'position', header: 'Position', cell: (actor) => scalar(actor.actorPosition) },
    {
      id: 'participant',
      header: 'Participant',
      cell: (actor) => (
        <span
          className={
            actor.isParticipant
              ? 'rounded-sm bg-emerald-50 px-1.5 py-0.5 text-xs font-semibold text-emerald-700'
              : 'rounded-sm bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-600'
          }
        >
          {actor.isParticipant ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      id: 'personality',
      header: 'Personality',
      cell: (actor) =>
        hasActorPersonality(actor.personaDesc) ? (
          <button
            type="button"
            onClick={() => setPersonalityActor(actor)}
            aria-label={`View personality for ${actor.actorName}`}
            className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            View personality
          </button>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (actor) => (
        <button
          type="button"
          aria-label={`Edit ${actor.actorName}`}
          onClick={() => openEdit(actor)}
          className="inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-[11px] font-semibold text-violet-700 transition hover:border-violet-300 hover:bg-violet-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
        >
          <Pencil size={12} aria-hidden="true" /> Edit
        </button>
      ),
    },
  ]

  return (
    <PageFrame mode="operations" className="master-actors-page">
      <PageHeader
        title="Actors"
        actions={
          <Button type="button" onClick={openCreate}>
            <Plus /> Add actor
          </Button>
        }
      />

      <SurfaceSection>
        {actorsQuery.isPending ? (
          <LoadingState />
        ) : actorsQuery.isError ? (
          <div className="grid justify-items-start gap-3">
            <p role="alert" className="text-sm text-red-700">
              {errorMessage(actorsQuery.error)}
            </p>
            <Button variant="outline" onClick={() => void actorsQuery.refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <DataTable
            rows={actors}
            columns={columns.map((column) => ({ ...column, sortField: SORT_FIELDS[column.id] }))}
            selectable={false}
            showColumnToggle={false}
            server={{
              page,
              size,
              search,
              sort: tableSort,
              totalPages: actorsQuery.data?.totalPages ?? 0,
              totalElements: actorsQuery.data?.totalElements ?? 0,
              isFetching: actorsQuery.isFetching,
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
                disabled={actorsQuery.isFetching}
                onClick={() => void actorsQuery.refetch()}
              >
                <RefreshCw size={14} aria-hidden="true" /> Refresh
              </Button>
            }
          />
        )}
      </SurfaceSection>

      <ActorCrudDialog open={dialogOpen} onOpenChange={setDialogOpen} actor={selectedActor} />

      <Dialog
        open={personalityActor !== null}
        onOpenChange={(open) => {
          if (!open) setPersonalityActor(null)
        }}
      >
        <DialogContent className="flex max-h-[min(680px,calc(100vh-32px))] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="border-b px-6 pt-6 pb-4">
            <DialogTitle>{personalityActor?.actorName} · Personality</DialogTitle>
            <DialogDescription>Markdown personality for this actor.</DialogDescription>
          </DialogHeader>
          <div className="overflow-auto px-6 py-5">
            {personalityActor && (
              <SafeHtml
                html={renderActorPersonality(personalityActor.personaDesc)}
                className={`${RICH_TEXT_CLASS} rounded-lg bg-slate-50 px-4 py-4`}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </PageFrame>
  )
}
