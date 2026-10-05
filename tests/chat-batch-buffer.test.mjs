import assert from 'node:assert/strict'
import test from 'node:test'
import { ChatBatchBuffer } from '../src/features/simulation_runner/chat/chat-batch-buffer.ts'

test('flushes queued bubbles once after the configured idle delay', async () => {
  const batches = []
  const buffer = new ChatBatchBuffer(15, (batch) => batches.push(batch))
  buffer.enqueue({ content: 'Halo', timestamp: '2026-10-05T04:00:00.000Z' })
  await new Promise((resolve) => setTimeout(resolve, 5))
  buffer.noteTyping()
  buffer.enqueue({ content: 'Apa kabar?', timestamp: '2026-10-05T04:00:02.000Z' })
  await new Promise((resolve) => setTimeout(resolve, 8))
  assert.equal(batches.length, 0)
  await new Promise((resolve) => setTimeout(resolve, 12))
  assert.deepEqual(batches, [
    [
      { content: 'Halo', timestamp: '2026-10-05T04:00:00.000Z' },
      { content: 'Apa kabar?', timestamp: '2026-10-05T04:00:02.000Z' },
    ],
  ])
  buffer.dispose()
})

test('flush sends finalized bubbles immediately and leaves later bubbles for another batch', () => {
  const batches = []
  const buffer = new ChatBatchBuffer(1000, (batch) => batches.push(batch))
  buffer.enqueue({ content: 'First', timestamp: '2026-10-05T04:00:00.000Z' })
  buffer.flush()
  buffer.enqueue({ content: 'Second', timestamp: '2026-10-05T04:00:01.000Z' })
  buffer.dispose()
  assert.deepEqual(batches, [
    [{ content: 'First', timestamp: '2026-10-05T04:00:00.000Z' }],
    [{ content: 'Second', timestamp: '2026-10-05T04:00:01.000Z' }],
  ])
})
