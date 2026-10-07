import { apiClient } from './client'
import { paginationParams, type Page, type PageRequest } from './pagination'

export type UsageInterval = 'daily' | 'weekly' | 'monthly'

export interface CurrencyAmount {
  currency: string
  amount: number
}

export interface AiUsageSummary {
  requestCount: number
  totalTokens: number
  averageTokensPerRequest: number
  costs: CurrencyAmount[]
}

export interface AiOverviewSummary extends AiUsageSummary {
  participantCount: number
}

export interface AiParticipantSummary extends AiUsageSummary {
  inputTokens: number
  outputTokens: number
}

export interface AiUsageTrendPoint {
  date: string
  totalTokens: number
  inputTokens: number
  outputTokens: number
}

interface AiUsageTotals {
  totalTokens: number
}

export interface AiUsageAggregate extends AiUsageTotals {
  activityType?: string | null
  nodeType?: string | null
  simulationId?: string
  provider?: string | null
  model?: string | null
  serviceType?: string
  requestCount?: number
  inputTokens?: number
  outputTokens?: number
  costs?: CurrencyAmount[]
}

export interface AiActivityUsage extends AiUsageTotals {
  activityType: string
  requestCount: number
  inputTokens: number
  outputTokens: number
}

export interface AiNodeUsage extends AiUsageTotals {
  nodeType: string | null
  requestCount: number
}

export interface AiSimulationUsage extends AiUsageTotals {
  simulationId: string
}

export interface AiModelUsage extends AiUsageTotals {
  provider: string | null
  model: string | null
  serviceType: string
  requestCount: number
}

export interface AiParticipantModelUsage extends AiModelUsage {
  inputTokens: number
  outputTokens: number
  costs: CurrencyAmount[]
}

export interface AiUsageParticipant {
  participantId: string
  requestCount: number
  totalTokens: number
  inputTokens: number
  outputTokens: number
  averageTokensPerRequest: number
}

export interface AiUsageEvent {
  usageId: string
  simulationId: string
  activityType: string
  nodeType: string | null
  serviceType: string
  provider: string | null
  model: string | null
  inputTokens: number
  outputTokens: number
  totalTokens: number
  totalCost: number
  currency: string
  capturedAt: string
}

export interface AiUsageFilterOptions {
  simulationIds: string[]
  providers: string[]
  models: string[]
  activityTypes: string[]
}

export interface AiUsageOverview {
  summary: AiOverviewSummary
  trend: AiUsageTrendPoint[]
  trendInterval: UsageInterval
  requestActivity: AiRequestActivity
  byActivityType: AiActivityUsage[]
  byNodeType: AiNodeUsage[]
  bySimulation: AiSimulationUsage[]
  byModel: AiModelUsage[]
  filterOptions: AiUsageFilterOptions
}

export interface AiRequestActivity {
  dateFrom: string | null
  dateTo: string | null
  days: { date: string; requestCount: number }[]
}

export interface AiParticipantUsage {
  summary: AiParticipantSummary
  trend?: AiUsageTrendPoint[]
  trendInterval?: UsageInterval
  byActivityType: AiActivityUsage[]
  byNodeType: AiNodeUsage[]
  bySimulation: AiSimulationUsage[]
  byModel: AiParticipantModelUsage[]
}

export interface AiUsageFilters {
  from?: string
  to?: string
  simulationId?: string
  participantId?: string
  provider?: string
  model?: string
  activityType?: string
}

function queryString(filters: AiUsageFilters, values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries({ ...filters, ...values })) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  return params.toString()
}

export function getAiUsageOverview(filters: AiUsageFilters, interval: UsageInterval) {
  const query = queryString(filters, { interval })
  return apiClient<AiUsageOverview>(`/admin/ai-token-usage?${query}`)
}

export function getAiParticipantUsage(participantId: string) {
  return apiClient<AiParticipantUsage>(
    `/admin/ai-token-usage/participants/${encodeURIComponent(participantId)}`,
  )
}

export function usagePageParams(filters: AiUsageFilters, request: PageRequest): string {
  const params = paginationParams(request)
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value)
  }
  return params.toString()
}

export function getAiUsageParticipants(filters: AiUsageFilters, request: PageRequest) {
  return apiClient<Page<AiUsageParticipant>>(
    `/admin/ai-token-usage/participants?${usagePageParams(filters, request)}`,
  )
}

export function getAiParticipantEvents(participantId: string, request: PageRequest) {
  return apiClient<Page<AiUsageEvent>>(
    `/admin/ai-token-usage/participants/${encodeURIComponent(participantId)}/events?${paginationParams(request)}`,
  )
}
