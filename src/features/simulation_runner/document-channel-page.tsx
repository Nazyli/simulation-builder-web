import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText } from 'lucide-react'
import { toast } from 'sonner'
import { useEffect, useMemo, useState } from 'react'
import {
  createDocument,
  findRuntimeDocument,
  getDocuments,
  insertRuntimeDocument,
  openDocument,
  replaceRuntimeDocument,
  updateDocument,
  type DocumentWriteInput,
  type RuntimeDocumentStructure,
} from '../../shared/api/documents'
import {
  isDocumentDraftDirty,
  serializeDocumentDraft,
  type DocumentEditorDraft,
} from './document/document-editor-logic'
import {
  beginCreateDocument,
  beginEditDocument,
  createInitialDocumentEditorState,
  finishDocumentSave,
  recordDocumentSaveFailure,
} from './document/document-channel-editor-logic'
import { DocumentEditor } from './document/document-editor'
import { DocumentPreviewDialog } from './document/document-preview-dialog'
import { DocumentWorkspace } from './document/document-workspace'
import { mapRuntimeDocument, type SimulationDocument } from './document/types'
import { useSimulationRun } from './simulation-run-context-core'

export function DocumentChannelPage() {
  const { participantId } = useSimulationRun()
  const queryClient = useQueryClient()
  const [editorState, setEditorState] = useState(createInitialDocumentEditorState)
  const [previewDoc, setPreviewDoc] = useState<SimulationDocument | null>(null)

  const documentsQuery = useQuery({
    queryKey: ['documents', participantId],
    queryFn: () => getDocuments(participantId),
    enabled: Boolean(participantId.trim()),
  })

  const openMutation = useMutation({
    mutationFn: ({
      participantId: participant,
      documentId,
    }: {
      participantId: string
      documentId: string
    }) => openDocument(participant, documentId),
    onSuccess: (updated, variables) => {
      const structure = queryClient.getQueryData<RuntimeDocumentStructure>([
        'documents',
        variables.participantId,
      ])
      const folderName =
        structure?.filesInFolders.find((folder) =>
          folder.files.some((file) => file.participantDocId === updated.participantDocId),
        )?.folderName ?? null
      queryClient.setQueryData<RuntimeDocumentStructure>(
        ['documents', variables.participantId],
        (current) =>
          current
            ? replaceRuntimeDocument(current, updated)
            : { filesInFolders: [], filesInRoot: [updated] },
      )
      // The preview dialog owns the open result. Do not reset editor state here:
      // the user may have started editing another document while open was in flight.
      setPreviewDoc((current) =>
        current && current.id === updated.participantDocId
          ? mapRuntimeDocument(updated, folderName)
          : current,
      )
    },
  })

  const saveMutation = useMutation({
    mutationFn: ({
      mode,
      documentId,
      input,
    }: {
      mode: 'create' | 'edit'
      documentId: string | null
      input: DocumentWriteInput
    }) => {
      if (mode === 'create') return createDocument(participantId, input)
      if (!documentId) throw new Error('The document could not be identified.')
      return updateDocument(participantId, documentId, input)
    },
    onSuccess: (saved, { mode }) => {
      queryClient.setQueryData<RuntimeDocumentStructure>(
        ['documents', participantId],
        (current) => {
          if (!current) return { filesInFolders: [], filesInRoot: [saved] }
          return mode === 'create'
            ? insertRuntimeDocument(current, saved)
            : replaceRuntimeDocument(current, saved)
        },
      )
      setEditorState((current) => finishDocumentSave(current, saved))
      toast.success('Document saved.')
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Unable to save the document.'
      setEditorState((current) => recordDocumentSaveFailure(current, message))
    },
  })

  const documents = useMemo(() => {
    const structure = documentsQuery.data
    if (!structure) return []
    const root = structure.filesInRoot.map((record) => mapRuntimeDocument(record, null))
    const inFolders = structure.filesInFolders.flatMap((folder) =>
      folder.files.map((record) => mapRuntimeDocument(record, folder.folderName)),
    )
    return [...root, ...inFolders]
  }, [documentsQuery.data])
  const selectedId = editorState.selectedId
  const editorDraft = editorState.draft
  const isEditorDirty = Boolean(
    editorDraft &&
    editorState.savedDraft &&
    isDocumentDraftDirty(editorDraft, editorState.savedDraft),
  )

  useEffect(() => {
    if (!isEditorDirty) return
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isEditorDirty])

  function canLeaveEditor() {
    return !isEditorDirty || window.confirm('You have unsaved changes. Leave the editor?')
  }

  function showReadDocument(id: string | null) {
    setEditorState({
      ...createInitialDocumentEditorState(),
      selectedId: id,
    })
  }

  function handleCreateDocument() {
    if (!canLeaveEditor()) return
    if (!participantId.trim()) {
      toast.error('Choose an active participant before creating a document.')
      return
    }
    setEditorState((current) => beginCreateDocument(current))
  }

  function handleEditDocument(doc: SimulationDocument) {
    if (!canLeaveEditor()) return
    const structure = documentsQuery.data
    const record = structure ? findRuntimeDocument(structure, doc.id) : null
    if (!record) {
      toast.error('The selected document is no longer available.')
      return
    }
    try {
      setEditorState((current) => beginEditDocument(current, record))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The document cannot be edited.')
    }
  }

  function handleCancelEditor() {
    if (!canLeaveEditor()) return
    showReadDocument(editorState.mode === 'edit' ? editorState.selectedId : null)
  }

  function handleEditorChange(draft: DocumentEditorDraft) {
    setEditorState((current) => ({ ...current, draft, error: null }))
  }

  function handleSaveEditor(currentDraft?: DocumentEditorDraft) {
    if (!editorDraft || editorState.mode === 'read') return
    if (!participantId.trim()) {
      setEditorState((current) =>
        recordDocumentSaveFailure(current, 'Choose an active participant before saving.'),
      )
      return
    }
    saveMutation.mutate({
      mode: editorState.mode,
      documentId: editorDraft.participantDocId,
      input: serializeDocumentDraft(currentDraft ?? editorDraft),
    })
  }

  function handleOpenPreview(doc: SimulationDocument) {
    if (!canLeaveEditor()) return
    showReadDocument(doc.id)
    // Show the dialog immediately with the folder name from the list payload;
    // the open endpoint only returns file metadata without folder context.
    setPreviewDoc(doc)
    if (openMutation.isPending && openMutation.variables?.documentId === doc.id) return
    openMutation.mutate({ participantId, documentId: doc.id })
  }

  if (documentsQuery.isPending || documentsQuery.isError) {
    const failed = documentsQuery.isError
    return (
      <div className="bg-card flex h-full min-h-[420px] flex-col items-center justify-center gap-3 rounded-lg border border-[var(--color-border)] px-6 text-center">
        <span className="grid size-12 place-items-center rounded-md bg-[var(--color-surface-muted)]">
          <FileText size={20} className="text-muted-foreground" />
        </span>
        <p className="text-sm font-medium text-[var(--color-canvas-heading)]">
          {failed ? 'Failed to load documents' : 'Loading documents…'}
        </p>
        <p className="mt-1 max-w-sm text-xs text-[var(--color-canvas-text-muted)]">
          {failed
            ? 'Documents could not be retrieved for this participant. Check the connection and try again.'
            : 'Fetching shared documents for this simulation session.'}
        </p>
        {failed ? (
          <button
            type="button"
            onClick={() => documentsQuery.refetch()}
            className="bg-card text-primary hover:bg-accent focus-visible:ring-ring/50 rounded-md border border-[var(--color-border)] px-2.5 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none"
          >
            Retry
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <DocumentWorkspace
        documents={documents}
        selectedId={selectedId}
        onOpenPreview={handleOpenPreview}
        onCreateDocument={handleCreateDocument}
        onEditDocument={handleEditDocument}
        editor={
          editorDraft ? (
            <DocumentEditor
              draft={editorDraft}
              savedDraft={editorState.savedDraft ?? editorDraft}
              mode={editorState.mode === 'create' ? 'create' : 'edit'}
              isSaving={saveMutation.isPending}
              error={editorState.error}
              onChange={handleEditorChange}
              onSave={handleSaveEditor}
              onCancel={handleCancelEditor}
            />
          ) : null
        }
      />
      {previewDoc ? (
        <DocumentPreviewDialog
          document={previewDoc}
          open
          onOpenChange={(open) => {
            if (!open) setPreviewDoc(null)
          }}
        />
      ) : null}
    </div>
  )
}
