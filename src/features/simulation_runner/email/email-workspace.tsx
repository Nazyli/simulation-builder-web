import { Inbox } from 'lucide-react'
import { ConversationBody } from './conversation-body'
import { ConversationHeader } from './conversation-header'
import { ConversationSidebar } from './conversation-sidebar'
import type { AttachmentSelection } from './attachment-picker-dialog'
import { MessageComposer } from './message-composer'
import type {
  EmailAttachment,
  EmailComposerDraft,
  EmailDraft,
  EmailInboxThread,
  EmailMessage,
} from './types'

export interface EmailWorkspaceProps {
  participantId: string
  messages: EmailMessage[]
  threads: EmailInboxThread[]
  drafts: EmailDraft[]
  folder: 'inbox' | 'draft'
  onFolderChange: (folder: 'inbox' | 'draft') => void
  composerDraft: EmailComposerDraft | null
  composerResetKey: number
  selectedRootId: string | null
  onSelectThread: (rootId: string) => void
  selectedThread: EmailInboxThread | null
  disabled: boolean
  attachments: AttachmentSelection[]
  onOpenAttachmentPicker: () => void
  onRemoveAttachment: (participantDocId: string) => void
  onSubmit: (form: HTMLFormElement, status: 'sent' | 'draft') => void
  onConversationOpen?: (rootId: string) => void
  openingAttachmentIds: ReadonlySet<string>
  onOpenAttachment: (message: EmailMessage, attachment: EmailAttachment) => void
}

export function EmailWorkspace({
  participantId,
  messages,
  threads,
  drafts,
  folder,
  onFolderChange,
  composerDraft,
  composerResetKey,
  selectedRootId,
  onSelectThread,
  selectedThread,
  disabled,
  attachments,
  onOpenAttachmentPicker,
  onRemoveAttachment,
  onSubmit,
  onConversationOpen,
  openingAttachmentIds,
  onOpenAttachment,
}: EmailWorkspaceProps) {
  return (
    <section className="bg-card col-span-full flex min-h-0 min-h-[480px] min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-200">
      <div className="flex h-full min-h-0 flex-col lg:flex-row">
        <ConversationSidebar
          threads={threads}
          drafts={drafts}
          folder={folder}
          onFolderChange={onFolderChange}
          selectedRootId={selectedRootId}
          onSelect={(rootId) => {
            onSelectThread(rootId)
            onConversationOpen?.(rootId)
          }}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--color-canvas)]">
          {selectedThread ? (
            <>
              <ConversationHeader thread={selectedThread} messages={messages} />
              <ConversationBody
                messages={messages}
                participantId={participantId}
                openingAttachmentIds={openingAttachmentIds}
                onOpenAttachment={onOpenAttachment}
              />
              <MessageComposer
                key={`${selectedThread.participantEmailId}-${composerResetKey}`}
                target={selectedThread.from}
                subject={selectedThread.subject}
                draft={composerDraft}
                disabled={disabled}
                attachments={attachments}
                onOpenAttachmentPicker={onOpenAttachmentPicker}
                onRemoveAttachment={onRemoveAttachment}
                onSubmit={onSubmit}
              />
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center bg-[var(--color-canvas)] px-6 text-center">
              <div className="flex flex-col items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-slate-100">
                  <Inbox size={20} className="text-slate-400" />
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {folder === 'draft'
                      ? drafts.length
                        ? 'Select a draft'
                        : 'No drafts yet'
                      : threads.length
                        ? 'Select a conversation'
                        : 'No emails yet'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {folder === 'draft'
                      ? drafts.length
                        ? 'Choose a draft to continue writing.'
                        : 'Saved drafts will appear here.'
                      : threads.length
                        ? 'Choose an email thread from the list to read and reply.'
                        : 'Email messages from simulation actors will appear here.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
