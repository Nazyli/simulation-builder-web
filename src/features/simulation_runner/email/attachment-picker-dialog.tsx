import { ChevronDown, ChevronRight, FileText, Folder, Loader2, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type {
  RuntimeDocumentContent,
  RuntimeDocumentStructure,
  RuntimeFileItem,
} from '../../../shared/api/documents'

export interface AttachmentPageSelection {
  participantDocContentId: string
  page: number | null
}

export interface AttachmentSelection {
  participantDocId: string
  documentName: string
  contents: AttachmentPageSelection[]
}

interface AttachmentPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentStructure: RuntimeDocumentStructure
  isLoading: boolean
  initialSelection: AttachmentSelection[]
  onConfirm: (selection: AttachmentSelection[]) => void
}

interface PickerGroup {
  key: string
  label: string
  files: RuntimeFileItem[]
}

function sortPages<T extends RuntimeDocumentContent>(contents: readonly T[]): T[] {
  return [...contents].sort((first, second) => {
    const firstPage = first.page ?? Number.MAX_SAFE_INTEGER
    const secondPage = second.page ?? Number.MAX_SAFE_INTEGER
    return (
      firstPage - secondPage ||
      (first.participantDocContentId ?? '').localeCompare(second.participantDocContentId ?? '')
    )
  })
}

function selectionToState(selection: AttachmentSelection[]): Record<string, Set<string>> {
  return Object.fromEntries(
    selection.map((item) => [
      item.participantDocId,
      new Set(item.contents.map((page) => page.participantDocContentId)),
    ]),
  )
}

function selectablePages(document: RuntimeFileItem): RuntimeDocumentContent[] {
  return sortPages(document.contents).filter(
    (content) =>
      typeof content.participantDocContentId === 'string' && content.participantDocContentId,
  )
}

