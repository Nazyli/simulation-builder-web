import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  getEmailThreadMessages,
  markEmailAttachmentOpened,
  markEmailThreadAsRead,
  sendParticipantEmail,
} from '../src/shared/api/email.ts'
import { sortAttachmentPreviewPages } from '../src/features/simulation_runner/email/types.ts'

test('serializes the selected root and direct reply email IDs for a participant email', async () => {
  let request
  globalThis.fetch = async (path, init) => {
    request = { path, init }
    return {
      ok: true,
      json: async () => ({ status: 'success', info: { code: 200, message: 'ok' }, data: {} }),
    }
  }

  await sendParticipantEmail(
    'participant 1',
    'actor-1',
    'Re: Contract',
    'Please review the revision.',
    undefined,
    undefined,
    'root-email-1',
    'direct-reply-email-2',
  )

  assert.equal(request.path, '/admin/runner/email?participantId=participant%201')
  assert.deepEqual(JSON.parse(request.init.body), {
    subject: 'Re: Contract',
    content: 'Please review the revision.',
    status: 'sent',
    to: ['actor-1'],
    cc: [],
    parentEmailId: 'root-email-1',
    replyToEmailId: 'direct-reply-email-2',
  })
})

test('derives thread scope on the backend for thread reads and mark-read', async () => {
  const requests = []
  globalThis.fetch = async (path, init) => {
    requests.push({ path, init })
    return {
      ok: true,
      json: async () => ({ status: 'success', info: { code: 200, message: 'ok' }, data: {} }),
    }
  }

  await getEmailThreadMessages('participant 1', 'root/email/1')
  await markEmailThreadAsRead('participant 1', 'root/email/1')

  assert.equal(
    requests[0].path,
    '/admin/runner/email/thread/root%2Femail%2F1?participantId=participant%201',
  )
  assert.equal(
    requests[1].path,
    '/admin/runner/email/mark-thread-read?participantId=participant%201&rootId=root%2Femail%2F1',
  )
  assert.equal(requests[1].init.method, 'POST')
})

test('passes thread messages through with canReply unchanged', async () => {
  let request
  const threadMessages = [
    {
      participantEmailId: 'participant-email-1',
      sessionId: 'session-1',
      emailPartnerId: 'actor-1',
      senderId: 'actor-1',
      senderType: 'actor',
      from: { id: 'actor-1', name: 'Dewanti', email: 'dewanti@example.com' },
      subject: 'Re: Contract',
      content: 'Please review the revision.',
      to: [{ id: 'participant-001', name: 'Participant', email: null }],
      cc: [],
      simulationId: 'simulation-1',
      parentEmailId: null,
      replyToEmailId: null,
      masterEmailId: 'master-email-1',
      status: 'sent',
      isRead: true,
      readAt: null,
      createdDate: '2026-10-20T09:00:00Z',
      attachments: [],
      canReply: false,
    },
    {
      participantEmailId: 'participant-email-2',
      sessionId: 'session-1',
      emailPartnerId: 'actor-1',
      senderId: 'actor-1',
      senderType: 'actor',
      from: { id: 'actor-1', name: 'Dewanti', email: 'dewanti@example.com' },
      subject: 'Re: Contract',
      content: 'Latest update on the contract.',
      to: [{ id: 'participant-001', name: 'Participant', email: null }],
      cc: [],
      simulationId: 'simulation-1',
      parentEmailId: 'participant-email-2',
      replyToEmailId: null,
      masterEmailId: 'master-email-2',
      status: 'sent',
      isRead: false,
      readAt: null,
      createdDate: '2026-10-20T10:00:00Z',
      attachments: [],
      canReply: true,
    },
  ]
  globalThis.fetch = async (path, init) => {
    request = { path, init }
    return {
      ok: true,
      json: async () => ({
        status: 'success',
        info: { code: 200, message: 'ok' },
        data: threadMessages,
      }),
    }
  }

  const messages = await getEmailThreadMessages('participant 1', 'root-email-1')

  assert.equal(request.path, '/admin/runner/email/thread/root-email-1?participantId=participant%201')
  assert.deepEqual(messages, threadMessages)
  assert.deepEqual(
    messages.map((message) => message.canReply),
    [false, true],
  )
  assert.deepEqual(messages[0].from, {
    id: 'actor-1',
    name: 'Dewanti',
    email: 'dewanti@example.com',
  })
  assert.deepEqual(messages[0].to, [{ id: 'participant-001', name: 'Participant', email: null }])
  assert.deepEqual(messages[0].cc, [])
  assert.equal(messages[0].senderId, 'actor-1')
})

