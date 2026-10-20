import { useEffect, useState } from 'react'
import { FileText, Paperclip, Pencil, Send, X } from 'lucide-react'
import type { AttachmentSelection } from './attachment-picker-dialog'
import { ActorPickerSheet } from '../components/actor-picker-sheet'
import type { EmailComposerDraft } from './types'
import { formatReplySubject } from './utils'

interface MessageComposerProps {
  target: string
  subject: string
  draft: EmailComposerDraft | null
  disabled: boolean
  attachments: AttachmentSelection[]
  onOpenAttachmentPicker: () => void
  onRemoveAttachment: (participantDocId: string) => void
  onSubmit: (form: HTMLFormElement, status: 'sent' | 'draft') => void
}

function formatPages(pages: { page: number | null }[]): string {
  return pages.map((page) => page.page ?? '—').join(', ')
}

export function MessageComposer({
  target,
  subject: latestSubject,
  draft,
  disabled,
  attachments,
  onOpenAttachmentPicker,
  onRemoveAttachment,
  onSubmit,
}: MessageComposerProps) {
  const [recipient, setRecipient] = useState(target)
  const [subject, setSubject] = useState(draft?.subject ?? formatReplySubject(latestSubject))
  const [content, setContent] = useState(draft?.content ?? '')
  const [actorPickerOpen, setActorPickerOpen] = useState(false)
  const hasTarget = Boolean(recipient.trim())
  const canSaveDraft = hasTarget && (Boolean(subject.trim()) || Boolean(content.trim()))
  const draftId = draft?.draftId
  const draftSubject = draft?.subject ?? ''
  const draftContent = draft?.content ?? ''
  const draftUpdatedAt = draft?.updatedAt ?? ''

  useEffect(() => {
    if (!draftId) return
    setRecipient(target)
    setSubject(draftSubject)
    setContent(draftContent)
  }, [draftContent, draftId, draftSubject, draftUpdatedAt, target])

  return (
    <form
      className="bg-card min-w-0 border-t border-slate-200"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(event.currentTarget, 'sent')
      }}
    >
      <div className="flex min-w-0 flex-col gap-2 p-3">
        <div className="flex items-center gap-2 pb-1">
          <span className="text-xs font-medium text-slate-500">Reply to</span>
          <span className="text-brand text-xs font-semibold">{recipient}</span>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            name="target"
            required
            disabled={disabled}
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
            placeholder={hasTarget ? undefined : 'Select a conversation to reply'}
            className="focus:border-ring focus:ring-ring/15 min-h-9 min-w-0 flex-1 rounded-md border border-slate-200 bg-[var(--color-canvas)] px-3 py-2 text-sm text-[var(--color-canvas-foreground)] transition-colors outline-none placeholder:text-[var(--color-canvas-text-muted)] focus:ring-2 disabled:bg-slate-100 disabled:text-slate-400"
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => setActorPickerOpen(true)}
            className="hover:border-primary hover:text-brand min-h-9 shrink-0 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500 transition-colors disabled:opacity-50"
          >
            Pick actor
          </button>
        </div>

        <input
          type="text"
          name="subject"
          disabled={disabled}
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder={hasTarget ? 'Subject' : undefined}
          className="focus:border-ring focus:ring-ring/15 min-h-9 w-full rounded-md border border-slate-200 bg-[var(--color-canvas)] px-3 py-2 text-sm text-[var(--color-canvas-foreground)] transition-colors outline-none placeholder:text-[var(--color-canvas-text-muted)] focus:ring-2 disabled:bg-slate-100 disabled:text-slate-400"
        />

        <textarea
          name="content"
          disabled={disabled}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder={hasTarget ? 'Write your reply...' : undefined}
          className="focus:border-ring focus:ring-ring/15 min-h-[72px] w-full resize-y rounded-md border border-slate-200 bg-[var(--color-canvas)] px-3 py-2 text-sm text-[var(--color-canvas-foreground)] transition-colors outline-none placeholder:text-[var(--color-canvas-text-muted)] focus:ring-2 disabled:bg-slate-100 disabled:text-slate-400"
        />

        {attachments.length > 0 ? (
          <ul className="flex flex-wrap gap-2" aria-label="Attached documents">
            {attachments.map((attachment) => (
              <li
                key={attachment.participantDocId}
                className="border-secondary bg-accent inline-flex max-w-full items-center gap-1.5 rounded-md border py-1 pr-1.5 pl-2.5 text-xs text-slate-900"
              >
                <FileText size={13} className="text-brand shrink-0" />
                <span className="max-w-[220px] truncate font-medium">
                  {attachment.documentName}
                </span>
                <span className="text-slate-500">(pages {formatPages(attachment.contents)})</span>
                <button
                  type="button"
                  aria-label={`Remove ${attachment.documentName}`}
                  disabled={disabled}
                  onClick={() => onRemoveAttachment(attachment.participantDocId)}
                  className="hover:bg-secondary/30 grid size-4 shrink-0 place-items-center rounded-full text-slate-500 transition-colors hover:text-slate-900 disabled:opacity-50"
                >
                  <X size={12} />
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={onOpenAttachmentPicker}
            disabled={!hasTarget || disabled}
            className="hover:border-primary hover:text-brand inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500 transition-colors disabled:opacity-50"
          >
            <Paperclip size={15} />
            Attach
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!canSaveDraft || disabled}
              onClick={(event) => {
                const form = event.currentTarget.form
                if (form) onSubmit(form, 'draft')
              }}
              className="hover:border-primary hover:text-brand inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500 transition-colors disabled:opacity-50"
            >
              <Pencil size={15} />
              Draft
            </button>
            <button
              type="submit"
              disabled={!hasTarget || disabled}
              className="bg-primary text-primary-foreground hover:bg-primary/80 inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              <Send size={15} />
              Send
            </button>
          </div>
        </div>
      </div>
      <ActorPickerSheet
        open={actorPickerOpen}
        onOpenChange={setActorPickerOpen}
        confirmLabel="Use recipient"
        selectedActorId={recipient}
        onSelect={(actor) => setRecipient(actor.actorId)}
      />
    </form>
  )
}
