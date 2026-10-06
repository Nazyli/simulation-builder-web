import assert from 'node:assert/strict'
import test from 'node:test'
import { getTimers } from '../src/shared/api/timers.ts'

test('timer API sends paging, encoded search and repeated sort; unwraps Page', async () => {
  const original = globalThis.fetch
  const page = { content: [], totalElements: 13, totalPages: 2, number: 1 }
  let requested
  globalThis.fetch = async (url) => {
    requested = new URL(url, 'http://test')
    return { ok: true, json: async () => ({ status: 'success', data: page }) }
  }
  try {
    const result = await getTimers({
      page: 1,
      size: 10,
      search: 'A & B',
      sort: ['status,asc', 'dueAt,desc'],
      nodeExecutionId: 'node/1',
    })
    assert.equal(requested.pathname, '/admin/timers')
    assert.equal(requested.searchParams.get('page'), '1')
    assert.equal(requested.searchParams.get('size'), '10')
    assert.equal(requested.searchParams.get('search'), 'A & B')
    assert.equal(requested.searchParams.get('nodeExecutionId'), 'node/1')
    assert.deepEqual(requested.searchParams.getAll('sort'), ['status,asc', 'dueAt,desc'])
    assert.deepEqual(result, page)
    await getTimers()
    assert.equal(requested.searchParams.get('page'), '0')
    assert.equal(requested.searchParams.get('size'), '10')
    assert.equal(requested.searchParams.has('search'), false)
  } finally {
    globalThis.fetch = original
  }
})
