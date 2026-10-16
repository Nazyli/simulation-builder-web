import { useEffect, useLayoutEffect, useRef } from 'react'
import type { ChatMessage } from './types'
import { MessageBubble } from './message-bubble'

interface ConversationBodyProps {
  messages: ChatMessage[]
  participantId: string
  hasMoreOlder?: boolean
  isLoadingOlder?: boolean
  onLoadOlder?: () => void
}

const LOAD_OLDER_THRESHOLD_PX = 24

export function ConversationBody({
  messages,
  participantId,
  hasMoreOlder = false,
  isLoadingOlder = false,
  onLoadOlder,
}: ConversationBodyProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const previousScrollHeightRef = useRef(0)
  const wasLoadingOlderRef = useRef(false)
  const skipBottomScrollRef = useRef(false)
  const previousLengthRef = useRef(0)

  function handleScroll() {
    const container = containerRef.current
    if (!container || !hasMoreOlder || isLoadingOlder || messages.length === 0) return
    if (container.scrollTop <= LOAD_OLDER_THRESHOLD_PX) {
      previousScrollHeightRef.current = container.scrollHeight
      onLoadOlder?.()
    }
  }

  // Keep the viewport stable after older messages are prepended above.
  useLayoutEffect(() => {
    if (wasLoadingOlderRef.current && !isLoadingOlder) {
      wasLoadingOlderRef.current = false
      const container = containerRef.current
      if (container) {
        const heightDifference = container.scrollHeight - previousScrollHeightRef.current
        if (heightDifference > 0) {
          container.scrollTop = heightDifference
          skipBottomScrollRef.current = true
        }
      }
    } else if (isLoadingOlder) {
      wasLoadingOlderRef.current = true
    }
  }, [messages, isLoadingOlder])

  useEffect(() => {
    const grew = messages.length !== previousLengthRef.current
    previousLengthRef.current = messages.length
    if (!grew || isLoadingOlder || skipBottomScrollRef.current) {
      skipBottomScrollRef.current = false
      return
    }
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, isLoadingOlder])

  if (!messages.length) {
    return (
      <div className="flex flex-1 items-center justify-center bg-slate-50/70 px-4 py-8 text-center">
        <p className="text-xs text-slate-400">No messages in this conversation yet.</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 px-4 py-4"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3">
        {isLoadingOlder ? (
          <p className="py-1 text-center text-xs text-slate-400">Loading older messages...</p>
        ) : null}
        {messages.map((message, index) => (
          <MessageBubble key={index} message={message} participantId={participantId} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
