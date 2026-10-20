import { createContext, useContext } from 'react'
import type {
  ChatMarkAsReadResult,
  ChatMessage,
  ChatActorItem,
  ChatSimulationItem,
  BatchChatContentRequest,
  ParticipantChatBatchResponse,
} from '../../shared/api/chat'
import type { EmailMarkAsReadResult, ParticipantEmailAttachmentInput } from '../../shared/api/email'
import type { Channel } from './simulation-channels'

export interface SimulationRunContextValue {
  participantId: string
  unreadCounts: Record<Channel, number>
  runnerParticipantId: string
  isChatPending: boolean
  sendChat: (input: {
    simulationId: string
    target: string
    contents: BatchChatContentRequest[]
  }) => Promise<ParticipantChatBatchResponse>
  markChatRead: (simulationId: string, actorId: string) => Promise<ChatMarkAsReadResult>
  isEmailPending: boolean
  sendEmail: (input: {
    target: string
    subject: string
    content: string
    parentEmailId?: string
    replyToEmailId?: string
    attachments?: ParticipantEmailAttachmentInput[]
    status: 'sent' | 'draft'
  }) => Promise<void>
  markEmailThreadRead: (rootId: string) => Promise<EmailMarkAsReadResult>
  refresh: () => void
}

export const SimulationRunContext = createContext<SimulationRunContextValue | null>(null)

export function useSimulationRun(): SimulationRunContextValue {
  const value = useContext(SimulationRunContext)
  if (!value) throw new Error('useSimulationRun must be used within SimulationRunProvider')
  return value
}

export type { ChatActorItem, ChatMessage, ChatSimulationItem }
