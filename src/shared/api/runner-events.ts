import { eventsUrl } from './client'

export interface RunnerActivity {
  type: 'chat_message' | 'email_message' | 'activity_updated' | 'activity_snapshot'
  activityChat: {
    count: number
    content: string | null
    actorIdChat: string | null
    simulationId: string | null
  }
  activityEmail: { count: number; subject: string | null; parentParticipantEmailId: string | null }
  timestamp: string
}
export type RunnerEvent =
  | RunnerActivity
  | { type: 'stream_ready' }
  | { type: 'execution_status'; executionId: string; simulationId: string; status: string }

export function parseRunnerEvent(data: string): RunnerEvent | null {
  try {
    const value = JSON.parse(data)
    if (value?.type === 'stream_ready') return value
    if (value?.type === 'execution_status') {
      return ['executionId', 'simulationId', 'status'].every(
        (key) => typeof value[key] === 'string',
      )
        ? value
        : null
    }
    if (
      !['chat_message', 'email_message', 'activity_updated', 'activity_snapshot'].includes(
        value?.type,
      )
    )
      return null
    const chat = value.activityChat
    const email = value.activityEmail
    const count = (n: unknown) => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0
    const nullable = (v: unknown) => v === null || typeof v === 'string'
    if (
      !chat ||
      !email ||
      !count(chat.count) ||
      !count(email.count) ||
      typeof value.timestamp !== 'string'
    )
      return null
    if (
      ![
        chat.content,
        chat.actorIdChat,
        chat.simulationId,
        email.subject,
        email.parentParticipantEmailId,
      ].every(nullable)
    )
      return null
    if (
      value.type === 'chat_message' &&
      [chat.content, chat.actorIdChat, chat.simulationId].some((v) => typeof v !== 'string')
    )
      return null
    if (
      value.type === 'email_message' &&
      [email.subject, email.parentParticipantEmailId].some((v) => typeof v !== 'string')
    )
      return null
    return value
  } catch {
    return null
  }
}

interface Subscriber {
  notification?: (event: RunnerEvent) => void
  open?: () => void
  error?: () => void
}
interface Stream extends EventTarget {
  close(): void
}
const streams = new Map<string, { source: Stream; subscribers: Set<Subscriber> }>()

export function subscribeRunnerEvents(
  participantId: string,
  subscriber: Subscriber,
  create: (url: string) => Stream = (url) => new EventSource(url),
): () => void {
  let entry = streams.get(participantId)
  if (!entry) {
    const source = create(eventsUrl(participantId))
    entry = { source, subscribers: new Set() }
    streams.set(participantId, entry)
    const subscribers = entry.subscribers
    source.addEventListener('notification', (event) => {
      if (!(event instanceof MessageEvent)) return
      const payload = parseRunnerEvent(event.data)
      if (payload) subscribers.forEach((listener) => listener.notification?.(payload))
    })
    source.addEventListener('open', () => subscribers.forEach((listener) => listener.open?.()))
    source.addEventListener('error', () => subscribers.forEach((listener) => listener.error?.()))
  }
  entry.subscribers.add(subscriber)
  const current = entry
  return () => {
    current.subscribers.delete(subscriber)
    if (!current.subscribers.size) {
      current.source.close()
      streams.delete(participantId)
    }
  }
}
