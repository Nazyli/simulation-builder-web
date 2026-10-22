import { apiClient } from './client'

interface RuntimeEmailAttachmentContent {
  participantAttachmentEmailId: string
  emailAttachmentId: string
  participantDocContentId: string | null
  page: number | null
  content: string | null
  isHighlight: boolean
  ownerName: string | null
}

export interface RuntimeEmailAttachment {
  emailAttachmentId: string
  participantDocId: string | null
  fileName: string | null
  isHighlight: boolean
  ownerName: string | null
  modifiedDate: string | null
  contents: RuntimeEmailAttachmentContent[]
}

export interface EmailAddress {
  id: string
  name: string
  email: string | null
}

export interface EmailMessage {
  participantEmailId: string
  senderId: string
  senderType: 'participant' | 'actor'
  from: EmailAddress
  subject: string
  content: string
  to: EmailAddress[]
  cc: EmailAddress[]
  parentEmailId: string | null
  replyToEmailId: string | null
  masterEmailId: string | null
  status: EmailStatus
  isRead: boolean
  createdDate: string
  attachments: RuntimeEmailAttachment[]
  canReply: boolean
}

export type EmailStatus = 'sent' | 'draft'

export interface EmailDraftItem {
  participantEmailId: string
  draftId: string
  from: string
  fromName: string
  subject: string
  lastMessageContent: string
  lastMessageDate: string
  replyToEmailId: string | null
  totalAttachment: number
}

export interface EmailInboxThreadItem {
  participantEmailId: string
  from: string
  fromName: string
  subject: string
  latestSubject: string
  lastMessageContent: string
  lastMessageDate: string
  unreadCount: number
  draftId: string | null
}

export interface EmailMarkAsReadResult {
  status: string
  count: number
}

export interface ParticipantEmailAttachmentContentInput {
  participantDocContentId: string
}

export interface ParticipantEmailAttachmentInput {
  participantDocId: string
  contents: ParticipantEmailAttachmentContentInput[]
}

export const getEmailInbox = (participantId: string, simulationId?: string) => {
  const params = new URLSearchParams({ participantId })
  if (simulationId) params.set('simulationId', simulationId)
  return apiClient<EmailInboxThreadItem[]>(`/admin/runner/email/inbox?${params.toString()}`)
}

export const getEmailDrafts = (participantId: string, simulationId?: string) => {
  const params = new URLSearchParams({ participantId })
  if (simulationId) params.set('simulationId', simulationId)
  return apiClient<EmailDraftItem[]>(`/admin/runner/email/draft?${params.toString()}`)
}

export const getEmailThreadMessages = (participantId: string, rootId: string) =>
  apiClient<EmailMessage[]>(
    `/admin/runner/email/thread/${encodeURIComponent(rootId)}?participantId=${encodeURIComponent(participantId)}`,
  )

export const sendParticipantEmail = (
  participantId: string,
  partnerId: string,
  subject: string,
  content: string,
  to?: string[],
  cc?: string[],
  parentEmailId?: string,
  replyToEmailId?: string,
  attachments?: ParticipantEmailAttachmentInput[],
  status: EmailStatus = 'sent',
) =>
  apiClient<EmailMessage>(
    `/admin/runner/email?participantId=${encodeURIComponent(participantId)}`,
    {
      method: 'POST',
      body: JSON.stringify({
        subject,
        content,
        status,
        to: to && to.length > 0 ? to : [partnerId],
        cc: cc ?? [],
        ...(parentEmailId ? { parentEmailId } : {}),
        ...(replyToEmailId ? { replyToEmailId } : {}),
        ...(attachments !== undefined ? { attachments } : {}),
      }),
    },
  )

export const markEmailAsRead = (participantId: string, participantEmailId: string) =>
  apiClient<EmailMarkAsReadResult>(
    `/admin/runner/email/mark-as-read?participantId=${encodeURIComponent(participantId)}`,
    {
      method: 'POST',
      body: JSON.stringify({ participantEmailId }),
    },
  )

export const markEmailAttachmentOpened = (
  attachmentId: string,
  participantId: string,
  participantEmailId: string,
) => {
  const params = new URLSearchParams({
    participantId,
    participantEmailId,
  })
  return apiClient<RuntimeEmailAttachment>(
    `/admin/runner/email/attachments/${encodeURIComponent(attachmentId)}/opened?${params.toString()}`,
    { method: 'POST' },
  )
}
