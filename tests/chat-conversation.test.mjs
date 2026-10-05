import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildConversations,
  isOwnMessage,
  mergeChatMessages,
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
