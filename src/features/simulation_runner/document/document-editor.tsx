import { useState, useRef } from 'react'
import type { Editor } from '@tiptap/react'
import { ArrowLeft, Check, FileText, Save } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { isDocumentDraftDirty, type DocumentEditorDraft } from './document-editor-logic'
import {
  canSaveDocumentEditor,
  editorSaveStatus,
  updateEditorName,
} from './document-editor-ui-logic'
import { DocumentEditorToolbar } from './document-editor-toolbar'
import { DocumentTiptapPage } from './document-tiptap-page'
import { documentPageStarts, serializePaginatedDocument } from './document-pagination'
import './document-editor.css'

export function DocumentEditor({
  draft,
  savedDraft,
  mode,
  disabled = false,
  isSaving = false,
  error = null,
  onChange,
  onSave,
  onCancel,
}: {
  draft: DocumentEditorDraft
  savedDraft: DocumentEditorDraft
  mode: 'create' | 'edit'
  disabled?: boolean
  isSaving?: boolean
  error?: string | null
  onChange: (draft: DocumentEditorDraft) => void
  onSave: (draft?: DocumentEditorDraft) => void
  onCancel: () => void
}) {
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null)
  const [activePage, setActivePage] = useState(1)
  const [pageCount, setPageCount] = useState(1)
  const initialHtml = useRef('')
  const [isPreparingSave, setIsPreparingSave] = useState(false)
  const [zoom, setZoom] = useState('fit')
  const isDirty = isDocumentDraftDirty(draft, savedDraft)
  const locked = disabled || isSaving || isPreparingSave
  const saveDisabled = locked || !isDirty || !canSaveDocumentEditor(draft, isSaving)
  async function save() {
    setIsPreparingSave(true)
    // PaginationPlus applies layout in RAF; freeze edits and let it finish before
    // deriving the persisted page fragments, including rapid Ctrl/Cmd+S presses.
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    )
    onSave(
      activeEditor && activeEditor.getHTML() !== initialHtml.current
        ? { ...draft, contents: serializePaginatedDocument(activeEditor) }
        : draft,
    )
    setIsPreparingSave(false)
  }
  function goToPage(page: number) {
    if (!activeEditor) return
    const pos = documentPageStarts(activeEditor)[page - 1] ?? 0
    activeEditor.chain().focus().setTextSelection(Math.max(1, pos)).scrollIntoView().run()
    setActivePage(page)
  }
  return (
    <div
      className="document-editor flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--color-canvas)]"
      onKeyDown={(event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
          event.preventDefault()
          if (!saveDisabled) save()
        }
      }}
    >
      <header className="border-border bg-card flex shrink-0 flex-wrap items-center gap-3 border-b px-3 py-3 sm:px-5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Cancel editing"
          title="Back to documents"
          disabled={locked}
          onClick={onCancel}
          className="size-10"
        >
          <ArrowLeft />
        </Button>
        <FileText className="text-brand hidden size-7 shrink-0 sm:block" aria-hidden="true" />
        <div className="min-w-0 flex-1 basis-36">
          <label htmlFor="runner-document-name" className="sr-only">
            Document name
          </label>
          <input
            id="runner-document-name"
            value={draft.documentName}
            onChange={(event) => onChange(updateEditorName(draft, event.target.value))}
            disabled={locked}
            maxLength={255}
            placeholder="Untitled document"
            className="text-foreground placeholder:text-muted-foreground hover:border-border focus-visible:border-ring focus-visible:ring-ring h-8 w-full rounded border border-transparent bg-transparent px-1 text-base font-medium focus-visible:ring-2 focus-visible:outline-none"
          />
          <div
            className="text-muted-foreground mt-1 flex items-center gap-1.5 px-1 text-xs"
            role="status"
            aria-live="polite"
          >
            {!isDirty && mode === 'edit' ? <Check size={12} aria-hidden="true" /> : null}
            <span>
              {mode === 'create' && !isDirty
                ? 'New document'
                : editorSaveStatus({ isSaving, isDirty, error: null })}
            </span>
          </div>
        </div>
        <Button type="button" disabled={saveDisabled} onClick={save} className="h-10 gap-2 px-4">
          <Save size={15} />
          {isSaving ? 'Saving…' : mode === 'create' ? 'Create document' : 'Save changes'}
        </Button>
      </header>
      <DocumentEditorToolbar editor={activeEditor} disabled={locked} />
      {error ? (
        <p
          role="alert"
          className="border-destructive/20 bg-destructive/10 text-destructive shrink-0 border-b px-5 py-2 text-sm"
        >
          {error}
        </p>
      ) : null}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <nav
          aria-label="Document pages"
          className="border-border bg-card/50 hidden w-40 shrink-0 overflow-y-auto border-r px-3 py-5 xl:block"
        >
          <p className="text-muted-foreground mb-3 px-2 text-xs font-medium">Pages</p>
          {Array.from({ length: pageCount }, (_, index) => ({ page: index + 1 })).map((page) => (
            <button
              key={page.page}
              type="button"
              disabled={locked}
              aria-current={activePage === page.page ? 'page' : undefined}
              onClick={() => goToPage(page.page)}
              className={`focus-visible:ring-ring mb-1 flex min-h-10 w-full items-center gap-2 rounded px-2 text-left text-xs focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50 ${activePage === page.page ? 'bg-accent text-accent-foreground font-medium' : 'text-muted-foreground hover:bg-muted'}`}
            >
              <FileText size={14} />
              Page {page.page}
            </button>
          ))}
        </nav>
        <div className="document-editor-scroll min-h-0 min-w-0 flex-1 overflow-auto px-3 py-6 sm:px-6">
          <div
            className="document-editor-pages document-paper mx-auto w-[794px]"
            style={{ zoom: zoom === 'fit' ? undefined : Number(zoom) }}
          >
            <DocumentTiptapPage
              contents={draft.contents}
              disabled={locked}
              onActivate={(editor) => {
                initialHtml.current = editor.getHTML()
                setActiveEditor(editor)
              }}
              onLayout={(count, active) => {
                setPageCount(count)
                setActivePage(active)
              }}
              onChange={(contents) => onChange({ ...draft, contents })}
            />
          </div>
        </div>
      </div>
      <footer className="border-border bg-card text-muted-foreground flex shrink-0 items-center justify-between border-t px-5 py-2 text-xs">
        <span>
          Page {activePage} of {pageCount}
        </span>
        <span className="hidden sm:inline">
          Save to keep changes<span className="hidden sm:inline"> · Ctrl / ⌘ + S</span>
        </span>
        <label className="flex items-center gap-2">
          <span>Zoom</span>
          <select
            aria-label="Document zoom"
            value={zoom}
            onChange={(event) => setZoom(event.target.value)}
            className="bg-card focus-visible:ring-ring min-h-8 rounded px-1 focus-visible:ring-2 focus-visible:outline-none"
          >
            <option value="fit">Fit</option>
            <option value="0.75">75%</option>
            <option value="1">100%</option>
            <option value="1.25">125%</option>
          </select>
        </label>
      </footer>
    </div>
  )
}
