import { Navigate, Outlet, useParams } from 'react-router-dom'
import { SimulationChannelNav } from './simulation-channel-nav'
import { SimulationInfoPanel } from './simulation-info-panel'
import { SimulationRunProvider } from './simulation-run-context'
import { useSimulationRun } from './simulation-run-context-core'
import { PageFrame } from '../../components/layout/page-frame'

function SimulationRunShell() {
  const { participantId } = useSimulationRun()

  return (
    <PageFrame mode="workbench" viewport="fill" className="simulation-runner-page">
      <SimulationInfoPanel participantId={participantId} />
      <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-[var(--page-gap)] lg:flex-row">
        <SimulationChannelNav />
        <div className="min-h-0 min-w-0 flex-1">
          <Outlet />
        </div>
      </section>
    </PageFrame>
  )
}

export function SimulationRunLayout() {
  const { participantId } = useParams()
  if (!participantId?.trim()) return <Navigate to="/simulation" replace />
  return (
    <SimulationRunProvider participantId={participantId.trim()}>
      <SimulationRunShell />
    </SimulationRunProvider>
  )
}
