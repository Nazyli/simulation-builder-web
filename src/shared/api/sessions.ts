import { apiClient } from './client'
import { paginationParams, type Page, type PageRequest } from './pagination'

export interface ExecutionHistoryItem {
  executionId: string
  sessionId: string
  participantId: string
  participantFullName: string | null
  groupSimulationName: string | null
  simulationId: string
  simulationName: string | null
  status: string
  currentNodeId: string | null
  startedAt: string
  completedAt: string | null
  unreadCounts: Record<'chat' | 'email' | 'call' | 'document', number>
  createdAt: string
  lastActivityAt: string
}

export const getExecutionHistory = (
  request: PageRequest & {
    participantId?: string
    executionId?: string
    activeOnly?: boolean
  } = {},
) => {
  const params = paginationParams(request)
  if (request.participantId) params.set('participantId', request.participantId)
  if (request.executionId) params.set('executionId', request.executionId)
  if (request.activeOnly !== undefined) params.set('active_only', String(request.activeOnly))
  return apiClient<Page<ExecutionHistoryItem>>(`/admin/history/executions?${params}`)
}
