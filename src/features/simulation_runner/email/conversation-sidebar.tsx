import { Mail, Pencil, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { inputClass } from '../../../shared/form-classes'
import type { EmailDraft, EmailInboxThread } from './types'
import { isHtmlContent, stripHtmlToText } from './sanitize'
import { formatEmailDate } from './utils'

const AVATAR_COLORS = [
  '#9929EA',
  '#039be5',
  '#0b8043',
  '#d50000',
  '#f4511e',
  '#8e24aa',
  '#00897b',
  '#616161',
]

function avatarBg(senderId: string): string {
  return AVATAR_COLORS[senderId.charCodeAt(0) % AVATAR_COLORS.length]
}

interface ConversationSidebarProps {
  threads: EmailInboxThread[]
  drafts: EmailDraft[]
  folder: 'inbox' | 'draft'
  onFolderChange: (folder: 'inbox' | 'draft') => void
  selectedRootId: string | null
  onSelect: (rootId: string) => void
}

export function ConversationSidebar({
  threads,
  drafts,
  folder,
  onFolderChange,
  selectedRootId,
  onSelect,
}: ConversationSidebarProps) {
  const [search, setSearch] = useState('')
  const query = search.trim().toLowerCase()
  const filteredThreads = useMemo(() => {
    return query
      ? threads.filter(
          (thread) =>
            thread.fromName.toLowerCase().includes(query) ||
            thread.subject.toLowerCase().includes(query) ||
            thread.lastMessageContent.toLowerCase().includes(query) ||
            thread.from.toLowerCase().includes(query),
        )
      : threads
  }, [threads, query])
  const filteredDrafts = useMemo(() => {
    return query
      ? drafts.filter(
          (draft) =>
            draft.subject.toLowerCase().includes(query) ||
            draft.fromName.toLowerCase().includes(query) ||
            draft.lastMessageContent.toLowerCase().includes(query) ||
            draft.from.toLowerCase().includes(query) ||
            draft.draftId.toLowerCase().includes(query),
        )
      : drafts
  }, [drafts, query])

  return (
    <aside className="bg-card flex min-w-0 shrink-0 flex-col border-b border-slate-200 lg:w-[320px] lg:border-r lg:border-b-0">
      <label className="relative px-3 pt-3 pb-2">
        <Search className="pointer-events-none absolute top-5.5 left-6 h-3.5 w-3.5 text-[#9aa0a6]" />
        <input
          className={`${inputClass} !h-8 !rounded-md !py-1.5 !pl-8 text-xs`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search emails"
        />
      </label>
      <div className="flex gap-1 px-3 pb-2" role="tablist" aria-label="Mail folders">
        <button
          type="button"
          role="tab"
          aria-selected={folder === 'inbox'}
          onClick={() => onFolderChange('inbox')}
          className={`focus-visible:ring-ring flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none ${
            folder === 'inbox' ? 'bg-accent text-brand' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <Mail size={14} />
          Inbox
          {threads.length > 0 ? (
            <span className="rounded-sm bg-white/70 px-1 text-[10px] leading-4 text-slate-600">
              {threads.length}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={folder === 'draft'}
          onClick={() => onFolderChange('draft')}
          className={`focus-visible:ring-ring flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none ${
            folder === 'draft' ? 'bg-accent text-brand' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <Pencil size={14} />
          Drafts
          {drafts.length > 0 ? (
            <span className="rounded-sm bg-white/70 px-1 text-[10px] leading-4 text-slate-600">
              {drafts.length}
            </span>
          ) : null}
        </button>
      </div>
      {folder === 'draft' ? (
        <div className="min-h-0 flex-1 overflow-y-auto border-t border-slate-200">
          {filteredDrafts.map((draft) => {
            const active = draft.participantEmailId === selectedRootId
            const preview = draft.lastMessageContent
              ? isHtmlContent(draft.lastMessageContent)
                ? stripHtmlToText(draft.lastMessageContent) || 'No preview'
                : draft.lastMessageContent
              : 'No content'
            return (
              <button
                key={draft.participantEmailId}
                type="button"
                onClick={() => onSelect(draft.participantEmailId)}
                className={`focus-visible:ring-ring flex w-full min-w-0 items-center gap-3 border-b border-slate-200 px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-slate-50 focus-visible:ring-2 focus-visible:outline-none ${
                  active ? 'bg-accent' : 'bg-card'
                }`}
              >
                <span className="bg-secondary text-brand grid size-8 shrink-0 place-items-center rounded-md">
                  <Pencil size={14} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-slate-700">
                      {draft.subject || '(no subject)'}
                    </span>
                    <span className="shrink-0 text-xs text-slate-500">
                      {formatEmailDate(draft.lastMessageDate)}
                    </span>
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-slate-500">{preview}</span>
                    <span className="text-brand shrink-0 text-[10px] font-semibold uppercase">
                      Draft
                    </span>
                  </span>
                </span>
              </button>
            )
          })}
          {filteredDrafts.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <Pencil size={20} className="text-[#9aa0a6]" />
              <p className="text-xs text-slate-500">
                {drafts.length ? 'No matching drafts.' : 'No drafts yet.'}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto border-t border-slate-200">
          {filteredThreads.map((thread) => {
            const active = thread.participantEmailId === selectedRootId
            const unread = thread.unreadCount > 0
            return (
              <button
                key={thread.participantEmailId}
                type="button"
                onClick={() => onSelect(thread.participantEmailId)}
                className={`focus-visible:ring-ring flex w-full min-w-0 items-center gap-3 border-b border-slate-200 px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-slate-50 focus-visible:ring-2 focus-visible:outline-none ${
                  active ? 'bg-accent' : 'bg-card'
                }`}
              >
                <span
                  className="grid size-8 shrink-0 place-items-center rounded-md text-xs font-medium text-white"
                  style={{ backgroundColor: avatarBg(thread.from) }}
                  title={thread.fromName}
                >
                  {(thread.fromName || thread.from).slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-baseline justify-between gap-2">
                    <span className="flex min-w-0 items-baseline gap-1.5">
                      {thread.draftId ? (
                        <span
                          aria-label="This thread has an unsent draft"
                          className="shrink-0 rounded-sm border border-amber-300 bg-amber-50 px-1 text-[10px] leading-4 font-semibold text-amber-700"
                        >
                          [DRAFT]
                        </span>
                      ) : null}
                      <span
                        className={`truncate text-sm ${
                          unread ? 'font-semibold text-slate-900' : 'font-normal text-slate-500'
                        }`}
                      >
                        {thread.subject || '(no subject)'}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-slate-500">
                      {formatEmailDate(thread.lastMessageDate)}
                    </span>
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-slate-500">
                      {thread.lastMessageContent
                        ? isHtmlContent(thread.lastMessageContent)
                          ? stripHtmlToText(thread.lastMessageContent) || 'No preview'
                          : thread.lastMessageContent
                        : 'No preview'}
                    </span>
                    {unread && (
                      <span
                        aria-label={`${thread.unreadCount} unread email${thread.unreadCount === 1 ? '' : 's'}`}
                        className="bg-primary text-primary-foreground min-w-[18px] shrink-0 rounded-md px-1.5 text-center text-xs leading-4 font-bold"
                      >
                        {thread.unreadCount}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            )
          })}
          {filteredThreads.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <Mail size={20} className="text-[#9aa0a6]" />
              <p className="text-xs text-slate-500">
                {threads.length ? 'No matching threads.' : 'No emails yet.'}
              </p>
            </div>
          )}
        </div>
      )}
    </aside>
  )
}
