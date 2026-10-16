import { apiClient } from './client'

export interface ChatActivityItem {
  actorId: string
  actorPosition?: string
  actorName?: string
  content: string
  simulationId?: string
  unreadCount: number
  createdDate?: string
}

export interface EmailActivityItem {
  actorId: string
  actorPosition?: string
  actorName?: string
  subject: string
  content: string
  unreadCount: number
  createdDate?: string
  parentParticipantEmailId?: string | null
  totalAttachment?: number
}

export interface NotificationActivity {
  activityChat: ChatActivityItem[]
  activityEmail: EmailActivityItem[]
}

export const getNotificationActivity = (participantId: string) =>
  apiClient<NotificationActivity>(
    `/admin/runner/notification/list?participantId=${encodeURIComponent(participantId)}`,
  )
