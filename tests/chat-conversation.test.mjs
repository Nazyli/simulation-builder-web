import assert from 'node:assert/strict'
import test from 'node:test'

import {
  applyConversationPresence,
  buildConversations,
  flattenChatMessageHistory,
  formatConversationTime,
  isOwnMessage,
  mergeChatMessages,
  mergeHistoryPages,
  resolveActorOnline,
} from '../src/features/simulation_runner/chat/utils.ts'

test('groups both directions into the selected actor conversation', () => {
  const conversations = buildConversations(
    [
      {
        messageId: 'participant-message',
        from: '90722',
        to: 'alexa-pmwm-ambj-01',
        actor: '90722',
        senderType: 'participant',
        channel: 'chat',
        chatId: null,
        content: 'Halo Pak De',
        timestamp: '2026-09-14T03:53:49',
        actionType: 'message',
      },
      {
        messageId: 'actor-message',
        from: 'alexa-pmwm-ambj-01',
        to: 'alexa-pmwm-ambj-01',
        actor: 'alexa-pmwm-ambj-01',
        senderType: 'actor',
        channel: 'chat',
        chatId: null,
        content: 'Selamat siang Pak Nazyli',
        timestamp: '2026-09-14T03:53:53',
        actionType: 'message',
      },
    ],
    { 'alexa-pmwm-ambj-01': 'Alexa' },
    '90722',
  )

  assert.equal(conversations.length, 1)
  assert.equal(conversations[0].messages.length, 2)
})

test('uses sender type to identify participant messages as own messages', () => {
  const participantMessage = {
    from: 'participant-001-ambj-01-platform',
    to: 'alexa-pmwm-ambj-01',
    actor: 'participant-001-ambj-01-platform',
    senderType: 'participant',
  }
  const actorMessage = {
    from: 'alexa-pmwm-ambj-01',
    to: 'participant-001-ambj-01-platform',
    actor: 'alexa-pmwm-ambj-01',
    senderType: 'actor',
  }

  assert.equal(isOwnMessage(participantMessage, '90722'), true)
  assert.equal(isOwnMessage(actorMessage, '90722'), false)
})

test('keeps an optimistic bubble visible and replaces it with its persisted row without duplication', () => {
  const optimistic = {
    messageId: 'queued-1',
    to: 'actor-1',
    from: 'participant-1',
    actor: 'participant-1',
    senderType: 'participant',
    channel: 'chat',
    chatId: null,
    content: 'Hello',
    timestamp: '2026-10-05T04:00:00.000Z',
    actionType: 'message',
    simulationId: 'simulation-1',
  }
  const persisted = { ...optimistic, messageId: 'server-1' }

  assert.deepEqual(mergeChatMessages([], [optimistic]), [optimistic])
  assert.deepEqual(mergeChatMessages([persisted], [optimistic]), [persisted])
})

test('preserves separate persisted rows even when their visible fields match', () => {
  const first = {
    messageId: 'server-1',
    to: 'actor-1',
    from: 'participant-1',
    actor: 'participant-1',
    senderType: 'participant',
    channel: 'chat',
    chatId: null,
    content: 'Repeated',
    timestamp: '2026-10-05T04:00:00.000Z',
    actionType: 'message',
  }
  const second = { ...first, messageId: 'server-2' }

  assert.deepEqual(mergeChatMessages([first, second], []), [first, second])
})

test('applies online presence from the actors roster and sorts newest first', () => {
  const merged = applyConversationPresence(
    [
      { actorId: 'actor-old', actorName: 'Old', createdDate: '2026-10-10T10:00:00+07:00' },
      {
        actorId: 'actor-new',
        actorName: 'New',
        createdDate: '2026-10-11T10:00:00+07:00',
        isOnline: false,
      },
    ],
    new Map([['actor-old', true]]),
  )

  assert.equal(merged[0].actorId, 'actor-new')
  assert.equal(merged[0].isOnline, false)
  assert.equal(merged[1].isOnline, true)
})

test('resolves online from the graph roster and treats unknown actors as offline', () => {
  const roster = new Map([
    ['actor-in-graph', true],
    ['actor-explicit-offline', false],
  ])

  assert.equal(resolveActorOnline('actor-in-graph', roster), true)
  assert.equal(resolveActorOnline('actor-explicit-offline', roster), false)
  // A contact picked for a new chat but absent from the graph is offline.
  assert.equal(resolveActorOnline('actor-outside-graph', roster), false)
  assert.equal(resolveActorOnline('actor-outside-graph', new Map()), false)
})

test('formats conversation timestamps as time today and date otherwise', () => {
  assert.equal(formatConversationTime(null), '')
  assert.equal(formatConversationTime('not-a-date'), '')
  assert.ok(formatConversationTime(new Date().toISOString()).length > 0)
  assert.equal(
    formatConversationTime('2020-01-02T10:00:00Z'),
    new Date('2020-01-02T10:00:00Z').toLocaleDateString([], { day: '2-digit', month: 'short' }),
  )
})
test('flattens grouped message history oldest-first and tolerates empty shapes', () => {
  const first = { participantChatId: 'chat-1', content: 'Halo' }
  const second = { participantChatId: 'chat-2', content: 'Siang' }

  assert.deepEqual(
    flattenChatMessageHistory({
      content: [
        { date: '2026-10-10', messages: [first] },
        { date: '2026-10-11', messages: [second] },
      ],
    }),
    [first, second],
  )
  assert.deepEqual(flattenChatMessageHistory({ content: [] }), [])
  assert.deepEqual(flattenChatMessageHistory(), [])
  assert.deepEqual(flattenChatMessageHistory(null), [])
})

test('prepends older history pages without duplicating known messages', () => {
  const initial = [{ participantChatId: 'chat-3', content: 'Newest' }]
  const older = [{ participantChatId: 'chat-1', content: 'Oldest' }]
  const incoming = [
    { participantChatId: 'chat-1', content: 'Oldest' },
    { participantChatId: 'chat-0', content: 'Even older' },
  ]

  assert.deepEqual(mergeHistoryPages(older, initial, incoming), [
    { participantChatId: 'chat-0', content: 'Even older' },
    { participantChatId: 'chat-1', content: 'Oldest' },
  ])
  assert.deepEqual(mergeHistoryPages(older, initial, []), older)
})

test('preserves server order for rows with different microseconds in the same millisecond', () => {
  const first = {
    messageId: 'server-z',
    senderType: 'participant',
    content: 'First',
    timestamp: '2026-10-05T04:00:00.123100Z',
  }
  const second = {
    ...first,
    messageId: 'server-a',
    content: 'Second',
    timestamp: '2026-10-05T04:00:00.123900Z',
  }
  const optimistic = {
    ...first,
    messageId: 'queued-1',
    content: 'Optimistic',
    timestamp: '2026-10-05T04:00:00.123Z',
  }

  assert.deepEqual(mergeChatMessages([first, second], []), [first, second])
  assert.deepEqual(mergeChatMessages([first, second], [optimistic]), [optimistic, first, second])
})
