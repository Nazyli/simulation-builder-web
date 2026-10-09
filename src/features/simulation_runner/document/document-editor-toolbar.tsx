import { useEditorState, type Editor } from '@tiptap/react'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Redo2,
  Table2,
  Underline,
  Undo2,
  RemoveFormatting,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Button } from '../../../components/ui/button'

const selectClass =
  'h-9 max-sm:h-11 rounded border border-transparent bg-transparent px-2 text-xs text-foreground hover:bg-muted focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40'

export function DocumentEditorToolbar({
  editor,
  disabled,
}: {
  editor: Editor | null
  disabled: boolean
}) {
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkError, setLinkError] = useState<string | null>(null)
  const state = useEditorState({
    editor,
    selector: ({ editor }) =>
      editor
        ? {
            bold: editor.isActive('bold'),
            italic: editor.isActive('italic'),
            underline: editor.isActive('underline'),
            bullet: editor.isActive('bulletList'),
            ordered: editor.isActive('orderedList'),
            link: editor.isActive('link'),
            align:
              editor.getAttributes('paragraph').textAlign ||
              editor.getAttributes('heading').textAlign ||
              'left',
            heading:
              [1, 2, 3].find((level) => editor.isActive('heading', { level }))?.toString() ||
              'paragraph',
            font: editor.getAttributes('textStyle').fontFamily || 'Arial',
            size: editor.getAttributes('textStyle').fontSize || '14px',
            undo: editor.can().undo(),
            redo: editor.can().redo(),
            table: editor.isActive('table'),
          }
        : null,
  })
  const locked = disabled || !editor
  function applyLink() {
    if (!editor || locked) return
    const value = linkUrl.trim()
    if (value && !/^(https?:\/\/|mailto:)/i.test(value)) {
      setLinkError('Use a URL starting with https://, http://, or mailto:.')
      return
    }
    if (value) editor.chain().focus().extendMarkRange('link').setLink({ href: value }).run()
    else editor.chain().focus().extendMarkRange('link').unsetLink().run()
    setLinkOpen(false)
    setLinkError(null)
  }
  return (
    <div className="border-border bg-card shrink-0 border-b px-3 py-2 sm:px-5">
      <div
        role="toolbar"
        aria-label="Document formatting"
        className="bg-muted/60 flex min-w-0 items-center gap-0.5 overflow-x-auto rounded-md px-1 py-0.5"
      >
        <Tool
          label="Undo"
          disabled={locked || !state?.undo}
          onClick={() => editor?.chain().focus().undo().run()}
        >
          <Undo2 />
        </Tool>
        <Tool
          label="Redo"
          disabled={locked || !state?.redo}
          onClick={() => editor?.chain().focus().redo().run()}
        >
          <Redo2 />
        </Tool>
        <Divider />
        <select
          aria-label="Paragraph style"
          className={`${selectClass} w-32 shrink-0`}
          disabled={locked}
          value={state?.heading ?? 'paragraph'}
          onChange={(event) => {
            const value = event.target.value
            if (value === 'paragraph') editor?.chain().focus().setParagraph().run()
            else
              editor
                ?.chain()
                .focus()
                .setHeading({ level: Number(value) as 1 | 2 | 3 })
                .run()
          }}
        >
          <option value="paragraph">Normal text</option>
          <option value="1">Heading 1</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
        </select>
        <Divider />
        <select
          aria-label="Font family"
          className={`${selectClass} w-28 shrink-0`}
          value={state?.font ?? 'Arial'}
          disabled={locked}
          onChange={(event) => editor?.chain().focus().setFontFamily(event.target.value).run()}
        >
          <option>Arial</option>
          <option>Georgia</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Courier New">Courier New</option>
        </select>
        <select
          aria-label="Font size"
          className={`${selectClass} w-16 shrink-0`}
          value={state?.size ?? '14px'}
          disabled={locked}
          onChange={(event) => editor?.chain().focus().setFontSize(event.target.value).run()}
        >
          {[10, 12, 14, 16, 18, 24, 32].map((size) => (
            <option key={size} value={`${size}px`}>
              {size}
            </option>
          ))}
        </select>
        <Divider />
        <Tool
          label="Bold"
          active={state?.bold}
          disabled={locked}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold />
        </Tool>
        <Tool
          label="Italic"
          active={state?.italic}
          disabled={locked}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic />
        </Tool>
        <Tool
          label="Underline"
          active={state?.underline}
          disabled={locked}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          <Underline />
        </Tool>
        <Divider />
        {[
          { value: 'left', icon: <AlignLeft /> },
          { value: 'center', icon: <AlignCenter /> },
          { value: 'right', icon: <AlignRight /> },
          { value: 'justify', icon: <AlignJustify /> },
        ].map(({ value, icon }) => (
          <Tool
            key={value}
            label={`Align ${value}`}
            active={state?.align === value}
            disabled={locked}
            onClick={() => editor?.chain().focus().setTextAlign(value).run()}
          >
            {icon}
          </Tool>
        ))}
        <Divider />
        <Tool
          label="Bulleted list"
          active={state?.bullet}
          disabled={locked}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List />
        </Tool>
        <Tool
          label="Numbered list"
          active={state?.ordered}
          disabled={locked}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered />
        </Tool>
        <Divider />
        <Tool
          label="Insert link"
          active={state?.link}
          disabled={locked}
          onClick={() => {
            setLinkUrl(editor?.getAttributes('link').href ?? '')
            setLinkError(null)
            setLinkOpen(!linkOpen)
          }}
        >
          <Link2 />
        </Tool>
        <Tool
          label="Insert table"
          disabled={locked || state?.table}
          onClick={() =>
            editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
        >
          <Table2 />
        </Tool>
        <Tool
          label="Clear formatting"
          disabled={locked}
          onClick={() =>
            editor?.chain().focus().unsetAllMarks().clearNodes().unsetTextAlign().run()
          }
        >
          <RemoveFormatting />
        </Tool>
      </div>
      {linkOpen ? (
        <form
          className="mt-2 flex flex-wrap items-end gap-2 text-xs"
          onSubmit={(event) => {
            event.preventDefault()
            applyLink()
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setLinkOpen(false)
              editor?.commands.focus()
            }
          }}
        >
          <label className="min-w-0 flex-1">
            <span className="text-muted-foreground mb-1 block">Link URL</span>
            <input
              autoFocus
              aria-label="Link URL"
              disabled={locked}
              value={linkUrl}
              onChange={(event) => {
                setLinkUrl(event.target.value)
                setLinkError(null)
              }}
              placeholder="https://example.com"
              className="border-border bg-background focus-visible:ring-ring h-9 w-full rounded border px-3 focus-visible:ring-2 focus-visible:outline-none"
            />
          </label>
          <Button type="submit" disabled={locked} className="h-9">
            Apply link
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-9"
            onClick={() => {
              setLinkOpen(false)
              editor?.commands.focus()
            }}
          >
            Close
          </Button>
          {linkError ? (
            <p role="alert" className="text-destructive w-full">
              {linkError}
            </p>
          ) : null}
        </form>
      ) : null}
      {state?.table ? (
        <div className="mt-2 flex flex-wrap gap-1">
          <Button
            variant="ghost"
            disabled={locked}
            onClick={() => editor?.chain().focus().addRowAfter().run()}
          >
            Add row
          </Button>
          <Button
            variant="ghost"
            disabled={locked}
            onClick={() => editor?.chain().focus().addColumnAfter().run()}
          >
            Add column
          </Button>
          <Button
            variant="ghost"
            disabled={locked}
            onClick={() => editor?.chain().focus().deleteRow().run()}
          >
            Delete row
          </Button>
          <Button
            variant="ghost"
            disabled={locked}
            onClick={() => editor?.chain().focus().deleteColumn().run()}
          >
            Delete column
          </Button>
          <Button
            variant="destructive"
            disabled={locked}
            onClick={() => editor?.chain().focus().deleteTable().run()}
          >
            Delete table
          </Button>
        </div>
      ) : null}
    </div>
  )
}
function Tool({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`size-9 shrink-0 max-sm:size-11 ${active ? 'bg-accent text-accent-foreground' : 'text-foreground'}`}
    >
      {children}
    </Button>
  )
}
function Divider() {
  return <span className="bg-border mx-1 h-5 w-px shrink-0" aria-hidden="true" />
}
