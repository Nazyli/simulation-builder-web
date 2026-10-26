import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  getChatActors,
  getChatConversationList,
  getChatMessages,
  getChatSimulations,
  type ChatActorItem,
  type ChatConversationItem,
  type ChatMessage as ApiChatMessage,
  type ChatSimulationItem,
} from '../../shared/api/chat'
import { subscribeRunnerEvents, type RunnerEvent } from '../../shared/api/runner-events'
import { ChatWorkspace } from './chat/chat-workspace'
import { ChatBatchBuffer, sendChatTimerMs } from './chat/chat-batch-buffer'
import type { ChatBubbleInput } from './chat/chat-batch-buffer'
import type { ChatActor, ChatMessage, ChatSimulation } from './chat/types'
import {
  applyConversationPresence,
  flattenChatMessageHistory,
  mergeChatMessages,
  mergeHistoryPages,
  resolveActorOnline,
} from './chat/utils'
import { useSimulationRun } from './simulation-run-context-core'

const CHAT_HISTORY_PAGE_SIZE = 30

function toChatActor(item: ChatActorItem): ChatActor {
  return {
    actorId: item.actorId,
    actorName: item.actorName,
    unreadCount: item.unreadCount ?? 0,
    isOnline: item.isOnline ?? true,
  }
}

function toConversationActor(item: ChatConversationItem): ChatActor {
  return {
    actorId: item.actorId,
    actorName: item.actorName,
    unreadCount: item.unreadCount,
    content: item.content,
    createdDate: item.createdDate,
    isOnline: item.isOnline,
  }
}