export function AttachmentPickerDialog({
  open,
  onOpenChange,
  documentStructure,
  isLoading,
  initialSelection,
  onConfirm,
}: AttachmentPickerDialogProps) {
  const [selected, setSelected] = useState<Record<string, Set<string>>>({})
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!open) return
    setSelected(selectionToState(initialSelection))
    setQuery('')
    setCollapsed(new Set())
    // Re-initialize only when the dialog opens so edits stay local until confirmed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const groups = useMemo<PickerGroup[]>(() => {
    const next: PickerGroup[] = []
    for (const folder of documentStructure.filesInFolders) {
      const files = folder.files.filter(
        (file) => typeof file.participantDocId === 'string' && file.participantDocId,
      )
      if (files.length > 0) {
        next.push({ key: `folder:${folder.folderName}`, label: folder.folderName, files })
      }
    }
    const rootFiles = documentStructure.filesInRoot.filter(
      (file) => typeof file.participantDocId === 'string' && file.participantDocId,
    )
    if (rootFiles.length > 0) next.push({ key: 'root', label: 'Root', files: rootFiles })
    return next
  }, [documentStructure])

  const normalizedQuery = query.trim().toLowerCase()
  const visibleGroups = useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          files: normalizedQuery
            ? group.files.filter((file) => {
                const haystack = [file.fileName ?? '', file.ownerName ?? '', group.label]
                return haystack.some((value) => value.toLowerCase().includes(normalizedQuery))
              })
            : group.files,
        }))
        .filter((group) => group.files.length > 0),
    [groups, normalizedQuery],
  )

  const allFiles = useMemo(() => groups.flatMap((group) => group.files), [groups])
  const totalPages = useMemo(
    () => Object.values(selected).reduce((total, pages) => total + pages.size, 0),
    [selected],
  )
  const selectedDocuments = useMemo(
    () => Object.values(selected).filter((pages) => pages.size > 0).length,
    [selected],
  )

  const togglePage = (participantDocId: string, contentId: string) => {
    setSelected((current) => {
      const pages = new Set(current[participantDocId] ?? [])
      if (pages.has(contentId)) {
        pages.delete(contentId)
      } else {
        pages.add(contentId)
      }
      return { ...current, [participantDocId]: pages }
    })
  }

  const toggleDocument = (document: RuntimeFileItem) => {
    const participantDocId = document.participantDocId as string
    const pages = selectablePages(document)
    const allSelected =
      pages.length > 0 &&
      pages.every((content) =>
        selected[participantDocId]?.has(content.participantDocContentId as string),
      )
    setSelected((current) => ({
      ...current,
      [participantDocId]: new Set(
        allSelected ? [] : pages.map((content) => content.participantDocContentId as string),
      ),
    }))
  }

  const toggleGroup = (key: string) => {
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const confirm = () => {
    const next: AttachmentSelection[] = []
    for (const document of allFiles) {
      const participantDocId = document.participantDocId as string
      const pages = selected[participantDocId]
      if (!pages?.size) continue
      next.push({
        participantDocId,
        documentName: document.fileName ?? 'Untitled document',
        contents: selectablePages(document)
          .filter((content) => pages.has(content.participantDocContentId ?? ''))
          .map((content) => ({
            participantDocContentId: content.participantDocContentId ?? '',
            page: content.page,
          })),
      })
    }
    onConfirm(next)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-32px)] w-[min(640px,calc(100vw-24px))] flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
        <DialogHeader className="bg-card gap-0 border-b border-[var(--color-border)] px-5 py-4 pr-14">
          <DialogTitle className="text-[var(--color-canvas-heading)]">Attach documents</DialogTitle>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            Choose documents and the pages to include as email attachments.
          </p>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-5">
          {isLoading ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm">
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              Loading documents...
            </div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
              <span className="text-muted-foreground grid size-11 place-items-center rounded-md bg-[var(--color-surface-muted)]">
                <FileText size={19} aria-hidden="true" />
              </span>
              <p className="text-sm font-medium text-[var(--color-canvas-heading)]">
                No documents available
              </p>
              <p className="text-muted-foreground max-w-sm text-xs leading-relaxed">
                Documents added to this simulation session will appear here.
              </p>
            </div>
          ) : (
            <div className="flex min-w-0 flex-col gap-3">
              <label className="relative block">
                <Search
                  className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
                  aria-hidden="true"
                />
                <Input
                  aria-label="Search documents to attach"
                  placeholder="Search by file, owner, or folder"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="bg-card h-9 pl-8"
                />
              </label>

              {visibleGroups.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                  <p className="text-sm font-medium text-[var(--color-canvas-heading)]">
                    No matching documents
                  </p>
                  <p className="text-muted-foreground text-xs">Try a different search term.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {visibleGroups.map((group) => {
                    const isCollapsed = normalizedQuery ? false : collapsed.has(group.key)
                    const groupPages = group.files.reduce(
                      (total, file) =>
                        total +
                        selectablePages(file).filter((content) =>
                          selected[file.participantDocId as string]?.has(
                            content.participantDocContentId as string,
                          ),
                        ).length,
                      0,
                    )
                    return (
                      <section
                        key={group.key}
                        className="bg-card overflow-hidden rounded-lg border border-[var(--color-border)]"
                      >
                        <button
                          type="button"
                          aria-expanded={!isCollapsed}
                          onClick={() => toggleGroup(group.key)}
                          className="focus-visible:ring-ring/50 flex w-full min-w-0 items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-[var(--color-surface-muted)] focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset motion-reduce:transition-none"
                        >
                          {isCollapsed ? (
                            <ChevronRight
                              size={15}
                              className="text-muted-foreground shrink-0"
                              aria-hidden="true"
                            />
                          ) : (
                            <ChevronDown
                              size={15}
                              className="text-muted-foreground shrink-0"
                              aria-hidden="true"
                            />
                          )}
                          <Folder size={15} className="text-primary shrink-0" aria-hidden="true" />
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--color-canvas-heading)]">
                            {group.label}
                          </span>
                          <span className="text-muted-foreground shrink-0 text-[11px] font-medium">
                            {groupPages > 0 ? `${groupPages} selected · ` : ''}
                            {group.files.length} file{group.files.length === 1 ? '' : 's'}
                          </span>
                        </button>

                        {isCollapsed ? null : (
                          <ul className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
                            {group.files.map((file) => {
                              const docId = file.participantDocId as string
                              const pages = selectablePages(file)
                              const selectedCount = pages.filter((content) =>
                                selected[docId]?.has(content.participantDocContentId as string),
                              ).length
                              const allSelected = pages.length > 0 && selectedCount === pages.length
                              return (
                                <li key={docId}>
                                  <label className="flex cursor-pointer items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-[var(--color-surface-muted)]/70 motion-reduce:transition-none">
                                    <Checkbox
                                      checked={
                                        selectedCount > 0 && !allSelected
                                          ? 'indeterminate'
                                          : allSelected
                                      }
                                      disabled={pages.length === 0}
                                      onCheckedChange={() => toggleDocument(file)}
                                    />
                                    <span className="bg-accent text-primary grid size-7 shrink-0 place-items-center rounded-md">
                                      <FileText size={14} aria-hidden="true" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                      <span className="block truncate text-sm font-medium text-[var(--color-canvas-heading)]">
                                        {file.fileName ?? 'Untitled document'}
                                      </span>
                                      <span className="text-muted-foreground block truncate text-[11px]">
                                        {file.ownerName || 'Unknown owner'} · {pages.length} page
                                        {pages.length === 1 ? '' : 's'}
                                      </span>
                                    </span>
                                    <span className="text-muted-foreground shrink-0 text-[11px] tabular-nums">
                                      {selectedCount}/{pages.length}
                                    </span>
                                  </label>

                                  {pages.length > 0 ? (
                                    <ul className="grid grid-cols-1 gap-1 px-3 pb-2.5 pl-10 sm:grid-cols-2">
                                      {pages.map((content) => {
                                        const contentId = content.participantDocContentId as string
                                        return (
                                          <li key={contentId}>
                                            <label className="hover:bg-accent/50 flex cursor-pointer items-center gap-2 rounded-sm px-1.5 py-1 transition-colors motion-reduce:transition-none">
                                              <Checkbox
                                                checked={Boolean(selected[docId]?.has(contentId))}
                                                onCheckedChange={() => togglePage(docId, contentId)}
                                              />
                                              <span className="text-xs text-[var(--color-canvas-foreground)]">
                                                Page {content.page ?? '—'}
                                              </span>
                                              {content.isHighlight ? (
                                                <span className="bg-accent text-accent-foreground rounded-sm px-1 py-px text-[9px] font-semibold">
                                                  Highlight
                                                </span>
                                              ) : null}
                                            </label>
                                          </li>
                                        )
                                      })}
                                    </ul>
                                  ) : null}
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </section>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-card flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] px-5 py-3">
          <p className="text-muted-foreground text-xs" aria-live="polite">
            <span className="font-medium text-[var(--color-canvas-heading)]">
              {totalPages} page{totalPages === 1 ? '' : 's'}
            </span>{' '}
            selected
            {selectedDocuments > 0
              ? ` from ${selectedDocuments} document${selectedDocuments === 1 ? '' : 's'}`
              : ''}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={confirm}>
              Attach
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
