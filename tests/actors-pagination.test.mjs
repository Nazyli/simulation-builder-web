import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getAllMasterActors,
  getMasterActors,
  getStudioMasterData,
} from '../src/shared/api/master-data.ts'

test('actors API sends paging, literal search and repeated sorting', async () => {
  const original = globalThis.fetch
  let requested
  const page = { content: [], number: 1, totalElements: 13, totalPages: 2, last: true }
  globalThis.fetch = async (url) => {
    requested = new URL(url, 'http://test')
    return { ok: true, json: async () => ({ status: 'success', data: page }) }
  }
  try {
    assert.deepEqual(
      await getMasterActors({
        page: 1,
        size: 10,
        search: 'Name %_ & email',
        sort: ['actorName,asc', 'actorId,desc'],
      }),
      page,
    )
    assert.equal(requested.pathname, '/admin/master-data/actors')
    assert.equal(requested.searchParams.get('page'), '1')
    assert.equal(requested.searchParams.get('size'), '10')
    assert.equal(requested.searchParams.get('search'), 'Name %_ & email')
    assert.deepEqual(requested.searchParams.getAll('sort'), ['actorName,asc', 'actorId,desc'])
  } finally {
    globalThis.fetch = original
  }
})

test('Studio and Runner catalog adapters retain actors beyond the first page', async () => {
  const original = globalThis.fetch
  const requests = []
  globalThis.fetch = async (url) => {
    const requested = new URL(url, 'http://test')
    requests.push(requested)
    const page = Number(requested.searchParams.get('page'))
    const content = page === 0 ? [{ actorId: 'first' }] : [{ actorId: 'later' }]
    return {
      ok: true,
      json: async () => ({ status: 'success', data: { content, last: page === 1 } }),
    }
  }
  try {
    assert.deepEqual(await getAllMasterActors(), [{ actorId: 'first' }, { actorId: 'later' }])
    assert.deepEqual(
      requests.map((url) => url.searchParams.get('page')),
      ['0', '1'],
    )
    assert.ok(requests.every((url) => url.searchParams.get('size') === '100'))
    assert.deepEqual(await getStudioMasterData('/admin/master-data/actors'), [
      { actorId: 'first' },
      { actorId: 'later' },
    ])
  } finally {
    globalThis.fetch = original
  }
})
