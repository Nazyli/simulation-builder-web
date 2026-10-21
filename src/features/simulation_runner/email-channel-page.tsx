import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  getEmailDrafts,
  getEmailInbox,
  getEmailThreadMessages,
  markEmailAttachmentOpened,
  type EmailDraftItem,
  type EmailInboxThreadItem,
  type EmailMessage as ApiEmailMessage,
  type ParticipantEmailAttachmentInput,
  type RuntimeEmailAttachment,
} from '../../shared/api/email'
import { getDocuments } from '../../shared/api/documents'
import { AttachmentPreviewDialog } from './email/attachment-preview-dialog'
import { AttachmentPickerDialog, type AttachmentSelection } from './email/attachment-picker-dialog'
import { EmailWorkspace } from './email/email-workspace'
import type { EmailAttachment, EmailDraft, EmailInboxThread, EmailMessage } from './email/types'
import { useSimulationRun } from './simulation-run-context-core'

const toEmailMessage = (message: ApiEmailMessage): EmailMessage => ({
  messageId: message.participantEmailId,
  from: message.from,
  to: message.to,
  cc: message.cc,
  actor: message.senderId,
  senderType: message.senderType,
  channel: 'email' as const,
  emailId: null,
  actionType: 'message',
  subject: message.subject,
  content: message.content,
  timestamp: message.createdDate,
  status: message.status,
  isUnread: message.isRead === false,
  attachments: message.attachments ?? [],
  canReply: message.canReply,
})

const toEmailThread = (item: EmailInboxThreadItem): EmailInboxThread => ({
  participantEmailId: item.participantEmailId,
  from: item.from,
  fromName: item.fromName,
  subject: item.subject,
  latestSubject: item.latestSubject,
  lastMessageContent: item.lastMessageContent,
  lastMessageDate: item.lastMessageDate,
  unreadCount: item.unreadCount,
  draftId: item.draftId,
})

const toEmailDraft = (item: EmailDraftItem): EmailDraft => ({
  participantEmailId: item.participantEmailId,
  draftId: item.draftId,
  from: item.from,
  fromName: item.fromName,
  subject: item.subject,
  lastMessageContent: item.lastMessageContent,
  lastMessageDate: item.lastMessageDate,
  totalAttachment: item.totalAttachment,
})

