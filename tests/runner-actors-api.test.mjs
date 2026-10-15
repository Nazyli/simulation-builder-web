import assert from 'node:assert/strict'
import test from 'node:test'
import { getRunnerActorGroups, getRunnerActors } from '../src/shared/api/runner-actors.ts'

test('Runner contacts use the admin runner playground API with frontend design and level scope', async () => {
  const original = globalThis.fetch
  const requests = []
  const contacts = [{ actorId: 'client', actorName: 'Client', actorGroupPosition: 'Client' }]
  globalThis.fetch = async (url, init) => {
    requests.push({ url: new URL(url, 'http://test'), init })
    return { ok: true, json: async () => ({ status: 'success', data: contacts }) }
  }
  try {
    assert.deepEqual(
      await getRunnerActors({ search: '%_ / &', actorGroupPosition: 'Client & Partners' }),
      contacts,
    )
    const { url } = requests[0]
    assert.equal(url.pathname, '/admin/runner/actors')
    assert.equal(url.searchParams.get('designId'), 'ambj-01')
    assert.equal(url.searchParams.get('levelId'), '3')
    assert.equal(url.searchParams.get('search'), '%_ / &')
    assert.equal(url.searchParams.get('actorGroupPosition'), 'Client & Partners')
    await getRunnerActors()
    assert.equal(requests[1].url.searchParams.has('actorGroupPosition'), false)
    await getRunnerActors({ actorGroupPosition: '' })
    assert.equal(requests[2].url.searchParams.get('actorGroupPosition'), '')
  } finally {
    globalThis.fetch = original
  }
})

test('Runner group query uses the same scope and propagates cancellation', async () => {
  const original = globalThis.fetch
  const controller = new AbortController()
  let requested
  globalThis.fetch = async (url, init) => {
    requested = { url: new URL(url, 'http://test'), init }
    return { ok: true, json: async () => ({ status: 'success', data: [null, '', 'Client'] }) }
  }
  try {
    assert.deepEqual(await getRunnerActorGroups('cli', controller.signal), [null, '', 'Client'])
    assert.equal(requested.url.pathname, '/admin/runner/actors/groups')
    assert.equal(requested.url.searchParams.get('designId'), 'ambj-01')
    assert.equal(requested.url.searchParams.get('levelId'), '3')
    assert.equal(requested.url.searchParams.get('search'), 'cli')
    assert.equal(requested.init.signal, controller.signal)
    await getRunnerActors({}, controller.signal)
    assert.equal(requested.init.signal, controller.signal)
  } finally {
    globalThis.fetch = original
  }
})
