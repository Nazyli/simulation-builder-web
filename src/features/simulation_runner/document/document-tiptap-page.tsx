import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import { useEffect, useRef } from 'react'
import type { DocumentEditorPageDraft } from './document-editor-logic'
import { documentEditorExtensions } from './document-tiptap-extensions'
import {
  documentPageStarts,
  joinDocumentPages,
  serializePaginatedDocument,
} from './document-pagination'

export function DocumentTiptapPage({
  contents,
  disabled,
  onChange,
  onActivate,
  onLayout,
}: {
  contents: DocumentEditorPageDraft[]
  disabled: boolean
  onChange: (contents: DocumentEditorPageDraft[]) => void
  onActivate: (editor: Editor | null) => void
  onLayout: (pages: number, active: number) => void
}) {
  const callbacks = useRef({ onChange, onActivate, onLayout })
  callbacks.current = { onChange, onActivate, onLayout }
  const initial = useRef(contents)
  const initialHtml = useRef('')
  const changed = useRef(false)
  const frame = useRef(0)
  const editor = useEditor({
    // Creating editors during render also creates discarded instances in StrictMode.
    immediatelyRender: false,
    extensions: documentEditorExtensions(),
    content: joinDocumentPages(initial.current),
    editable: !disabled,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        class: 'document-tiptap-content',
        role: 'textbox',
        'aria-label': 'Document content',
        'aria-multiline': 'true',
      },
    },
    onUpdate: ({ editor }) => {
      changed.current = true
      // Publish immediately so Save and the leave guard see the very first edit.
      callbacks.current.onChange(
        editor.getHTML() === initialHtml.current
          ? initial.current
          : serializePaginatedDocument(editor),
      )
    },
  })
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    initialHtml.current = editor.getHTML()
    callbacks.current.onActivate(editor)
    return () => callbacks.current.onActivate(null)
  }, [editor])
  useEffect(() => {
    editor?.setEditable(!disabled, false)
  }, [editor, disabled])
  useEffect(() => {
    if (!editor) return
    function refresh() {
      if (!editor || editor.isDestroyed) return
      const starts = documentPageStarts(editor)
      const active = starts.filter((pos) => pos <= editor.state.selection.from).length
      callbacks.current.onLayout(starts.length, active)
      if (changed.current) {
        changed.current = false
        callbacks.current.onChange(
          editor.getHTML() === initialHtml.current
            ? initial.current
            : serializePaginatedDocument(editor),
        )
      }
    }
    function schedule() {
      cancelAnimationFrame(frame.current)
      frame.current = requestAnimationFrame(() => {
        frame.current = requestAnimationFrame(refresh)
      })
    }
    const observer = new MutationObserver(schedule)
    observer.observe(editor.view.dom, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    })
    editor.on('transaction', schedule)
    schedule()
    return () => {
      cancelAnimationFrame(frame.current)
      observer.disconnect()
      editor.off('transaction', schedule)
    }
  }, [editor])
  return <EditorContent editor={editor} />
}