export function EmailChannelPage() {
  const queryClient = useQueryClient()
  const { participantId, runnerParticipantId, isEmailPending, sendEmail, markEmailThreadRead } =
    useSimulationRun()

  // Fetch all threads across all simulations (no simulationId filter).
  const inboxQuery = useQuery({
    queryKey: ['email-inbox', participantId],
    queryFn: () => getEmailInbox(participantId),
    enabled: Boolean(participantId.trim()),
  })
  const threads = (inboxQuery.data ?? []).map(toEmailThread)

  const draftsQuery = useQuery({
    queryKey: ['email-drafts', participantId],
    queryFn: () => getEmailDrafts(participantId),
    enabled: Boolean(participantId.trim()),
  })
  const drafts = (draftsQuery.data ?? []).map(toEmailDraft)

  const [selectedRootId, setSelectedRootId] = useState<string | null>(null)
  const [folder, setFolder] = useState<'inbox' | 'draft'>('inbox')
  const [readPendingThreads, setReadPendingThreads] = useState<ReadonlySet<string>>(new Set())
  const [openingAttachmentIds, setOpeningAttachmentIds] = useState<ReadonlySet<string>>(new Set())
  const [previewAttachment, setPreviewAttachment] = useState<EmailAttachment | null>(null)
  const [selectedAttachments, setSelectedAttachments] = useState<AttachmentSelection[]>([])
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [composerResetKey, setComposerResetKey] = useState(0)

  const documentsQuery = useQuery({
    queryKey: ['runner-documents', participantId],
    queryFn: () => getDocuments(participantId),
    enabled: Boolean(participantId.trim()),
  })

  const handleOpenPicker = () => {
    void queryClient.invalidateQueries({ queryKey: ['runner-documents', participantId] })
    void queryClient.invalidateQueries({ queryKey: ['documents', participantId] })
    setIsPickerOpen(true)
  }

  const selectedDraft = drafts.find((draft) => draft.participantEmailId === selectedRootId) ?? null
  const selectedThread =
    threads.find((t) => t.participantEmailId === selectedRootId) ??
    (selectedDraft
      ? {
          participantEmailId: selectedDraft.participantEmailId,
          from: selectedDraft.from,
          fromName: selectedDraft.fromName,
          subject: selectedDraft.subject,
          latestSubject: selectedDraft.subject,
          lastMessageContent: selectedDraft.lastMessageContent,
          lastMessageDate: selectedDraft.lastMessageDate,
          unreadCount: 0,
          draftId: selectedDraft.draftId,
        }
      : null)

  const threadMessagesQuery = useQuery({
    queryKey: ['email-thread-messages', participantId, selectedRootId],
    queryFn: () => getEmailThreadMessages(participantId, selectedRootId!),
    enabled: Boolean(
      participantId.trim() && selectedRootId && !readPendingThreads.has(selectedRootId),
    ),
  })

  const allMessages = useMemo(
    () => (threadMessagesQuery.data ?? []).map(toEmailMessage),
    [threadMessagesQuery.data],
  )
  const draftMessage = useMemo(
    () => allMessages.find((message) => message.status === 'draft') ?? null,
    [allMessages],
  )
  const visibleMessages = useMemo(
    () => allMessages.filter((message) => message.status !== 'draft'),
    [allMessages],
  )

  useEffect(() => {
    if (!draftMessage) {
      setSelectedAttachments([])
      return
    }
    if (!documentsQuery.data) {
      setSelectedAttachments([])
      return
    }
    const restored: AttachmentSelection[] = []
    for (const attachment of draftMessage.attachments) {
      if (!attachment.participantDocId) continue
      const document = documentsQuery.data.find(
        (item) => item.participantDocId === attachment.participantDocId,
      )
      if (!document) continue
      const contents = attachment.contents.flatMap((attachmentContent) => {
        if (attachmentContent.page == null) return []
        const documentContent = document.contents.find(
          (item) => item.page === attachmentContent.page,
        )
        if (!documentContent) return []
        return [
          {
            participantDocContentId: documentContent.participantDocContentId,
            page: documentContent.page,
          },
        ]
      })
      if (contents.length === 0) continue
      restored.push({
        participantDocId: document.participantDocId,
        documentName: document.documentName ?? attachment.fileName ?? 'Untitled document',
        contents,
      })
    }
    setSelectedAttachments(restored)
  }, [draftMessage, documentsQuery.data])

  const composerDraft = draftMessage
    ? {
        draftId: draftMessage.messageId ?? '',
        subject: draftMessage.subject,
        content: draftMessage.content,
        updatedAt: draftMessage.timestamp,
      }
    : null

  const attachmentOpenMutation = useMutation({
    mutationFn: ({
      attachmentId,
      participantEmailId,
    }: {
      attachmentId: string
      participantEmailId: string
    }) => markEmailAttachmentOpened(attachmentId, participantId, participantEmailId),
    onSuccess: (
      openedAttachment: RuntimeEmailAttachment,
      { participantEmailId }: { attachmentId: string; participantEmailId: string },
    ) => {
      queryClient.setQueryData<ApiEmailMessage[]>(
        ['email-thread-messages', participantId, selectedRootId],
        (messages) =>
          messages?.map((message) =>
            message.participantEmailId === participantEmailId
              ? {
                  ...message,
                  attachments: message.attachments.map((attachment) =>
                    attachment.emailAttachmentId === openedAttachment.emailAttachmentId
                      ? openedAttachment
                      : attachment,
                  ),
                }
              : message,
          ),
      )
      setPreviewAttachment(openedAttachment)
    },
    onMutate: ({ attachmentId }) => {
      setOpeningAttachmentIds((current) => new Set(current).add(attachmentId))
    },
    onSettled: (_data, _error, { attachmentId }) => {
      setOpeningAttachmentIds((current) => {
        const next = new Set(current)
        next.delete(attachmentId)
        return next
      })
    },
  })

  const disabled = isEmailPending

  function submit(form: HTMLFormElement, status: 'sent' | 'draft') {
    const data = new FormData(form)
    const target = String(data.get('target') ?? '').trim()
    const subject = String(data.get('subject') ?? '')
    const content = String(data.get('content') ?? '')
    if (!target) return
    if (status === 'sent' && (!subject.trim() || !content.trim())) {
      toast.error('Subject and message are required to send.')
      return
    }
    if (status === 'draft' && !subject.trim() && !content.trim()) {
      toast.error('Add a subject or message before saving a draft.')
      return
    }
    const attachments: ParticipantEmailAttachmentInput[] = selectedAttachments.map((selection) => ({
      participantDocId: selection.participantDocId,
      contents: selection.contents.map((page) => ({
        participantDocContentId: page.participantDocContentId,
      })),
    }))
    void sendEmail({
      target,
      subject,
      content,
      parentEmailId: selectedRootId ?? undefined,
      replyToEmailId: visibleMessages.at(-1)?.messageId,
      attachments,
      status,
    })
      .then(() => {
        if (status !== 'sent') return
        setFolder('inbox')
        setSelectedAttachments([])
        setComposerResetKey((current) => current + 1)
      })
      .catch(() => undefined)
  }

  function changeFolder(nextFolder: 'inbox' | 'draft') {
    if (nextFolder === folder) return
    setFolder(nextFolder)
    setSelectedRootId(null)
  }

  function openAttachment(message: EmailMessage, attachment: EmailAttachment) {
    if (!message.messageId || openingAttachmentIds.has(attachment.emailAttachmentId)) return
    if (attachment.modifiedDate) {
      setPreviewAttachment(attachment)
      return
    }
    attachmentOpenMutation.mutate({
      attachmentId: attachment.emailAttachmentId,
      participantEmailId: message.messageId,
    })
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <EmailWorkspace
        participantId={runnerParticipantId}
        messages={visibleMessages}
        threads={threads}
        drafts={drafts}
        folder={folder}
        onFolderChange={changeFolder}
        composerDraft={composerDraft}
        composerResetKey={composerResetKey}
        selectedRootId={selectedRootId}
        onSelectThread={setSelectedRootId}
        selectedThread={selectedThread}
        disabled={disabled}
        attachments={selectedAttachments}
        onOpenAttachmentPicker={handleOpenPicker}
        onRemoveAttachment={(participantDocId) =>
          setSelectedAttachments((current) =>
            current.filter((selection) => selection.participantDocId !== participantDocId),
          )
        }
        onSubmit={submit}
        openingAttachmentIds={openingAttachmentIds}
        onOpenAttachment={openAttachment}
        onConversationOpen={(rootId) => {
          const thread = threads.find((t) => t.participantEmailId === rootId)
          if (thread && thread.unreadCount > 0) {
            setReadPendingThreads((prev) => new Set(prev).add(rootId))
            void markEmailThreadRead(rootId).finally(() =>
              setReadPendingThreads((prev) => {
                const next = new Set(prev)
                next.delete(rootId)
                return next
              }),
            )
          }
        }}
      />
      {previewAttachment ? (
        <AttachmentPreviewDialog
          attachment={previewAttachment}
          open
          onOpenChange={(open) => {
            if (!open) setPreviewAttachment(null)
          }}
        />
      ) : null}
      <AttachmentPickerDialog
        open={isPickerOpen}
        onOpenChange={setIsPickerOpen}
        documents={documentsQuery.data ?? []}
        isLoading={documentsQuery.isLoading}
        initialSelection={selectedAttachments}
        onConfirm={setSelectedAttachments}
      />
      {attachmentOpenMutation.isError ? (
        <p className="text-xs text-red-600" role="alert">
          Unable to record the attachment opening. Please try again.
        </p>
      ) : null}
    </div>
  )
}
