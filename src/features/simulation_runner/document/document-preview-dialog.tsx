import { CalendarClock, FileText, Folder, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { isHtmlContent } from '@/shared/html'
import { SafeHtml } from '@/shared/safe-html'
import { DOCUMENT_TYPE_META, formatDocumentDate, type SimulationDocument } from './types'

interface DocumentPreviewDialogProps {
  document: SimulationDocument
  open: boolean
  onOpenChange: (open: boolean) => void
}

function MetaItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span className="text-muted-foreground mt-0.5 shrink-0" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-muted-foreground text-[10px] font-semibold tracking-[0.06em] uppercase">
          {label}
        </dt>
        <dd
          className="truncate text-xs font-medium text-[var(--color-canvas-heading)]"
          title={value}
        >
          {value}
        </dd>
      </div>
    </div>
  )
}

export function DocumentPreviewDialog({
  document: doc,
  open,
  onOpenChange,
}: DocumentPreviewDialogProps) {
  const typeMeta = DOCUMENT_TYPE_META[doc.type]
  const hasContent = doc.pages.some((page) => page.trim().length > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-32px)] w-[min(960px,calc(100vw-24px))] flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
        <DialogHeader className="bg-card gap-0 border-b border-[var(--color-border)] px-5 py-4 pr-14">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className="grid size-10 shrink-0 place-items-center rounded-md"
              style={{ backgroundColor: typeMeta.bg, color: typeMeta.color }}
              aria-hidden="true"
            >
              <FileText size={19} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <DialogTitle className="min-w-0 text-base leading-snug font-semibold break-words text-[var(--color-canvas-heading)]">
                  {doc.title}
                </DialogTitle>
                {doc.isHighlight ? (
                  <span className="border-primary/30 bg-accent text-accent-foreground rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold">
                    Highlighted
                  </span>
                ) : null}
              </div>
              <DialogDescription className="sr-only">Preview of {doc.title}</DialogDescription>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            <MetaItem
              icon={<UserRound size={14} />}
              label="Owner"
              value={doc.ownerName || 'Unknown'}
            />
            <MetaItem icon={<Folder size={14} />} label="Folder" value={doc.folderName ?? 'Root'} />
            <MetaItem
              icon={<CalendarClock size={14} />}
              label="Modified"
              value={formatDocumentDate(doc.modifiedAt) || 'Not modified yet'}
            />
            <MetaItem
              icon={<FileText size={14} />}
              label="Pages"
              value={`${doc.pageCount} page${doc.pageCount === 1 ? '' : 's'}`}
            />
          </dl>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--color-canvas)] px-2.5 py-4 sm:px-6 sm:py-6">
          {hasContent ? (
            <div className="mx-auto flex w-full max-w-[720px] flex-col gap-5">
              {doc.pages.map((page, index) => (
                <section key={index} aria-label={`Page ${index + 1} of ${doc.pages.length}`}>
                  <article className="document-paper min-h-[520px] p-5 text-sm leading-7 sm:min-h-[720px] sm:p-10">
                    {isHtmlContent(page) ? (
                      <SafeHtml html={page} className="document-page-content" />
                    ) : (
                      <div className="whitespace-pre-wrap">{page}</div>
                    )}
                  </article>
                  {doc.pages.length > 1 ? (
                    <p className="text-muted-foreground mt-2 text-center text-[11px]">
                      Page {index + 1} of {doc.pages.length}
                    </p>
                  ) : null}
                </section>
              ))}
            </div>
          ) : (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-2 px-4 text-center">
              <span className="bg-card text-muted-foreground grid size-11 place-items-center rounded-md border border-[var(--color-border)]">
                <FileText size={19} aria-hidden="true" />
              </span>
              <p className="text-sm font-medium text-[var(--color-canvas-heading)]">
                This document is empty
              </p>
              <p className="text-muted-foreground max-w-sm text-xs leading-relaxed">
                Content will appear here once pages have been added or saved.
              </p>
            </div>
          )}
        </div>

        <div className="bg-card flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] px-5 py-3">
          <p className="text-muted-foreground min-w-0 truncate text-xs">
            <span className="font-medium text-[var(--color-canvas-heading)]">{typeMeta.label}</span>
            <span className="mx-1.5 text-[var(--color-border-strong)]" aria-hidden="true">
              ·
            </span>
            {doc.pageCount} page{doc.pageCount === 1 ? '' : 's'}
            {doc.folderName ? ` · ${doc.folderName}` : ' · Root'}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
