export function studioUrl(groupSimulationId: string, simulationId?: string) {
  const path = `/studio/${encodeURIComponent(groupSimulationId)}`
  return simulationId ? `${path}?${new URLSearchParams({ simulation: simulationId })}` : path
}
