import { Extension } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { TableKitPlus } from 'tiptap-table-plus'
import { PaginationPlus, PAGE_SIZES } from 'tiptap-pagination-plus'
import { TextStyle, FontFamily, FontSize } from '@tiptap/extension-text-style'
import TextAlign from '@tiptap/extension-text-align'

// Data attributes survive the shared sanitizer, which removes inline styles.
const DocumentTypography = Extension.create({
  name: 'documentTypography',
  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontFamily: {
            default: null,
            parseHTML: (element) =>
              element.getAttribute('data-font-family') ||
              element.style.fontFamily.replace(/["']/g, ''),
            renderHTML: (attributes) =>
              attributes.fontFamily ? { 'data-font-family': attributes.fontFamily } : {},
          },
          fontSize: {
            default: null,
            parseHTML: (element) =>
              element.getAttribute('data-font-size') || element.style.fontSize,
            renderHTML: (attributes) =>
              attributes.fontSize ? { 'data-font-size': attributes.fontSize } : {},
          },
        },
      },
    ]
  },
})
const DocumentAlignment = TextAlign.extend({
  addGlobalAttributes() {
    return [
      {
        types: ['heading', 'paragraph'],
        attributes: {
          textAlign: {
            default: null,
            parseHTML: (element) =>
              element.getAttribute('data-text-align') || element.style.textAlign || null,
            renderHTML: (attributes) =>
              attributes.textAlign ? { 'data-text-align': attributes.textAlign } : {},
          },
        },
      },
    ]
  },
}).configure({ types: ['heading', 'paragraph'] })

const DocumentTextStyle = TextStyle.extend({
  parseHTML() {
    return [
      {
        tag: 'span',
        getAttrs: (element) =>
          element.hasAttribute('data-font-family') ||
          element.hasAttribute('data-font-size') ||
          element.hasAttribute('style')
            ? {}
            : false,
      },
    ]
  },
})

export function documentEditorExtensions() {
  return [
    StarterKit.configure({
      strike: false,
      link: { openOnClick: false, protocols: ['http', 'https', 'mailto'] },
    }),
    DocumentTextStyle,
    FontFamily.extend({ addGlobalAttributes: () => [] }),
    FontSize.extend({ addGlobalAttributes: () => [] }),
    DocumentTypography,
    DocumentAlignment,
    TableKitPlus.configure({ table: { resizable: false } }),
    PaginationPlus.configure({
      ...PAGE_SIZES.A4,
      pageWidth: 794,
      pageHeight: 1123,
      marginTop: 48,
      marginBottom: 48,
      marginLeft: 72,
      marginRight: 72,
      contentMarginTop: 16,
      contentMarginBottom: 16,
      pageGap: 24,
      pageBreakBackground: 'var(--color-canvas)',
      pageGapBorderColor: '#e2e8f0',
      footerRight: '{page}',
    }),
    Placeholder.configure({ placeholder: 'Start writing…' }),
  ]
}
