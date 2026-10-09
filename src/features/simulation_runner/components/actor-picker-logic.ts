import type { RunnerActor } from '../../../shared/api/runner-actors'

export function actorGroupLabel(group: string | null): string {
  return group === null ? 'No group' : group === '' ? 'Empty group' : group
}

export function groupActorContacts(contacts: readonly RunnerActor[]) {
  const groups = new Map<string | null, RunnerActor[]>()
  for (const actor of contacts) {
    const group = actor.actorGroupPosition
    const actors = groups.get(group) ?? []
    actors.push(actor)
    groups.set(group, actors)
  }
  return [...groups]
    .map(([group, actors]) => ({ group, label: actorGroupLabel(group), actors }))
    .sort((a, b) => a.label.localeCompare(b.label))
}
