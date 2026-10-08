import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowUpRight,
  Boxes,
  FolderKanban,
  Layers,
  Lock,
  Pencil,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageFrame } from '../../components/layout/page-frame'
import { PageHeader } from '../../components/layout/page-header'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { SurfaceSection } from '../../components/layout/surface-section'
import { ApiError } from '../../shared/api/client'
import {
  createGroupSimulation,
  deleteGroupSimulation,
  getGroupSimulations,
  updateGroupSimulation,
} from '../../shared/api/simulations'
import { ErrorState } from '../../shared/components/async-state'
import type { GroupSimulation, Simulation } from '../../shared/types/simulation'
import { filterSimulationGroups } from './simulation-list-logic'
import { studioUrl } from './studio-route'

function apiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    try {
      const info = JSON.parse(error.message).info
      if (typeof info?.message === 'string') return info.message
    } catch {
      // fall through to raw message
    }
    return error.message
  }
  return error instanceof Error ? error.message : 'Unknown error.'
}

function bestSimulation(group: GroupSimulation): Simulation | undefined {
  return group.simulations?.[0]
}

export function SimulationListPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [pickerGroup, setPickerGroup] = useState<GroupSimulation | null>(null)
  const [formGroup, setFormGroup] = useState<GroupSimulation | 'new' | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<GroupSimulation | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const groups = useQuery({ queryKey: ['group-simulations'], queryFn: getGroupSimulations })
  const filteredGroups = useMemo(
    () => filterSimulationGroups(groups.data ?? [], searchQuery),
    [groups.data, searchQuery],
  )

  const create = useMutation({
    mutationFn: createGroupSimulation,
    onSuccess: (group) => {
      queryClient.setQueryData(['group-simulation', group.groupSimulationId], {
        ...group,
        simulations: [],
      })
      queryClient.setQueryData<GroupSimulation[]>(['group-simulations'], (current) => [
        ...(current ?? []),
        { ...group, simulations: [] },
      ])
      queryClient.invalidateQueries({ queryKey: ['group-simulations'] })
      setFormGroup(null)
      navigate(studioUrl(group.groupSimulationId))
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  })

  const update = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: Pick<GroupSimulation, 'groupSimulationName' | 'groupSimulationDesc'>
    }) => updateGroupSimulation(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-simulations'] })
      queryClient.invalidateQueries({ queryKey: ['group-simulation'] })
      setFormGroup(null)
      toast.success('Simulation group updated.')
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  })

  const remove = useMutation({
    mutationFn: deleteGroupSimulation,
    onSuccess: (_result, groupSimulationId) => {
      queryClient.removeQueries({ queryKey: ['group-simulation', groupSimulationId], exact: true })
      queryClient.invalidateQueries({ queryKey: ['group-simulations'] })
      setDeleteTarget(null)
      toast.success('Simulation group deleted.')
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  })

  function openGroup(group: GroupSimulation) {
    const simulations = group.simulations ?? []
    if (simulations.length === 0) {
      navigate(studioUrl(group.groupSimulationId))
      return
    }
    if (simulations.length === 1) {
      navigate(studioUrl(group.groupSimulationId, simulations[0].simulationId))
      return
    }
    setPickerGroup(group)
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const groupName = String(form.get('name'))
    const groupDesc = String(form.get('description')) || null
    if (formGroup && formGroup !== 'new') {
      update.mutate({
        id: formGroup.groupSimulationId,
        payload: { groupSimulationName: groupName, groupSimulationDesc: groupDesc },
      })
    } else {
      create.mutate({
        groupSimulationName: groupName,
        groupSimulationDesc: groupDesc,
      })
    }
  }

  const editing = formGroup && formGroup !== 'new' ? formGroup : null
  const pickerBest = pickerGroup ? bestSimulation(pickerGroup) : undefined

  return (
    <PageFrame mode="operations" className="simulation-list-page">
      <PageHeader
        title="Simulation registry"
        description="Build and manage workflow simulations."
        actions={
          <Button type="button" onClick={() => setFormGroup('new')} className="h-9 gap-2 px-3.5">
            <Plus className="h-4 w-4" /> New simulation
          </Button>
        }
      />

      <div className="flex min-w-0 items-center">
        <label className="relative block w-full sm:max-w-[360px]">
          <span className="sr-only">Search simulation groups</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search groups, versions, channels"
            className="bg-card focus:border-ring focus:ring-ring/20 h-10 w-full rounded-md border border-slate-200 pr-3 pl-9 text-sm text-slate-800 shadow-sm transition outline-none placeholder:text-slate-400 focus:ring-4"
          />
        </label>
      </div>

      {groups.isPending && (
        <div
          role="status"
          aria-label="Loading data"
          className="bg-card rounded-sm border border-slate-200 px-4 py-4 text-sm text-slate-500"
        >
          Loading simulation registry...
        </div>
      )}
      {groups.isError && <ErrorState message="Unable to load simulations." />}

      {groups.data && groups.data.length === 0 && (
        <div className="bg-card flex min-h-[250px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 px-6 py-10 text-center">
          <span className="bg-accent text-accent-foreground grid size-12 place-items-center rounded-lg">
            <Boxes className="h-5 w-5" />
          </span>
          <h2 className="mt-4 text-base font-semibold text-slate-900">No simulations yet</h2>
          <p className="mt-1 max-w-[420px] text-sm leading-relaxed text-slate-500">
            Create a group to give your first workflow a home.
          </p>
          <Button type="button" onClick={() => setFormGroup('new')} className="mt-5 gap-2">
            <Plus className="h-4 w-4" /> Create simulation
          </Button>
        </div>
      )}

      {groups.data && groups.data.length > 0 && (
        <SurfaceSection className="border-b-0 p-0">
          {filteredGroups.length === 0 ? (
            <div className="bg-card flex min-h-[210px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 px-6 py-10 text-center">
              <Search className="h-5 w-5 text-slate-400" />
              <h2 className="mt-3 text-base font-semibold text-slate-900">
                No groups match that search
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Try a different name, version, or channel.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSearchQuery('')}
                className="mt-4"
              >
                Clear search
              </Button>
            </div>
          ) : (
            <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {filteredGroups.map((group) => {
                const simulations = group.simulations ?? []
                const lockedCount = simulations.filter((simulation) => simulation.isLocked).length
                const primarySimulation = simulations[0]
                const statusLabel = lockedCount > 0 ? `${lockedCount} locked` : 'Ready to edit'
                const statusClassName =
                  lockedCount > 0
                    ? 'border-[#f5dca3] bg-[#fff8e9] text-[#9a6815]'
                    : 'border-[#cfe7d5] bg-[#f1fbf3] text-[#347047]'
                return (
                  <article
                    key={group.groupSimulationId}
                    className="group bg-card flex min-w-0 flex-col rounded-lg border border-slate-200 p-[var(--panel-inset)] shadow-[0_4px_18px_rgba(22,31,54,0.035)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_14px_30px_rgba(22,31,54,0.09)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => openGroup(group)}
                      >
                        <h2 className="truncate text-base font-semibold tracking-[-0.025em] text-slate-900">
                          {group.groupSimulationName}
                        </h2>
                        <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">
                          {group.groupSimulationDesc ||
                            'A workspace for connected workflow versions.'}
                        </p>
                      </button>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          aria-label={`Edit ${group.groupSimulationName}`}
                          title="Edit simulation details"
                          className="grid min-h-10 min-w-10 place-items-center rounded-md text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-700 max-[640px]:min-h-11 max-[640px]:min-w-11"
                          onClick={() => setFormGroup(group)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${group.groupSimulationName}`}
                          title="Delete simulation"
                          className="grid min-h-10 min-w-10 place-items-center rounded-md text-red-500 transition-colors duration-150 hover:bg-red-50 hover:text-red-600 max-[640px]:min-h-11 max-[640px]:min-w-11"
                          onClick={() => setDeleteTarget(group)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 flex items-end justify-between gap-3 border-t border-slate-100 pt-1">
                      <div className="min-w-0">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 text-xs font-semibold ${statusClassName}`}
                        >
                          {lockedCount > 0 ? (
                            <Lock className="h-3 w-3" />
                          ) : (
                            <ShieldCheck className="h-3 w-3" />
                          )}
                          {statusLabel}
                        </span>
                        <p className="mt-2 truncate text-xs text-slate-400">
                          {simulations.length} version{simulations.length === 1 ? '' : 's'}
                          {primarySimulation?.channelName
                            ? ` · ${primarySimulation.channelName}`
                            : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openGroup(group)}
                        className="text-brand hover:text-accent-foreground inline-flex shrink-0 items-center gap-1 text-xs font-semibold transition-colors"
                      >
                        Open builder <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </SurfaceSection>
      )}
      <Dialog
        open={Boolean(pickerGroup)}
        onOpenChange={(open) => {
          if (!open) setPickerGroup(null)
        }}
      >
        <DialogContent className="p-6 sm:max-w-md">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Layers className="text-brand h-5 w-5" /> Choose a simulation
          </DialogTitle>
          <DialogDescription>
            {pickerGroup?.groupSimulationName} has {pickerGroup?.simulations?.length ?? 0}{' '}
            simulations. Pick the one you want to open in the builder.
          </DialogDescription>
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {(pickerGroup?.simulations ?? []).map((simulation) => (
              <button
                key={simulation.simulationId}
                type="button"
                className={`flex w-full items-center justify-between rounded-md border p-3 text-left transition-all ${simulation.simulationId === pickerBest?.simulationId ? 'border-ring bg-accent' : 'bg-card border-slate-200 hover:border-slate-300'}`}
                onClick={() =>
                  navigate(studioUrl(simulation.groupSimulationId, simulation.simulationId))
                }
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  {simulation.simulationName}
                  {simulation.isLocked && (
                    <span className="inline-flex items-center gap-1 rounded-sm border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-xs font-semibold text-amber-700">
                      <Lock className="h-3 w-3" /> Locked · {simulation.executionCount ?? 0}
                    </span>
                  )}
                </span>
                {simulation.simulationId === pickerBest?.simulationId && (
                  <span className="text-brand text-xs font-bold tracking-wider uppercase">
                    Default
                  </span>
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(formGroup)}
        onOpenChange={(open) => {
          if (!open) setFormGroup(null)
        }}
      >
        <DialogContent className="p-6 sm:max-w-md">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <FolderKanban className="text-brand h-5 w-5" />{' '}
            {editing ? 'Edit simulation group' : 'Create simulation group'}
          </DialogTitle>
          <form
            className="flex flex-col gap-4"
            key={editing?.groupSimulationId ?? 'new'}
            onSubmit={submit}
          >
            <div className="grid gap-1.5">
              <Label htmlFor="simulation-name" className="text-slate-700">
                Group simulation name
              </Label>
              <Input
                id="simulation-name"
                name="name"
                required
                defaultValue={editing?.groupSimulationName ?? ''}
                placeholder="e.g. Customer onboarding"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="simulation-desc" className="text-slate-700">
                Description
              </Label>
              <Textarea
                id="simulation-desc"
                rows={3}
                name="description"
                defaultValue={editing?.groupSimulationDesc ?? ''}
                placeholder="Describe the purpose of this simulation..."
              />
            </div>
            <div className="mt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setFormGroup(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending || update.isPending}>
                <Save className="h-4 w-4" />{' '}
                {editing ? 'Save changes' : create.isPending ? 'Creating...' : 'Create simulation'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent className="p-6 sm:max-w-md">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Trash2 className="h-5 w-5 text-red-600" /> Delete simulation group?
          </DialogTitle>
          <DialogDescription>
            This permanently deletes “{deleteTarget?.groupSimulationName}” and removes it from the
            studio. This cannot be undone.
          </DialogDescription>
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => deleteTarget && remove.mutate(deleteTarget.groupSimulationId)}
              className="border-0 bg-red-600 text-white hover:bg-red-700"
            >
              <Trash2 className="h-3.5 w-3.5" />{' '}
              {remove.isPending ? 'Deleting...' : 'Delete simulation'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageFrame>
  )
}
