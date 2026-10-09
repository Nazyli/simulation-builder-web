import type { Editor } from '@tiptap/react'
import { DOMSerializer } from '@tiptap/pm/model'
import {
  normalizeEditorHtml,
  toTiptapDocumentContent,
  type DocumentEditorPageDraft,
} from './document-editor-logic'

// A saved page can end inside a paragraph or list. Continuation markers let us
// reopen it as the same block, preserving natural reflow across page boundaries.
export function joinDocumentPages(pages: DocumentEditorPageDraft[]): string {
  const result = document.createElement('div')
  function append(target: Element, incoming: Element) {
    const previous = target.lastElementChild
    if (incoming.hasAttribute('data-page-continuation') && previous?.tagName === incoming.tagName) {
      for (const child of Array.from(incoming.childNodes)) {
        if (child instanceof Element) append(previous, child)
        else previous.append(child)
      }
    } else {
      incoming.removeAttribute('data-page-continuation')
      target.append(incoming)
    }
  }
  for (const page of pages) {
    const source = document.createElement('div')
    source.innerHTML = toTiptapDocumentContent(page.content)
    for (const child of Array.from(source.childNodes)) {
      if (child instanceof Element) append(result, child)
      else result.append(child)
    }
  }
  result.querySelectorAll('[data-page-continuation], [data-list-continuation]').forEach((node) => {
    node.removeAttribute('data-page-continuation')
    node.removeAttribute('data-list-continuation')
  })
  return result.innerHTML
}

export function documentPageStarts(editor: Editor): number[] {
  const gaps = Array.from(
    editor.view.dom.querySelectorAll<HTMLElement>('.rm-pagination-gap'),
  ).slice(0, -1)
  const starts = [0]
  for (const gap of gaps) {
    const nextTop = gap.getBoundingClientRect().bottom
    let found = editor.state.doc.content.size
    editor.state.doc.descendants((node, pos) => {
      if (found < editor.state.doc.content.size) return false
      if (node.type.name === 'tableRow') {
        const row = editor.view.nodeDOM(pos)
        if (row instanceof HTMLElement && row.getBoundingClientRect().top >= nextTop) {
          found = pos
          return false
        }
      }
      if (!node.isTextblock) return true
      const from = pos + 1
      const end = from + node.content.size
      if (editor.view.coordsAtPos(end).top < nextTop) return false
      let low = from
      let high = end
      while (low < high) {
        const middle = Math.floor((low + high) / 2)
        if (editor.view.coordsAtPos(middle).top < nextTop) low = middle + 1
        else high = middle
      }
      // Keep whole blocks when the break falls before their first character.
      found = low === from ? pos : low
      if (low === from) {
        const boundary = editor.state.doc.resolve(pos)
        // A paragraph at the start of a list item belongs to that whole item;
        // cutting inside its opening wrapper would leave an empty numbered item.
        for (let depth = boundary.depth; depth > 0 && boundary.start(depth) === found; depth--) {
          found = boundary.before(depth)
        }
      }
      return false
    })
    if (found > starts.at(-1)! && found < editor.state.doc.content.size) starts.push(found)
  }
  return starts
}

export function serializePaginatedDocument(editor: Editor): DocumentEditorPageDraft[] {
  const starts = documentPageStarts(editor)
  const serializer = DOMSerializer.fromSchema(editor.schema)
  return starts.map((from, index) => {
    const to = starts[index + 1] ?? editor.state.doc.content.size
    const slice = editor.state.doc.slice(from, to, true)
    const container = document.createElement('div')
    container.append(serializer.serializeFragment(slice.content))
    let element = container.firstElementChild
    for (let depth = 0; element && depth < slice.openStart; depth++) {
      element.setAttribute('data-page-continuation', 'true')
      element = element.firstElementChild
      if (element?.tagName === 'TBODY') {
        element.setAttribute('data-page-continuation', 'true')
        element = element.firstElementChild
      }
    }
    const resolved = editor.state.doc.resolve(from)
    const ordered = Array.from(container.querySelectorAll('ol[data-page-continuation]'))
    for (let depth = 1; depth <= resolved.depth; depth++) {
      const node = resolved.node(depth)
      if (node.type.name !== 'orderedList') continue
      const list = ordered.shift()
      if (!list) continue
      list.setAttribute('start', String((node.attrs.start ?? 1) + resolved.index(depth)))
      if (depth < resolved.depth && resolved.pos > resolved.start(depth + 1)) {
        list.firstElementChild?.setAttribute('data-list-continuation', 'true')
      }
    }
    return { page: index + 1, content: normalizeEditorHtml(container.innerHTML) }
  })
}
