import type { UsageFilters } from './usage-types'

const filterParams: [keyof UsageFilters, string][] = [
  ['from', 'from'],
  ['to', 'to'],
  ['simulationId', 'simulation'],
  ['participantId', 'participant'],
  ['provider', 'provider'],
  ['model', 'model'],
  ['activityType', 'activity'],
]

export function readUsageFilters(params: URLSearchParams): UsageFilters {
  return Object.fromEntries(
    filterParams.flatMap(([key, param]) => {
      const value = params.get(param)
      return value ? [[key, value]] : []
    }),
  ) as UsageFilters
}

export function writeUsageFilters(filters: UsageFilters): URLSearchParams {
  const params = new URLSearchParams()
  for (const [key, param] of filterParams) {
    if (filters[key]) params.set(param, filters[key]!)
  }
  return params
}
