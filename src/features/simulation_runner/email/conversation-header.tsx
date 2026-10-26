import type { EmailInboxThread, EmailMessage } from './types'

interface ConversationHeaderProps {
  thread: EmailInboxThread | null
  messages: EmailMessage[]
}

export function ConversationHeader({ thread, messages }: ConversationHeaderProps) {
  if (!thread) {
    return (
      <div className="bg-card flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
        <p className="text-sm font-medium text-[#9aa0a6]">No conversation selected</p>
      </div>
    )
  }
  const count = messages.length
  const canReply = messages.at(-1)?.canReply === true
  return (
    <div className="bg-card flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-2 text-base font-semibold text-slate-600">
          {thread.draftId ? (
            <span
              aria-label="This thread has an unsent draft"
              className="shrink-0 rounded-sm border border-amber-300 bg-amber-50 px-1 text-[10px] leading-4 font-semibold text-amber-700"
            >
              [DRAFT]
            </span>
          ) : null}
          {count > 0 ? (
            <span
              aria-label={
                canReply ? 'This thread can resolve a reply' : 'This thread cannot resolve a reply'
              }
              className={`shrink-0 rounded-sm border px-1 text-[10px] leading-4 font-semibold whitespace-nowrap ${
                canReply
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : 'border-slate-300 bg-slate-50 text-slate-500'
              }`}
            >
              {canReply ? 'REPLYABLE' : 'NO REPLY'}
            </span>
          ) : null}
          <span className="min-w-0 flex-1 truncate">{thread.subject || '(no subject)'}</span>
        </p>
      </div>
      <span className="ml-4 shrink-0 text-xs text-slate-500">
        {count} message{count === 1 ? '' : 's'}
      </span>
    </div>
  )
}
