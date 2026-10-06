import { apiClient } from './client'
import { paginationParams, type Page, type PageRequest } from './pagination'

export type TransParticipantTimer = {
  participantTimerId: string
  nodeExecutionId: string
  sessionId: string | null
  executionId: string | null
  nodeId: string | null
  nodeType: string | null
  nodeName: string | null
  nodeConfiguration: Record<string, unknown> | null
  participantId: string | null
  participantFullName: string | null
  groupSimulationName: string | null
  simulationName: string | null
  masterSimulation?: string | null
  status: string
  canReschedule: boolean
  dueAt: string
  attemptCount: number
  maxAttempts: number
  retryDelaySeconds: number
  lastError: string | null
  cancelledAt: string | null
  createdDate: string
}

export const getTimers = (request: PageRequest & { nodeExecutionId?: string } = {}) => {
  const params = paginationParams(request)
  if (request.nodeExecutionId) params.set('nodeExecutionId', request.nodeExecutionId)
  return apiClient<Page<TransParticipantTimer>>(`/admin/timers?${params}`)
}
export const cancelTimer = (participantTimerId: string) =>
  apiClient<TransParticipantTimer>(`/admin/timers/${participantTimerId}/cancel`, { method: 'POST' })
export const rescheduleTimer = (participantTimerId: string, dueAt: string) =>
  apiClient<TransParticipantTimer>(`/admin/timers/${participantTimerId}/reschedule`, {
    method: 'POST',
    body: JSON.stringify({ dueAt: dueAt }),
  })
export const runTimerNow = (participantTimerId: string) =>
  apiClient<TransParticipantTimer>(`/admin/timers/${participantTimerId}/run-now`, {
    method: 'POST',
  })
