import { MessageSquare, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { inputClass } from '../../../shared/form-classes'
import { ActorPickerSheet } from '../components/actor-picker-sheet'
import type { ChatActor } from './types'
import { formatConversationTime } from './utils'

interface ConversationSidebarProps {
  actors: ChatActor[]
  selectedActor: string | null
  onSelect: (actor: string) => void
  onStartNewChat?: (actor: ChatActor) => void
}

export function ConversationSidebar({
  actors,
  selectedActor,
  onSelect,
  onStartNewChat,
}: ConversationSidebarProps) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)

  const filteredActors = useMemo(() => {
    const query = search.trim().toLowerCase()
    return query
      ? actors.filter((actor) =>
          `${actor.actorName} ${actor.actorId}`.toLowerCase().includes(query),
        )
      : actors
  }, [actors, search])

  function handlePick(actorId: string, actorName: string) {
    const optimistic: ChatActor = { actorId, actorName, unreadCount: 0, isOnline: true }
    setOpen(false)
    if (onStartNewChat) onStartNewChat(optimistic)
    else onSelect(optimistic.actorId)
  }

  return (
    <>
      <aside className="bg-card flex min-w-0 shrink-0 gap-1 overflow-x-auto border-b border-slate-200 p-1.5 lg:w-[280px] lg:flex-col lg:overflow-y-auto lg:border-r lg:border-b-0 lg:p-2">
        <p className="hidden px-2 pb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase lg:block">
          Conversations
        </p>
        <div className="hidden items-center gap-2 px-1 pb-1 lg:flex">
          <label className="relative flex-1">
            <Search className="absolute top-2.5 left-3 h-3.5 w-3.5 text-slate-400" />
            <input
              className={`${inputClass} !h-8 !rounded-md !py-1.5 !pl-8 text-xs`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name or actor ID"
            />
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(true)}
            className="shrink-0 gap-1"
          >
            <Plus className="size-3.5" />
            New Chat
          </Button>
        </div>
        {/* Mobile: search + new chat row visible on small screens as stacked or inline */}
        <div className="flex items-center gap-2 px-1 pb-1 lg:hidden">
          <label className="relative flex-1">
            <Search className="absolute top-2.5 left-3 h-3.5 w-3.5 text-slate-400" />
            <input
              className={`${inputClass} !h-8 !rounded-md !py-1.5 !pl-8 text-xs`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search"
            />
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(true)}
            className="shrink-0 gap-1"
          >
            <Plus className="size-3.5" />
            New Chat
          </Button>
        </div>
        {filteredActors.map((actor) => {
          const active = actor.actorId === selectedActor
          const preview = actor.content?.trim() ? actor.content : actor.actorId
          const sentAt = formatConversationTime(actor.createdDate)
          const online = actor.isOnline !== false
          return (
            <button
              key={actor.actorId}
              type="button"
              onClick={() => onSelect(actor.actorId)}
              title={actor.actorName}
              className={`focus-visible:ring-ring flex max-w-[320px] min-w-[220px] items-center gap-3 rounded-md px-2.5 py-2 text-left focus-visible:ring-2 focus-visible:outline-none lg:min-w-0 ${
                active
                  ? '!text-brand !bg-accent !border-0'
                  : '!border-0 !bg-transparent !text-slate-700 hover:!bg-slate-50'
              }`}
            >
              <span
                className={`relative grid size-8 shrink-0 place-items-center rounded-md text-xs font-bold ${active ? 'bg-primary text-primary-foreground' : 'bg-slate-100 text-slate-500'}`}
              >
                {actor.actorName.slice(0, 1).toUpperCase()}
                <span
                  aria-hidden="true"
                  className={`absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-white ${
                    online ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{actor.actorName}</span>
                  {sentAt ? (
                    <span className="shrink-0 text-[11px] text-slate-400">{sentAt}</span>
                  ) : null}
                </span>
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-slate-500">{preview}</span>
                  {actor.unreadCount > 0 ? (
                    <span
                      aria-label={`${actor.unreadCount} unread message${actor.unreadCount === 1 ? '' : 's'}`}
                      className="bg-primary text-primary-foreground grid size-5 shrink-0 place-items-center rounded-md text-[10px] font-bold"
                    >
                      {actor.unreadCount}
                    </span>
                  ) : null}
                </span>
                <span className="sr-only">{online ? 'Online' : 'Offline'}</span>
              </span>
            </button>
          )
        })}
        {filteredActors.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
            <MessageSquare size={18} className="text-slate-300" />
            <p className="text-xs text-slate-400">
              {actors.length ? 'No matching conversations.' : 'No conversations yet.'}
            </p>
          </div>
        )}
      </aside>

      <ActorPickerSheet
        open={open}
        onOpenChange={setOpen}
        confirmLabel="Add to chat"
        excludedActorIds={actors.map((actor) => actor.actorId)}
        onSelect={(actor) => handlePick(actor.actorId, actor.actorName)}
      />
    </>
  )
}
