import assert from 'node:assert/strict'
import test from 'node:test'
import { parseRunnerEvent, subscribeRunnerEvents } from '../src/shared/api/runner-events.ts'

const payload = {
  type: 'chat_message',
  activityChat: { count: 2, content: 'hello', actorIdChat: 'actor', simulationId: 'sim' },
  activityEmail: { count: 1, subject: null, parentParticipantEmailId: null },
  timestamp: '2026-10-11T03:00:00Z',
}

test('compact events parse while malformed payloads are ignored', () => {
  assert.deepEqual(parseRunnerEvent(JSON.stringify(payload)), payload)
  assert.equal(parseRunnerEvent('{'), null)
  assert.equal(parseRunnerEvent(JSON.stringify({ ...payload, activityChat: { count: -1 } })), null)
  assert.equal(parseRunnerEvent(JSON.stringify({ ...payload, type: 'unknown' })), null)
})

test('participant subscriptions share one stream and only last unsubscribe closes it', () => {
  const streams = []
  const create = () => {
    const stream = new EventTarget()
    stream.close = () => (stream.closed = true)
    streams.push(stream)
    return stream
  }
  const received = []
  const stop1 = subscribeRunnerEvents(
    'p',
    { notification: (event) => received.push(event) },
    create,
  )
  const stop2 = subscribeRunnerEvents('p', {}, create)
  assert.equal(streams.length, 1)
  streams[0].dispatchEvent(new MessageEvent('notification', { data: JSON.stringify(payload) }))
  assert.deepEqual(received, [payload])
  stop1()
  assert.equal(streams[0].closed, undefined)
  stop2()
  assert.equal(streams[0].closed, true)
})
