import type {
  AiUsageAggregate,
  AiUsageEvent,
  AiUsageParticipant,
  AiUsageSummary,
  AiUsageTrendPoint,
  UsageInterval,
} from '../../shared/api/ai-token-usage'
import type {
  DimensionUsage,
  ParticipantUsage,
  UsageEvent,
  UsageSummary,
  UsageTimeBucket,
} from './usage-types'

export function adaptSummary(summary: AiUsageSummary): UsageSummary {
  return {
    totalTokens: summary.totalTokens,
    totalCostByCurrency: summary.costs,
    totalRequests: summary.requestCount,
    averageTokensPerRequest: summary.averageTokensPerRequest,
  }
}

export function adaptParticipants(rows: AiUsageParticipant[]): ParticipantUsage[] {
  return rows.map((row) => ({
    participantId: row.participantId,
    requests: row.requestCount,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    totalTokens: row.totalTokens,
    averageTokensPerRequest: row.averageTokensPerRequest,
  }))
}

function displayBucketLabel(value: string, interval: UsageInterval): string {
  const dateValue = value.length === 7 ? `${value}-01` : value
  const date = new Date(`${dateValue}T00:00:00Z`)
  const options: Intl.DateTimeFormatOptions =
    interval === 'monthly'
      ? { month: 'short', year: 'numeric' }
      : { month: 'short', day: 'numeric' }
  return new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(date)
}

export function adaptTrend(rows: AiUsageTrendPoint[], interval: UsageInterval): UsageTimeBucket[] {
  return rows.map((row) => ({
    key: row.date,
    label: displayBucketLabel(row.date, interval),
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    totalTokens: row.totalTokens,
  }))
}

export function adaptDimensions(
  rows: AiUsageAggregate[],
  dimension: 'simulation' | 'model' | 'activityType' | 'nodeType',
  totalTokens: number,
): DimensionUsage[] {
  return rows
    .map((row) => ({
      id:
        dimension === 'simulation'
          ? (row.simulationId ?? 'unknown-simulation')
          : dimension === 'model'
            ? `${row.provider ?? 'unknown-provider'}\u0000${row.model ?? 'unknown-model'}\u0000${row.serviceType ?? 'unknown-service'}`
            : `${dimension}:${row[dimension] ?? 'unspecified'}`,
      label:
        dimension === 'simulation'
          ? (row.simulationId ?? 'Unknown simulation')
          : dimension === 'model'
            ? (row.model ?? 'Unknown model')
            : (row[dimension] ?? 'Unspecified').replaceAll('_', ' '),
      ...(dimension === 'model' ? { provider: row.provider ?? undefined } : {}),
      requests: row.requestCount ?? 0,
      inputTokens: row.inputTokens ?? 0,
      outputTokens: row.outputTokens ?? 0,
      totalTokens: row.totalTokens,
      costByCurrency: row.costs ?? [],
      contributionPercent: totalTokens ? (row.totalTokens / totalTokens) * 100 : 0,
    }))
    .sort((left, right) => right.totalTokens - left.totalTokens || left.id.localeCompare(right.id))
}

export function adaptEvent(row: AiUsageEvent): UsageEvent {
  return {
    usage_id: row.usageId,
    simulation_id: row.simulationId,
    activity_type: row.activityType,
    node_type: row.nodeType,
    service_type: row.serviceType,
    provider: row.provider,
    model: row.model,
    input_tokens: row.inputTokens,
    output_tokens: row.outputTokens,
    total_tokens: row.totalTokens,
    total_cost: row.totalCost,
    currency: row.currency,
    captured_at: row.capturedAt,
  }
}
