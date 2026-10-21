import { Edit3, Eye, FileText, Folder, Plus, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SurfaceSection } from '../../../components/layout/surface-section'
import { DOCUMENT_TYPE_META, formatDocumentDate, type SimulationDocument } from './types'

interface DocumentWorkspaceProps {
  documents: SimulationDocument[]
  selectedId: string | null
  onOpenPreview: (doc: SimulationDocument) => void
  editor?: React.ReactNode
  onCreateDocument?: () => void
  onEditDocument?: (doc: SimulationDocument) => void
}

interface FolderGroup {
  name: string
  documents: SimulationDocument[]
  latestModified: string | null
}

function newestModified(documents: SimulationDocument[]): string | null {
  let latest: string | null = null
  let latestTime = Number.NEGATIVE_INFINITY
  for (const doc of documents) {
    if (!doc.modifiedAt) continue
    const time = new Date(doc.modifiedAt).getTime()
    if (!Number.isNaN(time) && time > latestTime) {
      latestTime = time
      latest = doc.modifiedAt
    }
  }
  return latest
}

function groupByFolder(documents: SimulationDocument[]): FolderGroup[] {
  const folders = new Map<string, SimulationDocument[]>()
  for (const doc of documents) {
    if (!doc.folderName) continue
    const current = folders.get(doc.folderName) ?? []
    current.push(doc)
    folders.set(doc.folderName, current)
  }
  return Array.from(folders, ([name, files]) => ({
    name,
    documents: files,
    latestModified: newestModified(files),
  }))
}

