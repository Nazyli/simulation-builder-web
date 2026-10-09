import { useQuery } from '@tanstack/react-query'
import { Loader2, Mail, Search } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  getRunnerActorGroups,
  getRunnerActors,
  RUNNER_ACTOR_SCOPE,
  type RunnerActor,
} from '../../../shared/api/runner-actors'
import { actorGroupLabel, groupActorContacts } from './actor-picker-logic'

interface ActorPickerSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedActorId?: string | null
  excludedActorIds?: readonly string[]
  confirmLabel: string
  onSelect: (actor: RunnerActor) => void
}

export function ActorPickerSheet(props: ActorPickerSheetProps) {
  const triggerRef = useRef<HTMLElement | null>(null)
  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent
        side="right"
        className="bg-card text-card-foreground w-full max-w-[360px] gap-0 motion-reduce:animate-none motion-reduce:transition-none sm:max-w-[360px]"
        onOpenAutoFocus={() => {
          triggerRef.current = document.activeElement as HTMLElement | null
        }}
        onCloseAutoFocus={(event) => {
          if (triggerRef.current?.isConnected) {
            event.preventDefault()
            triggerRef.current.focus()
          }
        }}
      >
        <SheetHeader className="border-border gap-1 border-b px-4 py-3">
          <SheetTitle className="text-base">Contacts</SheetTitle>
          <SheetDescription className="text-xs">Choose one contact to continue.</SheetDescription>
        </SheetHeader>
        {props.open ? <ActorPickerContent {...props} /> : null}
      </SheetContent>
    </Sheet>
  )
}

function ActorPickerContent({
  onOpenChange,
  onSelect,
  confirmLabel,
  selectedActorId,
  excludedActorIds = [],
}: ActorPickerSheetProps) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [group, setGroup] = useState('all')
  const [selection, setSelection] = useState(selectedActorId ?? null)
  const radioName = useId()
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300)
    return () => window.clearTimeout(timer)
  }, [search])
  const groupsQuery = useQuery({
    queryKey: ['master', 'actors', 'runner', RUNNER_ACTOR_SCOPE, 'groups'],
    queryFn: ({ signal }) => getRunnerActorGroups('', signal),
  })
  const actorGroupPosition = group === 'all' ? undefined : group.slice('group:'.length)
  const actorsQuery = useQuery({
    queryKey: [
      'master',
      'actors',
      'runner',
      RUNNER_ACTOR_SCOPE,
      'contacts',
      debouncedSearch,
      actorGroupPosition,
    ],
    queryFn: ({ signal }) =>
      getRunnerActors({ search: debouncedSearch, actorGroupPosition }, signal),
  })
  const contacts = useMemo(() => {
    const excluded = new Set(excludedActorIds)
    return (actorsQuery.data ?? []).filter((actor) => !excluded.has(actor.actorId))
  }, [actorsQuery.data, excludedActorIds])
  const groupedContacts = useMemo(() => groupActorContacts(contacts), [contacts])
  const selected = contacts.find((actor) => actor.actorId === selection)
  const updating = search !== debouncedSearch || actorsQuery.isFetching
  const failed = groupsQuery.isError || actorsQuery.isError
  function confirm() {
    if (!selected || updating || failed) return
    onSelect(selected)
    onOpenChange(false)
  }
  return (
    <>
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden="true"
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
          />
          <Input
            aria-label="Search contacts"
            placeholder="Search contacts"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setSelection(null)
            }}
            className="h-9 pl-8 text-xs sm:h-8"
          />
        </div>
        <Select
          value={group}
          onValueChange={(value) => {
            setGroup(value)
            setSelection(null)
          }}
          disabled={groupsQuery.isPending || groupsQuery.isError}
        >
          <SelectTrigger
            aria-label="Contact group"
            className="h-9 w-[110px] shrink-0 text-xs sm:h-8"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {(groupsQuery.data ?? [])
              .filter((value) => value !== null)
              .map((value) => (
                <SelectItem key={value} value={`group:${value}`}>
                  {actorGroupLabel(value)}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
      <div className="bg-canvas min-h-0 flex-1 overflow-y-auto px-4 py-2" aria-busy={updating}>
        {failed ? (
          <div role="alert" className="space-y-3 py-8 text-center">
            <p className="text-sm">Unable to load contacts.</p>
            <Button
              variant="outline"
              onClick={() => {
                void groupsQuery.refetch()
                void actorsQuery.refetch()
              }}
            >
              Try again
            </Button>
          </div>
        ) : actorsQuery.isPending ? (
          <p
            role="status"
            className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm"
          >
            <Loader2
              aria-hidden="true"
              className="size-4 animate-spin motion-reduce:animate-none"
            />
            Loading contacts...
          </p>
        ) : contacts.length === 0 ? (
          <div role="status" className="space-y-1 py-8 text-center">
            <p className="text-sm font-medium">No contacts found.</p>
            <p className="text-muted-foreground text-xs">Try another search or group.</p>
          </div>
        ) : (
          <div className="space-y-3" role="group" aria-label="Choose a contact">
            {groupedContacts.map(({ group, label: heading, actors }) => (
              <section key={JSON.stringify(group)}>
                <h3 className="text-muted-foreground mb-1 text-xs font-semibold">{heading}</h3>
                <div className="space-y-1">
                  {actors.map((actor) => {
                    const name = actor.actorName || actor.actorEmail || actor.actorId
                    const initials = name
                      .trim()
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((word) => word[0])
                      .join('')
                      .toUpperCase()
                    return (
                      <label
                        key={actor.actorId}
                        className={`border-border has-[:focus-visible]:ring-ring flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 transition-colors has-[:focus-visible]:ring-2 ${selection === actor.actorId ? 'border-primary bg-accent text-accent-foreground' : 'bg-card text-card-foreground hover:bg-accent/50'}`}
                      >
                        <span
                          aria-hidden="true"
                          className="bg-secondary/40 text-accent-foreground grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold"
                        >
                          {initials}
                        </span>
                        <span className="min-w-0 flex-1 space-y-0.5">
                          <span className="flex items-baseline gap-2">
                            <span className="min-w-0 flex-1 text-sm font-semibold break-words">
                              {name}
                            </span>
                            {actor.actorPosition ? (
                              <span
                                title={actor.actorPosition}
                                className="text-muted-foreground max-w-[45%] truncate text-xs"
                              >
                                {actor.actorPosition}
                              </span>
                            ) : null}
                          </span>
                          {actor.actorEmail ? (
                            <span className="text-muted-foreground flex items-start gap-1 text-xs break-all">
                              <Mail aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
                              {actor.actorEmail}
                            </span>
                          ) : null}
                        </span>
                        <input
                          type="radio"
                          name={radioName}
                          value={actor.actorId}
                          checked={selection === actor.actorId}
                          onChange={() => setSelection(actor.actorId)}
                          className="accent-primary size-3.5 shrink-0"
                        />
                      </label>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
      <SheetFooter className="border-border border-t px-4 py-2.5">
        <Button
          type="button"
          className="h-9 text-xs sm:h-8"
          onClick={confirm}
          disabled={!selected || updating || failed}
        >
          {confirmLabel}
        </Button>
      </SheetFooter>
    </>
  )
}
