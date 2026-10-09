import assert from 'node:assert/strict'
import test from 'node:test'
import { groupActorContacts } from '../src/features/simulation_runner/components/actor-picker-logic.ts'

test('contact grouping keeps null, empty and a literal Ungrouped group distinct', () => {
  const contacts = [
    { actorId: 'null', actorGroupPosition: null },
    { actorId: 'empty', actorGroupPosition: '' },
    { actorId: 'literal', actorGroupPosition: 'Ungrouped' },
    { actorId: 'second-empty', actorGroupPosition: '' },
  ]
  assert.deepEqual(
    groupActorContacts(contacts).map(({ group, label, actors }) => ({
      group,
      label,
      ids: actors.map((actor) => actor.actorId),
    })),
    [
      { group: '', label: 'Empty group', ids: ['empty', 'second-empty'] },
      { group: null, label: 'No group', ids: ['null'] },
      { group: 'Ungrouped', label: 'Ungrouped', ids: ['literal'] },
    ],
  )
})
