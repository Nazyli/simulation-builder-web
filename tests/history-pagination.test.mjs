import assert from 'node:assert/strict'
import test from 'node:test'
import { getExecutionHistory } from '../src/shared/api/sessions.ts'

test('history API sends pagination, repeated sort and exact execution filters', async () => {
  const original = globalThis.fetch
  const page = { content: [], totalElements: 13, totalPages: 2, number: 1 }
  let requested
  globalThis.fetch = async (url) => {
    requested = new URL(url, 'http://test')
    return { ok: true, json: async () => ({ status: 'success', data: page }) }
  }
  try {
    assert.deepEqual(
      await getExecutionHistory({
        page: 1,
        size: 20,
        search: 'A & B',
        sort: ['status,asc', 'startedAt,desc'],
        participantId: 'participant/1',
        executionId: 'execution/12',
        activeOnly: true,
      }),
      page,
    )
    assert.equal(requested.pathname, '/admin/history/executions')
    assert.equal(requested.searchParams.get('page'), '1')
    assert.equal(requested.searchParams.get('size'), '20')
    assert.equal(requested.searchParams.get('search'), 'A & B')
    assert.deepEqual(requested.searchParams.getAll('sort'), ['status,asc', 'startedAt,desc'])
    assert.equal(requested.searchParams.get('participantId'), 'participant/1')
    assert.equal(requested.searchParams.get('executionId'), 'execution/12')
    assert.equal(requested.searchParams.get('active_only'), 'true')
  } finally {
    globalThis.fetch = original
  }
})
