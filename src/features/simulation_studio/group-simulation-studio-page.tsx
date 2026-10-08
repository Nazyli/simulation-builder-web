import { useQuery } from '@tanstack/react-query'
import { Navigate, useParams } from 'react-router-dom'
import { PageFrame } from '../../components/layout/page-frame'
import { Button } from '../../components/ui/button'
import { getGroupSimulation } from '../../shared/api/simulations'
import { ErrorState, LoadingState } from '../../shared/components/async-state'
import { SimulationStudioPage } from './simulation-studio-page'

export function GroupSimulationStudioPage() {
  const { groupSimulationId } = useParams<{ groupSimulationId: string }>()
  const groupQuery = useQuery({
    queryKey: ['group-simulation', groupSimulationId],
    queryFn: () => getGroupSimulation(groupSimulationId!),
    enabled: Boolean(groupSimulationId),
    retry: false,
  })
  const group = groupQuery.data
  if (groupQuery.isPending)
    return (
      <PageFrame mode="workbench" edgeToEdge viewport="fill">
        <LoadingState variant="canvas" />
      </PageFrame>
    )
  if (groupQuery.isError || !group)
    return (
      <PageFrame mode="workbench" edgeToEdge viewport="fill" className="grid place-items-center">
        <div className="text-center">
          <ErrorState
            message={
              groupQuery.isError
                ? 'Unable to load the simulation group.'
                : 'Simulation group not found.'
            }
          />
          <Button type="button" variant="outline" onClick={() => groupQuery.refetch()}>
            Retry
          </Button>
        </div>
      </PageFrame>
    )
  if (group.simulations?.length)
    return <Navigate to={`/studio/${group.simulations[0].simulationId}`} replace />
  return <SimulationStudioPage key={group.groupSimulationId} emptyGroup={group} />
}
