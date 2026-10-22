import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import {
  markChatMessageRead,
  sendParticipantChat,
  type BatchChatContentRequest,
  type ChatActorItem,
  type ChatConversationItem,
  type ChatMessageHistory,
  type ParticipantChatBatchResponse,
  type ChatSimulationItem,
} from '../../shared/api/chat'
import { subscribeRunnerEvents, type RunnerEvent } from '../../shared/api/runner-events'
import {
  markEmailAsRead,
  sendParticipantEmail,
  type ParticipantEmailAttachmentInput,
} from '../../shared/api/email'
import { getNotificationActivity, type NotificationActivity } from '../../shared/api/notifications'
import { SimulationRunContext } from './simulation-run-context-core'
import type { Channel } from './simulation-channels'
import { readActorId } from './simulation-run-storage'

const CHANNELS: Channel[] = ['chat', 'email', 'call', 'document']

export function SimulationRunProvider({
  participantId,
  children,
}: {
  participantId: string
  children: ReactNode
}) {
  const client = useQueryClient()
  const [actorId] = useState(readActorId)

  const activityQuery = useQuery({
    queryKey: ['notification-activity', participantId],
    queryFn: () => getNotificationActivity(participantId),
    enabled: Boolean(participantId.trim()),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })
  const activity = activityQuery.data ?? { activityChat: [], activityEmail: [] }

  useEffect(() => {
    const streamParticipantId = participantId.trim()
    if (!streamParticipantId) return
    const pid = streamParticipantId
    const invalidateStaleRunner = () => {
      void client.invalidateQueries({ queryKey: ['notification-activity', pid] })
      void client.invalidateQueries({ queryKey: ['participant-executions', pid] })
      void client.invalidateQueries({ queryKey: ['chat-list'] })
      void client.invalidateQueries({ queryKey: ['chat-messages'] })
      void client.invalidateQueries({ queryKey: ['email-inbox'] })
      void client.invalidateQueries({ queryKey: ['email-thread-messages'] })
    }
    const refreshRunner = (payload: RunnerEvent) => {
      if (payload.type === 'chat_message') {
        void client.invalidateQueries({ queryKey: ['notification-activity', pid] })
        void client.invalidateQueries({ queryKey: ['participant-executions', pid] })
        void client.invalidateQueries({ queryKey: ['chat-simulations'] })
        void client.invalidateQueries({ queryKey: ['chat-list'] })
        void client.invalidateQueries({ queryKey: ['chat-messages'] })
        toast.info(`New message from ${payload.activityChat.actorIdChat ?? 'actor'}`, {
          description: payload.activityChat.content ?? undefined,
        })
        return
      }
      if (payload.type === 'email_message') {
        void client.invalidateQueries({ queryKey: ['notification-activity', pid] })
        void client.invalidateQueries({ queryKey: ['participant-executions', pid] })
        void client.invalidateQueries({ queryKey: ['email-inbox'] })
        void client.invalidateQueries({ queryKey: ['email-thread-messages'] })
        toast.info('New email', { description: payload.activityEmail.subject ?? undefined })
        return
      }
      void client.invalidateQueries({ queryKey: ['notification-activity', pid] })
    }
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        invalidateStaleRunner()
      }
    }
    const unsubscribe = subscribeRunnerEvents(streamParticipantId, {
      notification: refreshRunner,
      open: invalidateStaleRunner,
      error: invalidateStaleRunner,
    })
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      unsubscribe()
    }
  }, [client, participantId])

  const chatAction = useMutation({
    mutationFn: ({
      simulationId,
      target,
      contents,
    }: {
      simulationId: string
      target: string
      contents: BatchChatContentRequest[]
    }) => sendParticipantChat(participantId.trim(), target, contents, simulationId),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['notification-activity', participantId.trim()] })
      client.invalidateQueries({ queryKey: ['participant-executions', participantId.trim()] })
      client.invalidateQueries({ queryKey: ['chat-simulations'] })
      client.invalidateQueries({ queryKey: ['chat-list'] })
      client.invalidateQueries({ queryKey: ['chat-messages'] })
    },
    onError: () => toast.error('Reply was rejected. Check the requested actor and simulation.'),
  })

  const messageRead = useMutation({
    mutationFn: ({ simulationId, actorId }: { simulationId: string; actorId: string }) =>
      markChatMessageRead(participantId.trim(), simulationId, actorId),
    onError: () => {
      // Mark-as-read is idempotent; 422 when no wait is active must not surface as error.
    },
    onSuccess: ({ count }, { simulationId, actorId }) => {
      const pid = participantId.trim()
      client.setQueryData<ChatMessageHistory>(
        ['chat-messages', pid, simulationId, actorId],
        (history) =>
          history
            ? {
                ...history,
                content: history.content.map((group) => ({
                  ...group,
                  messages: group.messages.map((message) =>
                    message.senderType === 'actor' && !message.isRead
                      ? {
                          ...message,
                          isRead: true,
                          readAt: message.readAt ?? new Date().toISOString(),
                        }
                      : message,
                  ),
                })),
              }
            : history,
      )
      client.setQueryData<ChatConversationItem[]>(['chat-list', pid, simulationId], (rows) =>
        rows?.map((row) =>
          row.actorId === actorId
            ? { ...row, unreadCount: Math.max(0, row.unreadCount - count) }
            : row,
        ),
      )
      client.setQueryData<ChatActorItem[]>(['chat-actors', pid, simulationId], (actors) =>
        actors?.map((actor) =>
          actor.actorId === actorId
            ? { ...actor, unreadCount: Math.max(0, (actor.unreadCount ?? 0) - count) }
            : actor,
        ),
      )
      client.setQueryData<ChatSimulationItem[]>(['chat-simulations', pid], (simulations) =>
        simulations?.map((simulation) =>
          simulation.simulationId === simulationId
            ? { ...simulation, unreadCount: Math.max(0, simulation.unreadCount - count) }
            : simulation,
        ),
      )
      client.setQueryData<NotificationActivity>(['notification-activity', pid], (activity) =>
        activity
          ? {
              ...activity,
              activityChat: activity.activityChat
                .map((item) =>
                  item.actorId === actorId
                    ? { ...item, unreadCount: Math.max(0, item.unreadCount - count) }
                    : item,
                )
                .filter((item) => item.unreadCount > 0),
            }
          : activity,
      )
      client.invalidateQueries({ queryKey: ['notification-activity', pid] })
      client.invalidateQueries({ queryKey: ['chat-simulations'] })
      client.invalidateQueries({ queryKey: ['chat-list'] })
      client.invalidateQueries({ queryKey: ['chat-messages'] })
    },
  })

  const emailAction = useMutation({
    mutationFn: ({
      target,
      subject,
      content,
      parentEmailId,
      replyToEmailId,
      attachments,
      status,
    }: {
      target: string
      subject: string
      content: string
      parentEmailId?: string
      replyToEmailId?: string
      attachments?: ParticipantEmailAttachmentInput[]
      status: 'sent' | 'draft'
    }) =>
      sendParticipantEmail(
        participantId.trim(),
        target,
        subject,
        content,
        undefined,
        undefined,
        parentEmailId,
        replyToEmailId,
        attachments,
        status,
      ),
    onSuccess: (_message, variables) => {
      client.invalidateQueries({ queryKey: ['notification-activity', participantId.trim()] })
      client.invalidateQueries({ queryKey: ['participant-executions', participantId.trim()] })
      client.invalidateQueries({ queryKey: ['email-inbox'] })
      client.invalidateQueries({ queryKey: ['email-drafts'] })
      client.invalidateQueries({ queryKey: ['email-thread-messages'] })
      if (variables.status === 'draft') toast.success('Draft saved.')
    },
    onError: () => {
      client.invalidateQueries({ queryKey: ['email-inbox'] })
      client.invalidateQueries({ queryKey: ['email-drafts'] })
      client.invalidateQueries({ queryKey: ['email-thread-messages'] })
      toast.error('Email was rejected. Check the requested contact and simulation.')
    },
  })

  const emailRead = useMutation({
    mutationFn: ({ rootId }: { rootId: string }) => markEmailAsRead(participantId.trim(), rootId),
    onSuccess: ({ count }) => {
      const pid = participantId.trim()
      client.setQueryData<NotificationActivity>(['notification-activity', pid], (activity) => {
        if (!activity) return activity
        let remaining = count
        const nextEmail = activity.activityEmail
          .map((item) => {
            if (remaining <= 0) return item
            const nextCount = Math.max(0, item.unreadCount - remaining)
            remaining -= item.unreadCount - nextCount
            return { ...item, unreadCount: nextCount }
          })
          .filter((item) => item.unreadCount > 0)
        return { ...activity, activityEmail: nextEmail }
      })
      client.invalidateQueries({ queryKey: ['notification-activity', pid] })
      client.invalidateQueries({ queryKey: ['email-inbox', pid] })
    },
  })

  const runnerParticipantId = actorId || participantId
  const unreadCounts = Object.fromEntries(
    CHANNELS.map((channel) => [
      channel,
      channel === 'chat'
        ? activity.activityChat.reduce((total, item) => total + item.unreadCount, 0)
        : channel === 'email'
          ? activity.activityEmail.reduce((total, item) => {
              const emailItem = item as { unreadCount?: number }
              return total + (emailItem.unreadCount ?? 0)
            }, 0)
          : 0,
    ]),
  ) as Record<Channel, number>

  const sendChat = (input: {
    simulationId: string
    target: string
    contents: BatchChatContentRequest[]
  }): Promise<ParticipantChatBatchResponse> => {
    if (!participantId.trim()) {
      toast.error('Choose an active simulation session.')
      return Promise.reject(new Error('Active simulation session is required.'))
    }
    return chatAction.mutateAsync({
      simulationId: input.simulationId,
      target: input.target,
      contents: input.contents,
    })
  }

  const sendEmail = (input: {
    target: string
    subject: string
    content: string
    parentEmailId?: string
    replyToEmailId?: string
    attachments?: ParticipantEmailAttachmentInput[]
    status: 'sent' | 'draft'
  }): Promise<void> => {
    if (!participantId.trim()) {
      toast.error('Choose an active simulation session.')
      return Promise.reject(new Error('No active participant session'))
    }
    return emailAction
      .mutateAsync({
        target: input.target,
        subject: input.subject,
        content: input.content,
        parentEmailId: input.parentEmailId,
        replyToEmailId: input.replyToEmailId,
        attachments: input.attachments,
        status: input.status,
      })
      .then(() => undefined)
  }

  const refresh = () => {
    client.invalidateQueries({ queryKey: ['notification-activity', participantId.trim()] })
    client.invalidateQueries({ queryKey: ['participant-executions', participantId.trim()] })
    client.invalidateQueries({ queryKey: ['chat-simulations'] })
    client.invalidateQueries({ queryKey: ['chat-list'] })
    client.invalidateQueries({ queryKey: ['chat-messages'] })
    client.invalidateQueries({ queryKey: ['email-inbox'] })
    client.invalidateQueries({ queryKey: ['email-thread-messages'] })
  }

  return (
    <SimulationRunContext.Provider
      value={{
        participantId,
        unreadCounts,
        runnerParticipantId,
        isChatPending: chatAction.isPending,
        sendChat,
        markChatRead: (simulationId, actorId) =>
          messageRead
            .mutateAsync({ simulationId, actorId })
            .catch(() => ({ status: 'success', count: 0 })),
        isEmailPending: emailAction.isPending,
        sendEmail,
        markEmailThreadRead: (rootId) => emailRead.mutateAsync({ rootId }),
        refresh,
      }}
    >
      {children}
    </SimulationRunContext.Provider>
  )
}