export function ChatChannelPage() {
  const { participantId, isChatPending, sendChat, markChatRead } = useSimulationRun()
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([])
  const sendChatRef = useRef(sendChat)
  sendChatRef.current = sendChat
  const pendingTargetRef = useRef<{ simulationId: string; target: string } | null>(null)
  const pendingMessageIdsByTimestampRef = useRef(new Map<string, string>())
  const isMountedRef = useRef(true)
  const flushBatchRef = useRef<(contents: ChatBubbleInput[]) => void>(() => undefined)
  const lastBubbleTimestampRef = useRef(0)
  const batchBufferRef = useRef<ChatBatchBuffer | null>(null)
  if (!batchBufferRef.current) {
    batchBufferRef.current = new ChatBatchBuffer(sendChatTimerMs, (contents) =>
      flushBatchRef.current(contents),
    )
  }
  const flushQueuedBubbles = () => batchBufferRef.current?.flush()

  const toChatMessage = (message: ApiChatMessage): ChatMessage => ({
    messageId: message.participantChatId,
    from: message.senderId,
    to: message.senderType === 'participant' ? selectedActor ?? '' : participantId,
    actor: message.senderId,
    senderType: message.senderType,
    channel: 'chat' as const,
    chatId: null,
    actionType: 'message',
    content: message.content,
    timestamp: message.sentAt,
    simulationId: effectiveSelected ?? undefined,
    isUnread: false,
  })

  flushBatchRef.current = (contents) => {
    const pendingTarget = pendingTargetRef.current
    if (!pendingTarget) return
    const pendingIds = contents
      .map((content) => pendingMessageIdsByTimestampRef.current.get(content.timestamp))
      .filter((messageId): messageId is string => Boolean(messageId))
    const pendingIdSet = new Set(pendingIds)
    if (isMountedRef.current && pendingIdSet.size) {
      setLocalMessages((messages) =>
        messages.map((message) =>
          pendingIdSet.has(message.messageId ?? '')
            ? { ...message, deliveryStatus: 'sending' }
            : message,
        ),
      )
    }
    void sendChatRef
      .current({ ...pendingTarget, contents })
      .then((response) => {
        contents.forEach((content) =>
          pendingMessageIdsByTimestampRef.current.delete(content.timestamp),
        )
        if (!isMountedRef.current) return
        const persistedMessages = response.messages.map(toChatMessage)
        setLocalMessages((messages) => [
          ...messages.filter((message) => !pendingIdSet.has(message.messageId ?? '')),
          ...persistedMessages,
        ])
      })
      .catch(() => {
        contents.forEach((content) =>
          pendingMessageIdsByTimestampRef.current.delete(content.timestamp),
        )
        if (!isMountedRef.current) return
        setLocalMessages((messages) =>
          messages.filter((message) => !pendingIdSet.has(message.messageId ?? '')),
        )
      })
    pendingTargetRef.current = null
  }

  const toChatSimulation = (item: ChatSimulationItem): ChatSimulation => ({
    simulationId: item.simulationId,
    simulationName: item.simulationName,
    channelName: item.channelName,
    unreadCount: item.unreadCount,
    lastModifiedDate: item.lastModifiedDate,
  })

  const simulationsQuery = useQuery({
    queryKey: ['chat-simulations', participantId],
    queryFn: () => getChatSimulations(participantId),
    enabled: Boolean(participantId.trim()),
  })
  // Backend returns summaries sorted by unread count descending; keep that order.
  const simulations = (simulationsQuery.data ?? []).map(toChatSimulation)

  const [selectedSimulation, setSelectedSimulation] = useState<string | null>(null)
  const effectiveSelected = selectedSimulation ?? simulations[0]?.simulationId ?? null

  const conversationListQuery = useQuery({
    queryKey: ['chat-list', participantId, effectiveSelected],
    queryFn: () => getChatConversationList(participantId, effectiveSelected!),
    enabled: Boolean(participantId.trim() && effectiveSelected),
  })

  const actorsQuery = useQuery({
    queryKey: ['chat-actors', participantId, effectiveSelected],
    queryFn: () => getChatActors(participantId, effectiveSelected!),
    enabled: Boolean(participantId.trim() && effectiveSelected),
    // Graph roster is static per simulation: fetch once, never invalidated.
    staleTime: Infinity,
  })
  // chat/actors is only the online roster now: unread lives on chat/list.
  const presenceByActor = useMemo(() => {
    const presence = new Map<string, boolean>()
    for (const item of actorsQuery.data ?? []) {
      presence.set(item.actorId, item.isOnline ?? true)
    }
    return presence
  }, [actorsQuery.data])

  const listedActors: ChatActor[] | null = useMemo(() => {
    const rows = conversationListQuery.data
    if (rows === undefined) return null
    return applyConversationPresence(rows.map(toConversationActor), presenceByActor)
  }, [conversationListQuery.data, presenceByActor])
  // Legacy fallback while chat/list is unavailable: the old actors payload
  // still carries unread counts.
  const fetchedActors = listedActors ?? (actorsQuery.data ?? []).map(toChatActor)

  const [optimisticActors, setOptimisticActors] = useState<ChatActor[]>([])

  // Clear optimistic when simulation changes.
  useEffect(() => {
    setOptimisticActors([])
  }, [effectiveSelected])

  // Prune optimistic that now exist in fetched (deduplicate after real row created).
  useEffect(() => {
    if (!fetchedActors.length || !optimisticActors.length) return
    const fetchedIds = new Set(fetchedActors.map((a) => a.actorId))
    const stillOptimistic = optimisticActors.filter((a) => !fetchedIds.has(a.actorId))
    if (stillOptimistic.length !== optimisticActors.length) {
      setOptimisticActors(stillOptimistic)
    }
  }, [fetchedActors, optimisticActors])

  const actors: ChatActor[] = useMemo(() => {
    const fetchedIds = new Set(fetchedActors.map((a) => a.actorId))
    const extra = optimisticActors.filter((a) => !fetchedIds.has(a.actorId))
    return [...extra, ...fetchedActors]
  }, [fetchedActors, optimisticActors])

  const handleStartNewChat = (actor: ChatActor) => {
    flushQueuedBubbles()
    // Online badge comes from the graph roster (chat/actors), never from the
    // optimistic pick: an actor outside the workflow graph stays offline.
    const online = resolveActorOnline(actor.actorId, presenceByActor)
    setOptimisticActors((prev) => {
      if (prev.some((a) => a.actorId === actor.actorId)) return prev
      if (fetchedActors.some((a) => a.actorId === actor.actorId)) return prev
      return [{ ...actor, isOnline: online }, ...prev]
    })
    setSelectedActor(actor.actorId)
  }

  const [selectedActor, setSelectedActor] = useState<string | null>(null)
  const [readPendingActors, setReadPendingActors] = useState<ReadonlySet<string>>(new Set())

  const markChatReadRef = useRef(markChatRead)
  markChatReadRef.current = markChatRead

  useEffect(() => {
    const pid = participantId.trim()
    if (!pid || !selectedActor || !effectiveSelected) return
    const handleNotification = (payload: RunnerEvent) => {
      if (
        payload.type === 'chat_message' &&
        payload.activityChat.actorIdChat === selectedActor &&
        payload.activityChat.simulationId === effectiveSelected
      ) {
        setReadPendingActors((prev) => {
          if (prev.has(selectedActor)) return prev
          const next = new Set(prev)
          next.add(selectedActor)
          return next
        })
        void markChatReadRef
          .current(effectiveSelected, selectedActor)
          .catch(() => undefined)
          .finally(() =>
            setReadPendingActors((prev) => {
              const next = new Set(prev)
              next.delete(selectedActor)
              return next
            }),
          )
      }
    }
    return subscribeRunnerEvents(pid, { notification: handleNotification })
  }, [participantId, selectedActor, effectiveSelected])

  const chatQuery = useQuery({
    queryKey: ['chat-messages', participantId, effectiveSelected, selectedActor],
    queryFn: () => getChatMessages(participantId, effectiveSelected!, selectedActor!),
    enabled: Boolean(
      participantId.trim() &&
      effectiveSelected &&
      selectedActor &&
      !readPendingActors.has(selectedActor),
    ),
  })

  const [olderApiMessages, setOlderApiMessages] = useState<ApiChatMessage[]>([])
  const [olderHasMore, setOlderHasMore] = useState<boolean | null>(null)
  const [isLoadingOlder, setIsLoadingOlder] = useState(false)
  const isFetchingOlderRef = useRef(false)

  // Older pages belong to one conversation; drop them when it changes.
  useEffect(() => {
    setOlderApiMessages([])
    setOlderHasMore(null)
    setIsLoadingOlder(false)
    isFetchingOlderRef.current = false
  }, [participantId, effectiveSelected, selectedActor])

  const initialApiMessages = useMemo(
    () => flattenChatMessageHistory(chatQuery.data),
    [chatQuery.data],
  )
  const allServerApiMessages = useMemo(
    () => [...olderApiMessages, ...initialApiMessages],
    [olderApiMessages, initialApiMessages],
  )
  const hasMoreOlder = olderHasMore ?? chatQuery.data?.hasMore ?? false

  function loadOlderMessages() {
    const pid = participantId.trim()
    if (!pid || !effectiveSelected || !selectedActor) return
    if (isFetchingOlderRef.current || isLoadingOlder || !hasMoreOlder) return
    const oldest = allServerApiMessages[0]
    if (!oldest) return
    isFetchingOlderRef.current = true
    setIsLoadingOlder(true)
    void getChatMessages(
      pid,
      effectiveSelected,
      selectedActor,
      oldest.sentAt,
      CHAT_HISTORY_PAGE_SIZE,
    )
      .then((history) => {
        const incoming = flattenChatMessageHistory(history)
        if (!incoming.length) {
          setOlderHasMore(false)
          return
        }
        setOlderApiMessages((prev) => mergeHistoryPages(prev, initialApiMessages, incoming))
        setOlderHasMore(history.hasMore ?? false)
      })
      .catch(() => undefined)
      .finally(() => {
        isFetchingOlderRef.current = false
        if (isMountedRef.current) setIsLoadingOlder(false)
      })
  }

  const serverMessages: ChatMessage[] = allServerApiMessages.map(toChatMessage)
  const visibleLocalMessages = localMessages.filter(
    (message) => message.simulationId === effectiveSelected && message.to === selectedActor,
  )
  const visibleMessages = mergeChatMessages(serverMessages, visibleLocalMessages)

  useEffect(() => {
    const persistedIds = new Set(allServerApiMessages.map((message) => message.participantChatId))
    if (!persistedIds.size) return
    setLocalMessages((messages) =>
      messages.filter((message) => !persistedIds.has(message.messageId ?? '')),
    )
  }, [allServerApiMessages])

  useEffect(() => {
    isMountedRef.current = true
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') flushQueuedBubbles()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      isMountedRef.current = false
      batchBufferRef.current?.dispose()
    }
  }, [])

  useEffect(() => {
    const queuedTarget = pendingTargetRef.current
    if (
      queuedTarget &&
      (queuedTarget.simulationId !== effectiveSelected || queuedTarget.target !== selectedActor)
    ) {
      flushQueuedBubbles()
    }
  }, [effectiveSelected, selectedActor])

  // The summary contract carries no execution status; the backend replies 422
  // when a message targets a simulation with no active wait.
  const selectedRun = simulations.find((s) => s.simulationId === effectiveSelected)
  const canReply = Boolean(selectedRun)
  const disabled = isChatPending || !canReply

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    if (!effectiveSelected || !selectedActor) return
    const content = String(data.get('content') ?? '')
    if (!content.trim()) return
    const target = { simulationId: effectiveSelected, target: selectedActor }
    const pendingTarget = pendingTargetRef.current
    if (
      pendingTarget &&
      (pendingTarget.simulationId !== target.simulationId || pendingTarget.target !== target.target)
    ) {
      flushQueuedBubbles()
    }
    pendingTargetRef.current = target
    const timestamp = Math.max(Date.now(), lastBubbleTimestampRef.current + 1)
    lastBubbleTimestampRef.current = timestamp
    const timestampIso = new Date(timestamp).toISOString()
    const optimisticMessageId = `queued-${timestamp}-${Math.random().toString(36).slice(2, 8)}`
    pendingMessageIdsByTimestampRef.current.set(timestampIso, optimisticMessageId)
    setLocalMessages((messages) => [
      ...messages,
      {
        messageId: optimisticMessageId,
        from: participantId,
        to: selectedActor,
        actor: participantId,
        senderType: 'participant',
        channel: 'chat',
        chatId: null,
        actionType: 'message',
        content,
        timestamp: timestampIso,
        simulationId: effectiveSelected,
        deliveryStatus: 'queued',
      },
    ])
    batchBufferRef.current?.enqueue({ content, timestamp: timestampIso })
    event.currentTarget.reset()
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <ChatWorkspace
        participantId={participantId}
        messages={visibleMessages}
        actors={actors}
        simulations={simulations}
        selectedSimulation={effectiveSelected}
        onSelectSimulation={(simulationId) => {
          flushQueuedBubbles()
          setSelectedSimulation(simulationId)
          setSelectedActor(null)
        }}
        selectedActor={selectedActor}
        onSelectActor={(actorId) => {
          flushQueuedBubbles()
          setSelectedActor(actorId)
        }}
        onStartNewChat={handleStartNewChat}
        disabled={disabled}
        onSubmit={submit}
        onTyping={() => batchBufferRef.current?.noteTyping()}
        hasMoreOlder={hasMoreOlder}
        isLoadingOlder={isLoadingOlder}
        onLoadOlder={loadOlderMessages}
        onConversationOpen={(actorId) => {
          if (!effectiveSelected) return
          const actor = actors.find((item) => item.actorId === actorId)
          if (actor && actor.unreadCount > 0) {
            setReadPendingActors((prev) => new Set(prev).add(actorId))
            void markChatRead(effectiveSelected, actorId)
              .catch(() => undefined)
              .finally(() =>
                setReadPendingActors((prev) => {
                  const next = new Set(prev)
                  next.delete(actorId)
                  return next
                }),
              )
          }
        }}
      />
    </div>
  )
}
