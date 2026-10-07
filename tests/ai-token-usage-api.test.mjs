import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getAiUsageOverview,
  getAiParticipantUsage,
  getAiUsageParticipants,
  getAiParticipantEvents,
} from '../src/shared/api/ai-token-usage.ts'

test('overview table keeps filters while participant events only send pagination and search', async () => {
  const original = globalThis.fetch
  const requests = []
  const page = { content: [], number: 1, size: 10, totalElements: 13, totalPages: 2 }
  globalThis.fetch = async (url) => {
    requests.push(new URL(url, 'http://test'))
    return { ok: true, json: async () => ({ status: 'success', data: page }) }
  }
  try {
    const filters = {
      from: '2026-01-01',
      to: '2026-04-01',
      activityType: 'invite_to_call',
      model: 'a/b',
    }
    const request = {
      page: 1,
      size: 10,
      search: ' %_ & model ',
      sort: ['totalTokens,asc', 'capturedAt,desc'],
    }
    assert.deepEqual(await getAiUsageParticipants(filters, request), page)
    assert.deepEqual(await getAiParticipantEvents('94839/a', request), page)
    assert.equal(requests[0].pathname, '/admin/ai-token-usage/participants')
    assert.equal(requests[1].pathname, '/admin/ai-token-usage/participants/94839%2Fa/events')
    for (const url of requests) {
      assert.equal(url.searchParams.get('page'), '1')
      assert.equal(url.searchParams.get('size'), '10')
      assert.equal(url.searchParams.get('search'), '%_ & model')
      assert.deepEqual(url.searchParams.getAll('sort'), request.sort)
    }
    for (const [key, value] of Object.entries(filters)) {
      assert.equal(requests[0].searchParams.get(key), value)
      assert.equal(requests[1].searchParams.has(key), false)
    }
  } finally {
    globalThis.fetch = original
  }
})

test('overview sends filters and interval while participant analytics has no query parameters', async () => {
  const original = globalThis.fetch
  const requests = []
  globalThis.fetch = async (url) => {
    requests.push(new URL(url, 'http://test'))
    return { ok: true, json: async () => ({ status: 'success', data: {} }) }
  }
  try {
    await getAiUsageOverview({ provider: 'openai' }, 'monthly')
    await getAiParticipantUsage('94839/a')
    assert.equal(requests[0].searchParams.get('provider'), 'openai')
    assert.equal(requests[0].searchParams.get('interval'), 'monthly')
    assert.equal(requests[0].searchParams.has('page'), false)
    assert.equal(requests[0].searchParams.has('size'), false)
    assert.equal(requests[1].pathname, '/admin/ai-token-usage/participants/94839%2Fa')
    assert.equal(requests[1].search, '')
  } finally {
    globalThis.fetch = original
  }
})
