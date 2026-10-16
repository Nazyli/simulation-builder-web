import { apiClient } from './client'

export interface ChatMessage {
  participantChatId: string
  groupingChatId: string
  sessionId: string
  chatPartnerId: string
  senderId: string
  senderType: 'participant' | 'actor'
  content: string
  simulationId: string | null
  isRead: boolean
  readAt: string | null
  createdDate: string
  sentAt: string
}

export interface ChatMessageGroup {
  date: string
  messages: ChatMessage[]
}

export interface ChatMessageHistory {
  content: ChatMessageGroup[]
}

export interface ChatSimulationItem {
  simulationId: string
  simulationName: string
  channelName: string
  unreadCount: number
  lastModifiedDate: string | null
}

export interface ChatActorItem {
  actorId: string
  actorName: string
  unreadCount?: number
  isOnline?: boolean
}

export interface ChatConversationItem {
  actorId: string
  actorName: string
  content: string | null
  unreadCount: number
  createdDate: string | null
  isOnline?: boolean
}

export interface ChatMarkAsReadResult {
  status: string
  count: number
}

export interface BatchChatContentRequest {
  content: string
  timestamp: string
}

export interface ParticipantChatBatchResponse {
  groupingChatId: string
  messages: ChatMessage[]
}

export const getChatSimulations = (participantId: string) =>
  apiClient<ChatSimulationItem[]>(
    `/admin/runner/chat/simulations?participantId=${encodeURIComponent(participantId)}`,
  )
export const getChatConversationList = (participantId: string, simulationId: string) =>
  apiClient<ChatConversationItem[]>(
    `/admin/runner/chat/list?participantId=${encodeURIComponent(participantId)}&simulationId=${encodeURIComponent(simulationId)}`,
  )
export const getChatActors = (participantId: string, simulationId: string) =>
  apiClient<ChatActorItem[]>(
    `/admin/runner/chat/actors?participantId=${encodeURIComponent(participantId)}&simulationId=${encodeURIComponent(simulationId)}`,
  )
export const getChatMessages = (participantId: string, simulationId: string, actorId: string) =>
  apiClient<ChatMessageHistory>(
    `/admin/runner/chat/messages?participantId=${encodeURIComponent(participantId)}&simulationId=${encodeURIComponent(simulationId)}&actorId=${encodeURIComponent(actorId)}`,
  )
export const sendParticipantChat = (
  participantId: string,
  actorId: string,
  contents: BatchChatContentRequest[],
  simulationId: string,
) =>
  apiClient<ParticipantChatBatchResponse>(
    `/admin/runner/chat?participantId=${encodeURIComponent(participantId)}`,
    {
      method: 'POST',
      body: JSON.stringify({ actorId, contents, simulationId }),
    },
  )
export const markChatMessageRead = (participantId: string, simulationId: string, actorId: string) =>
  apiClient<ChatMarkAsReadResult>(
    `/admin/runner/chat/mark-as-read?participantId=${encodeURIComponent(participantId)}&simulationId=${encodeURIComponent(simulationId)}&actorId=${encodeURIComponent(actorId)}`,
    { method: 'POST' },
  )
