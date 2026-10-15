import { apiClient } from './client.ts'

// Temporary Runner scope until design and level are supplied by the session.
export const RUNNER_ACTOR_SCOPE = { designId: 'ambj-01', levelId: '3' } as const

export interface RunnerActor {
  actorId: string
  actorName: string
  actorEmail: string | null
  actorPosition: string | null
  actorGroupPosition: string | null
}

export interface RunnerActorFilters {
  search?: string
  actorGroupPosition?: string
}

export const getRunnerActorGroups = (search = '', signal?: AbortSignal) => {
  const params = new URLSearchParams({ ...RUNNER_ACTOR_SCOPE, search })
  return apiClient<(string | null)[]>(`/admin/runner/actors/groups?${params}`, { signal })
}

export const getRunnerActors = (filters: RunnerActorFilters = {}, signal?: AbortSignal) => {
  const params = new URLSearchParams({ ...RUNNER_ACTOR_SCOPE, search: filters.search ?? '' })
  if (filters.actorGroupPosition !== undefined) {
    params.set('actorGroupPosition', filters.actorGroupPosition)
  }
  return apiClient<RunnerActor[]>(`/admin/runner/actors?${params}`, { signal })
}
