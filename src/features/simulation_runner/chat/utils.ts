import type { ChatMessageHistory, ChatMessage as ApiChatMessage } from '../../../shared/api/chat'
import type { ChatConversation, ChatMessage } from './types'

export function flattenChatMessageHistory(data?: ChatMessageHistory | null): ApiChatMessage[] {
  return data?.content?.flatMap((group) => group.messages ?? []) ?? []
}

export function mergeHistoryPages(
  olderMessages: ApiChatMessage[],
  initialMessages: ApiChatMessage[],
  incoming: ApiChatMessage[],
): ApiChatMessage[] {
  if (!incoming.length) return olderMessages
  const knownIds = new Set(
    [...olderMessages, ...initialMessages].map((message) => message.participantChatId),
  )
  const fresh = incoming.filter((message) => !knownIds.has(message.participantChatId))
  return [...fresh, ...olderMessages]
}

export function formatChatTime(timestamp?: string): string {
  if (!timestamp) return 'Just now'
  const date = new Date(timestamp)
  return Number.isNaN(date.getTime())
    ? 'Just now'
    : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function isOwnMessage(message: ChatMessage, participantId: string): boolean {
  if (message.senderType === 'participant') return true
  if (message.senderType === 'actor') return false
  return message.from ? message.from === participantId : message.actor === participantId
}

export function mergeChatMessages(
  serverMessages: ChatMessage[],
  localMessages: ChatMessage[],
): ChatMessage[] {
  const signatureFor = (message: ChatMessage) => {
    const sentAt = new Date(message.timestamp).getTime()
    return [message.senderType, message.to, message.content, sentAt].join('\u0000')
  }
  const serverSignatures = new Set(serverMessages.map(signatureFor))
  const messages = [...serverMessages]
  const pendingMessages = localMessages
    .filter((message) => !serverSignatures.has(signatureFor(message)))
    .sort((a, b) => messageTimeMicros(a) - messageTimeMicros(b))

  for (const pendingMessage of pendingMessages) {
    const pendingTime = messageTimeMicros(pendingMessage)
    const insertAt = messages.findIndex((message) => messageTimeMicros(message) > pendingTime)
    messages.splice(insertAt < 0 ? messages.length : insertAt, 0, pendingMessage)
  }

  return messages
}

export interface MessageLinkSegment {
  text: string
  url: string | null
}

const MESSAGE_URL_PATTERN = /https?:\/\/[^\s]+/g

export function splitMessageLinks(content: string): MessageLinkSegment[] {
  const segments: MessageLinkSegment[] = []
  let lastIndex = 0
  for (const match of content.matchAll(MESSAGE_URL_PATTERN)) {
    const index = match.index ?? 0
    if (index > lastIndex) {
      segments.push({ text: content.slice(lastIndex, index), url: null })
    }
    segments.push({ text: match[0], url: match[0] })
    lastIndex = index + match[0].length
  }
  if (lastIndex < content.length) {
    segments.push({ text: content.slice(lastIndex), url: null })
  }
  return segments
}

export function buildConversations(
  messages: ChatMessage[],
  actorNames: Record<string, string>,
  participantId: string,
): ChatConversation[] {
  const grouped = new Map<string, ChatMessage[]>()
  for (const message of messages) {
    const counterpart =
      message.senderType === 'participant'
        ? message.to || message.actor
        : message.from || message.actor
    if (!counterpart || counterpart === participantId) continue
    const list = grouped.get(counterpart) ?? []
    list.push(message)
    grouped.set(counterpart, list)
  }
  const actorIds = new Set<string>(
    [...grouped.keys(), ...Object.keys(actorNames)].filter((id) => id && id !== participantId),
  )
  return [...actorIds]
    .map((actor) => {
      const list = grouped.get(actor) ?? []
      return {
        actor,
        actorName: actorNames[actor] ?? actor,
        messages: list,
        lastMessage: list[list.length - 1] ?? null,
        unreadCount: list.filter(
          (message) => message.isUnread && !isOwnMessage(message, participantId),
        ).length,
      }
    })
    .sort((a, b) => {
      const aTime = a.lastMessage ? messageTime(a.lastMessage) : 0
      const bTime = b.lastMessage ? messageTime(b.lastMessage) : 0
      if (aTime !== bTime) return bTime - aTime
      return a.actorName.localeCompare(b.actorName)
    })
}

export function formatConversationTime(timestamp?: string | null): string {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString([], { day: '2-digit', month: 'short' })
}

/**
 * Online badge source of truth: the workflow graph roster (`chat/actors`).
 * An actor that is not part of the graph is offline, so a new chat with a
 * contact picked outside the graph is not shown as online.
 */
export function resolveActorOnline(
  actorId: string,
  onlineByActor: ReadonlyMap<string, boolean>,
): boolean {
  return onlineByActor.get(actorId) ?? false
}

export function applyConversationPresence<
  T extends {
    actorId: string
    actorName: string
    createdDate?: string | null
    isOnline?: boolean
  },
>(conversations: T[], onlineByActor: ReadonlyMap<string, boolean>): T[] {
  return [...conversations]
    .map((conversation) => ({
      ...conversation,
      isOnline: conversation.isOnline ?? onlineByActor.get(conversation.actorId) ?? false,
    }))
    .sort((a, b) => {
      const aTime = conversationTime(a.createdDate)
      const bTime = conversationTime(b.createdDate)
      if (aTime !== bTime) return bTime - aTime
      return a.actorName.localeCompare(b.actorName)
    })
}

function conversationTime(timestamp?: string | null): number {
  if (!timestamp) return 0
  const time = new Date(timestamp).getTime()
  return Number.isNaN(time) ? 0 : time
}

function messageTime(message: ChatMessage): number {
  const time = new Date(message.timestamp).getTime()
  return Number.isNaN(time) ? 0 : time
}

function messageTimeMicros(message: ChatMessage): number {
  const time = messageTime(message)
  if (!time) return 0

  const fractionalSeconds = message.timestamp.match(/\.(\d+)/)?.[1] ?? ''
  const remainingMicros = Number(fractionalSeconds.slice(3, 6).padEnd(3, '0') || 0)
  return time * 1000 + remainingMicros
}
