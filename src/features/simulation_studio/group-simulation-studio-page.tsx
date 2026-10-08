import { useQuery } from '@tanstack/react-query'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PageFrame } from '../../components/layout/page-frame'
import { Button } from '../../components/ui/button'
import { getGroupSimulation } from '../../shared/api/simulations'
import { ErrorState, LoadingState } from '../../shared/components/async-state'
import { SimulationStudioPage } from './simulation-studio-page'
import { studioUrl } from './studio-route'

export function GroupSimulationStudioPage() {
  const { groupSimulationId } = useParams<{ groupSimulationId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const simulationId = searchParams.get('simulation') || undefined
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
  if (simulationId && !group.simulations?.some((item) => item.simulationId === simulationId))
    return (
      <PageFrame mode="workbench" edgeToEdge viewport="fill" className="grid place-items-center">
        <div className="text-center">
          <ErrorState message="The selected simulation does not belong to this group or is no longer available." />
          <Button onClick={() => navigate(studioUrl(group.groupSimulationId), { replace: true })}>
            Open simulation group
          </Button>
        </div>
      </PageFrame>
    )
  if (!simulationId && group.simulations?.length)
    return (
      <Navigate
        to={studioUrl(group.groupSimulationId, group.simulations[0].simulationId)}
        replace
      />
    )
  return (
    <SimulationStudioPage
      key={group.groupSimulationId}
      group={group}
      selectedSimulationId={simulationId}
    />
  )
}

export function LegacyGroupSimulationStudioRedirect() {
  const { groupSimulationId } = useParams<{ groupSimulationId: string }>()
  return <Navigate to={studioUrl(groupSimulationId!)} replace />
}
