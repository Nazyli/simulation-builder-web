import { apiClient } from './client'
import type { Execution } from '../types/simulation'
import type { RunnerParticipantProfile } from '../../features/simulation_runner/runner-participant-profile'

export interface NodeExecution {
  nodeExecutionId: string
  nodeId: string
  status: string
  selectedPort: string | null
  selectedEdgeId: string | null
  sequenceNumber: number
  outputData: Record<string, unknown> | null
}
export interface ExecutionTrace {
  eventId: string
  nodeId: string
  eventType: string
  payload: Record<string, unknown>
  createdAt: string
}
export const getExecutions = (simulationId: string, participantId: string) =>
  apiClient<Execution[]>(
    `/admin/runner/executions?simulationId=${encodeURIComponent(simulationId)}&participantId=${encodeURIComponent(participantId)}`,
  )
export const getParticipantExecutions = (participantId: string) =>
  apiClient<Execution[]>(
    `/admin/runner/sessions/executions?participantId=${encodeURIComponent(participantId)}`,
  )
export interface BatchExecutionRun extends Execution {
  outcome: 'created' | 'resumed' | 'archived'
}
export interface BatchExecutionResponse {
  participantId: string
  runs: BatchExecutionRun[]
}
export const startExecutionBatch = (payload: {
  participantId: string
  simulationIds: string[]
  participantFullName: string
  participantGender: RunnerParticipantProfile['participantGender']
  participantLanguage: RunnerParticipantProfile['participantLanguage']
  participantActorId: string
  context?: Record<string, unknown>
}) =>
  apiClient<BatchExecutionResponse>('/admin/runner/executions/batch', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
export const deleteExecution = (executionId: string, participantId: string) =>
  apiClient<void>(
    `/admin/runner/executions/${executionId}?participantId=${encodeURIComponent(participantId)}`,
    { method: 'DELETE' },
  )
export const getNodeExecutions = (executionId: string, participantId: string) =>
  apiClient<NodeExecution[]>(
    `/admin/runner/executions/${executionId}/node-executions?participantId=${encodeURIComponent(participantId)}`,
  )
export const getExecutionTrace = async (
  executionId: string,
  participantId: string,
): Promise<ExecutionTrace[]> =>
  (await getNodeExecutions(executionId, participantId)).map((item) => ({
    eventId: item.nodeExecutionId,
    nodeId: item.nodeId,
    eventType: item.status,
    payload: {
      selectedPort: item.selectedPort,
      selectedEdgeId: item.selectedEdgeId,
      outputData: item.outputData,
    },
    createdAt: '',
  }))