test('serializes draft status and attachment replacements', async () => {
  let request
  globalThis.fetch = async (path, init) => {
    request = { path, init }
    return {
      ok: true,
      json: async () => ({ status: 'success', info: { code: 200, message: 'ok' }, data: {} }),
    }
  }

  await sendParticipantEmail(
    'participant 1',
    'actor-1',
    'Contract draft',
    '',
    undefined,
    undefined,
    'root-email-1',
    undefined,
    [
      {
        participantDocId: 'document-1',
        contents: [{ participantDocContentId: 'document-content-1' }],
      },
    ],
    'draft',
  )

  assert.deepEqual(JSON.parse(request.init.body), {
    subject: 'Contract draft',
    content: '',
    status: 'draft',
    to: ['actor-1'],
    cc: [],
    parentEmailId: 'root-email-1',
    attachments: [
      {
        participantDocId: 'document-1',
        contents: [{ participantDocContentId: 'document-content-1' }],
      },
    ],
  })
})

test('passes draft status explicitly from the composer action', async () => {
  const page = await readFile(
    new URL('../src/features/simulation_runner/email-channel-page.tsx', import.meta.url),
    'utf8',
  )
  const composer = await readFile(
    new URL('../src/features/simulation_runner/email/message-composer.tsx', import.meta.url),
    'utf8',
  )

  assert.match(page, /function submit\(form: HTMLFormElement, status: 'sent' \| 'draft'\)/)
  assert.match(composer, /onSubmit\(form, 'draft'\)/)
  assert.match(composer, /onSubmit\(event\.currentTarget, 'sent'\)/)
  assert.doesNotMatch(composer, /name="status"/)
})

test('marks inbox threads that still have an unsent draft', async () => {
  const sidebar = await readFile(
    new URL('../src/features/simulation_runner/email/conversation-sidebar.tsx', import.meta.url),
    'utf8',
  )
  const header = await readFile(
    new URL('../src/features/simulation_runner/email/conversation-header.tsx', import.meta.url),
    'utf8',
  )
  const api = await readFile(new URL('../src/shared/api/email.ts', import.meta.url), 'utf8')

  assert.match(api, /draftId: string \| null/)
  assert.match(api, /latestSubject: string/)
  assert.match(api, /fromName: string/)
  assert.match(api, /lastMessageContent: string/)
  assert.match(api, /lastMessageDate: string/)
  assert.match(api, /totalAttachment: number/)
  assert.doesNotMatch(api, /attachmentCount/)
  assert.match(sidebar, /\{thread\.draftId \?/)
  assert.match(header, /\{thread\.draftId \?/)
  assert.match(sidebar, /\{thread\.subject \|\|/)
  assert.match(header, /\{thread\.subject \|\|/)
  assert.doesNotMatch(sidebar, /\{thread\.latestSubject/)
  assert.doesNotMatch(header, /\{thread\.latestSubject/)
  assert.match(sidebar, /\[DRAFT\]/)
  assert.match(header, /\[DRAFT\]/)
})

test('records a runtime attachment open against its participant email scope', async () => {
  let request
  globalThis.fetch = async (path, init) => {
    request = { path, init }
    return {
      ok: true,
      json: async () => ({ status: 'success', info: { code: 200, message: 'ok' }, data: {} }),
    }
  }

  await markEmailAttachmentOpened(
    'runtime attachment/1',
    'participant 1',
    'simulation 1',
    'participant email/1',
  )

  assert.equal(
    request.path,
    '/admin/runner/email/attachments/runtime%20attachment%2F1/opened?participantId=participant+1&simulationId=simulation+1&participantEmailId=participant+email%2F1',
  )
  assert.equal(request.init.method, 'POST')
})

test('opens a runtime email attachment by email_attachment_id', async () => {
  let request
  globalThis.fetch = async (path, init) => {
    request = { path, init }
    return {
      ok: true,
      json: async () => ({ status: 'success', info: { code: 200, message: 'ok' }, data: {} }),
    }
  }

  await markEmailAttachmentOpened(
    'runtime attachment/1',
    'participant 1',
    'simulation 1',
    'participant email/1',
  )

  assert.match(request.path, /attachments\/runtime%20attachment%2F1\/opened/)
})

test('declares the runtime attachment snapshot response contract', async () => {
  const source = await readFile(new URL('../src/shared/api/email.ts', import.meta.url), 'utf8')

  assert.match(source, /emailAttachmentId: string/)
  assert.match(source, /contents: RuntimeEmailAttachmentContent\[\]/)
  assert.doesNotMatch(source, /^\s*attachment_id: string$/m)
})

test('sorts attachment preview pages in ascending page order', () => {
  const pages = sortAttachmentPreviewPages([
    {
      participantAttachmentEmailId: 'page-2',
      emailAttachmentId: 'runtime-1',
      participantDocContentId: null,
      page: 2,
      content: 'Second page',
      isHighlight: false,
      ownerName: 'actor-1',
    },
    {
      participantAttachmentEmailId: 'page-1',
      emailAttachmentId: 'runtime-1',
      participantDocContentId: null,
      page: 1,
      content: 'First page',
      isHighlight: false,
      ownerName: 'actor-1',
    },
  ])

  assert.deepEqual(
    pages.map((page) => page.participantAttachmentEmailId),
    ['page-1', 'page-2'],
  )
})