export function DocumentWorkspace({
  documents,
  selectedId,
  onOpenPreview,
  editor = null,
  onCreateDocument,
  onEditDocument,
}: DocumentWorkspaceProps) {
  const [search, setSearch] = useState('')
  const [folderFilter, setFolderFilter] = useState<string | null>(null)
  const folderGroups = useMemo(() => groupByFolder(documents), [documents])
  const activeFolder = folderGroups.some((group) => group.name === folderFilter)
    ? folderFilter
    : null
  const query = search.trim().toLowerCase()

  const filtered = useMemo(
    () =>
      documents.filter((doc) => {
        if (activeFolder && doc.folderName !== activeFolder) return false
        if (!query) return true
        return (
          doc.title.toLowerCase().includes(query) ||
          doc.ownerName.toLowerCase().includes(query) ||
          (doc.folderName ?? '').toLowerCase().includes(query)
        )
      }),
    [documents, activeFolder, query],
  )

  if (editor) {
    return <div className="flex h-full min-h-0 flex-col">{editor}</div>
  }

  const hasDocuments = documents.length > 0
  const hasFilters = Boolean(query) || activeFolder !== null

  function openDocument(doc: SimulationDocument) {
    onOpenPreview(doc)
  }

  function clearFilters() {
    setSearch('')
    setFolderFilter(null)
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <div className="flex min-w-0 flex-col gap-[var(--page-gap)] pb-1">
        <header className="flex min-w-0 flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[20px] leading-tight font-semibold tracking-[-0.02em] break-words text-[var(--color-canvas-heading)] max-[620px]:text-[18px]">
              Documents
            </h1>
            <p className="mt-1 max-w-[64ch] text-sm leading-relaxed break-words text-[var(--color-canvas-text-muted)]">
              Files shared with this simulation session.
            </p>
          </div>
          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
            <label className="relative min-w-0 flex-1 sm:w-[260px] sm:flex-none">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-[var(--color-canvas-text-muted)]"
                aria-hidden="true"
              />
              <Input
                aria-label="Search documents"
                placeholder="Search documents"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="bg-card h-9 pl-8"
              />
            </label>
            {onCreateDocument ? (
              <Button type="button" onClick={onCreateDocument} className="h-9 gap-1.5 px-3">
                <Plus size={15} aria-hidden="true" />
                New document
              </Button>
            ) : null}
          </div>
        </header>

        {folderGroups.length > 0 ? (
          <SurfaceSection
            title="Folders"
            description="Select a folder to show only its files."
            actions={
              <Button
                type="button"
                size="sm"
                variant={activeFolder === null ? 'secondary' : 'outline'}
                aria-pressed={activeFolder === null}
                onClick={() => setFolderFilter(null)}
              >
                All files
                <span className="text-[11px] font-medium opacity-70">{documents.length}</span>
              </Button>
            }
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {folderGroups.map((group) => {
                const active = group.name === activeFolder
                return (
                  <button
                    key={group.name}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFolderFilter(active ? null : group.name)}
                    className={`group bg-card focus-visible:ring-ring/50 flex min-w-0 flex-col gap-3 rounded-lg border p-3 text-left transition-[border-color,box-shadow,background-color] duration-150 focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none ${
                      active
                        ? 'bg-accent/40 border-[var(--color-border-strong)]'
                        : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:shadow-sm'
                    }`}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-primary group-hover:bg-accent grid size-9 shrink-0 place-items-center rounded-md bg-[var(--color-surface-muted)] transition-colors motion-reduce:transition-none">
                        <Folder size={17} aria-hidden="true" />
                      </span>
                      <span className="text-[11px] font-semibold text-[var(--color-canvas-text-muted)]">
                        {group.documents.length} file{group.documents.length === 1 ? '' : 's'}
                      </span>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-[var(--color-canvas-heading)]">
                        {group.name}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-[var(--color-canvas-text-muted)]">
                        {group.latestModified
                          ? `Modified ${formatDocumentDate(group.latestModified)}`
                          : 'Not modified yet'}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </SurfaceSection>
        ) : null}

        <SurfaceSection
          variant="panel"
          title="All files"
          description={
            activeFolder
              ? `Showing files in ${activeFolder}.`
              : `${documents.length} file${documents.length === 1 ? '' : 's'} available.`
          }
          actions={
            activeFolder ? (
              <span className="border-border inline-flex max-w-full min-w-0 items-center gap-1 rounded-sm border bg-[var(--color-surface-muted)] px-1.5 py-0.5 text-xs font-medium text-[var(--color-canvas-heading)]">
                <Folder size={12} className="shrink-0" aria-hidden="true" />
                <span className="truncate">{activeFolder}</span>
                <button
                  type="button"
                  aria-label={`Show all files instead of ${activeFolder}`}
                  onClick={() => setFolderFilter(null)}
                  className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 -mr-0.5 grid size-4 shrink-0 place-items-center rounded-sm transition-colors focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none"
                >
                  <X size={11} aria-hidden="true" />
                </button>
              </span>
            ) : undefined
          }
        >
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
              <span className="text-muted-foreground grid size-11 place-items-center rounded-md bg-[var(--color-surface-muted)]">
                <FileText size={19} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-medium text-[var(--color-canvas-heading)]">
                  {hasDocuments ? 'No matching documents' : 'No documents yet'}
                </p>
                <p className="mt-1 max-w-sm text-xs leading-relaxed text-[var(--color-canvas-text-muted)]">
                  {hasDocuments
                    ? 'Try a different search or show all files.'
                    : 'Documents shared with this simulation will appear here.'}
                </p>
              </div>
              {hasFilters ? (
                <Button type="button" size="sm" variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : onCreateDocument ? (
                <Button type="button" size="sm" onClick={onCreateDocument}>
                  <Plus size={14} aria-hidden="true" />
                  New document
                </Button>
              ) : null}
            </div>
          ) : (
            <Table className="min-w-[760px]">
              <TableHeader className="[&_th]:h-9 [&_th]:bg-[var(--color-surface-muted)] [&_th]:px-2.5 [&_th]:text-[11px] [&_th]:font-semibold [&_th]:tracking-normal [&_th]:text-[var(--color-canvas-text-muted)]">
                <TableRow className="hover:bg-transparent">
                  <TableHead>File name</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Modified</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((doc) => {
                  const typeMeta = DOCUMENT_TYPE_META[doc.type]
                  const active = doc.id === selectedId
                  return (
                    <TableRow
                      key={doc.id || doc.title}
                      data-state={active ? 'selected' : undefined}
                      className={
                        active ? 'bg-accent/40 data-[state=selected]:bg-accent/40' : undefined
                      }
                    >
                      <TableCell className="px-2.5">
                        <button
                          type="button"
                          onClick={() => openDocument(doc)}
                          aria-label={`Open ${doc.title}`}
                          className="group/name focus-visible:ring-ring/50 flex max-w-full min-w-0 items-center gap-2.5 rounded-md text-left focus-visible:ring-2 focus-visible:outline-none"
                        >
                          <span
                            className="grid size-8 shrink-0 place-items-center rounded-md"
                            style={{ backgroundColor: typeMeta.bg, color: typeMeta.color }}
                            aria-hidden="true"
                          >
                            <FileText size={15} />
                          </span>
                          <span className="min-w-0">
                            <span className="text-foreground group-hover/name:text-primary block max-w-[260px] truncate text-sm font-medium transition-colors motion-reduce:transition-none">
                              {doc.title}
                            </span>
                            <span className="text-muted-foreground block text-[11px]">
                              {doc.pageCount} page{doc.pageCount === 1 ? '' : 's'}
                            </span>
                          </span>
                        </button>
                      </TableCell>
                      <TableCell className="px-2.5">
                        <span
                          className="text-muted-foreground block max-w-[180px] truncate text-sm"
                          title={doc.ownerName || undefined}
                        >
                          {doc.ownerName || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="px-2.5">
                        <span className="text-muted-foreground text-xs whitespace-nowrap">
                          {formatDocumentDate(doc.modifiedAt) || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="px-2.5">
                        {doc.folderName ? (
                          <span className="text-muted-foreground inline-flex max-w-[180px] items-center gap-1.5 text-xs">
                            <Folder size={12} className="shrink-0" aria-hidden="true" />
                            <span className="truncate">{doc.folderName}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">Root</span>
                        )}
                      </TableCell>
                      <TableCell className="px-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => openDocument(doc)}
                            aria-label={`Preview ${doc.title}`}
                            title="Preview"
                          >
                            <Eye size={13} aria-hidden="true" />
                            Preview
                          </Button>
                          {onEditDocument ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => onEditDocument(doc)}
                              aria-label={`Edit ${doc.title}`}
                              title="Edit"
                            >
                              <Edit3 size={13} aria-hidden="true" />
                              Edit
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </SurfaceSection>
      </div>
    </div>
  )
}
