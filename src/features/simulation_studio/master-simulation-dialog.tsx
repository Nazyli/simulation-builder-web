import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, Workflow } from 'lucide-react'
import { useId, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { ApiError } from '../../shared/api/client'
import { createSimulation, updateSimulation } from '../../shared/api/simulations'
import type { Simulation } from '../../shared/types/simulation'

type SimulationMetadata = Pick<
  Simulation,
  'simulationName' | 'simulationDesc' | 'channelName' | 'duration'
>

function errorMessage(error: Error): string {
  if (error instanceof ApiError) {
    try {
      const message = JSON.parse(error.message).info?.message
      if (typeof message === 'string') return message
    } catch {
      /* Use the original message if the API response cannot be parsed. */
    }
  }
  return error.message
}

export function MasterSimulationDialog({
  open,
  onOpenChange,
  groupSimulationId,
  simulation,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupSimulationId: string
  simulation?: Simulation
  onCreated: (simulation: Simulation) => void
}) {
  const id = useId()
  const queryClient = useQueryClient()
  const save = useMutation({
    mutationFn: (payload: SimulationMetadata) =>
      simulation
        ? updateSimulation(simulation.simulationId, payload)
        : createSimulation(groupSimulationId, payload),
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['group-simulations'] }),
        queryClient.invalidateQueries({ queryKey: ['group-simulation', groupSimulationId] }),
        queryClient.invalidateQueries({ queryKey: ['simulation-versions', groupSimulationId] }),
        queryClient.invalidateQueries({ queryKey: ['version-detail', result.simulationId] }),
        queryClient.invalidateQueries({ queryKey: ['simulations'] }),
        queryClient.invalidateQueries({ queryKey: ['published-simulations'] }),
      ])
      onOpenChange(false)
      if (!simulation) onCreated(result)
      else toast.success('Master simulation updated.')
    },
  })
  function changeOpen(next: boolean) {
    if (save.isPending) return
    save.reset()
    onOpenChange(next)
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (save.isPending) return
    const form = new FormData(event.currentTarget)
    save.mutate({
      simulationName: String(form.get('simulationName')).trim(),
      simulationDesc: String(form.get('simulationDesc')).trim() || null,
      channelName: String(form.get('channelName')).trim(),
      duration: Number(form.get('duration')),
    })
  }
  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 sm:max-w-md"
        showCloseButton={!save.isPending}
      >
        <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Workflow className="text-brand h-5 w-5" />
          {simulation ? 'Edit master simulation' : 'Create master simulation'}
        </DialogTitle>
        <DialogDescription>
          {simulation
            ? 'Update the details of the selected workflow version.'
            : 'Create a master simulation to start building this group’s workflow.'}
        </DialogDescription>
        <form
          key={simulation?.simulationId ?? groupSimulationId}
          onSubmit={submit}
          className="flex flex-col gap-4"
        >
          <fieldset disabled={save.isPending} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor={`${id}-name`}>Name</Label>
              <Input
                id={`${id}-name`}
                name="simulationName"
                required
                maxLength={255}
                pattern=".*\S.*"
                defaultValue={simulation?.simulationName ?? ''}
                placeholder="e.g. Main flow"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`${id}-desc`}>Description</Label>
              <Textarea
                id={`${id}-desc`}
                name="simulationDesc"
                rows={3}
                defaultValue={simulation?.simulationDesc ?? ''}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`${id}-channel`}>Channel Name</Label>
              <Input
                id={`${id}-channel`}
                name="channelName"
                required
                maxLength={255}
                pattern=".*\S.*"
                defaultValue={simulation?.channelName ?? 'chat'}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`${id}-duration`}>Duration (minutes)</Label>
              <Input
                id={`${id}-duration`}
                name="duration"
                type="number"
                required
                min={0}
                step={1}
                defaultValue={simulation?.duration ?? 60}
              />
            </div>
          </fieldset>
          {save.isError && (
            <p role="alert" className="text-sm text-red-600">
              {errorMessage(save.error)}
            </p>
          )}
          <div className="mt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={save.isPending}
              onClick={() => changeOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              <Save className="h-4 w-4" />
              {save.isPending
                ? 'Saving...'
                : simulation
                  ? 'Save changes'
                  : 'Create master simulation'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
