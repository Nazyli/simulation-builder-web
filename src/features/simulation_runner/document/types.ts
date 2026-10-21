import type { RuntimeFileItem } from '../../../shared/api/documents'
import { isHtmlContent, stripHtmlToText } from '../../../shared/html'

/**
 * Document channel local model.
 * Mirrors the runtime payload from `/admin/runner/documents`; the mapper below
 * converts the API record into this view model 1:1.
 */

export type DocumentType = 'document'

export interface SimulationDocument {
  id: string
  title: string
  type: DocumentType
  folderName: string | null
  ownerName: string
  modifiedAt: string | null
  isHighlight: boolean
  pageCount: number
  summary: string
  content: string
  pages: string[]
}

/** Visual metadata derived from document type. */
interface DocumentTypeMeta {
  label: string
  color: string
  bg: string
}

export const DOCUMENT_TYPE_META: Record<DocumentType, DocumentTypeMeta> = {
  document: { label: 'Document', color: '#9929EA', bg: '#f5e7ff' },
}

const SUMMARY_MAX_LENGTH = 160

/** Convert a runtime document record from `/admin/runner/documents` into the view model. */
export function mapRuntimeDocument(
  record: RuntimeFileItem,
  folderName?: string | null,
): SimulationDocument {
  const pageCount = [...record.contents].filter((page) => page.page !== null).length
  const pageTexts = [...record.contents]
    .filter((page) => page.page !== null)
    .sort((left, right) => (left.page ?? 0) - (right.page ?? 0))
    .map((page) => page.content ?? '')
  const content = pageTexts.join('\n\n')
  const summarySource = isHtmlContent(content) ? stripHtmlToText(content) : content
  return {
    id: record.participantDocId ?? '',
    title: record.fileName ?? 'Untitled document',
    type: 'document',
    folderName: folderName ?? null,
    ownerName: record.ownerName ?? '',
    modifiedAt: record.modifiedDate,
    isHighlight: record.isHighlight ?? false,
    pageCount,
    summary:
      summarySource.length > SUMMARY_MAX_LENGTH
        ? `${summarySource.slice(0, SUMMARY_MAX_LENGTH)}…`
        : summarySource,
    content,
    pages: pageTexts.length > 0 ? pageTexts : [''],
  }
}

const WIB_TIME_ZONE = 'Asia/Jakarta'

function wibDateKey(value: Date): string {
  return value.toLocaleDateString('en-CA', { timeZone: WIB_TIME_ZONE })
}

function wibYear(value: Date): string {
  return value.toLocaleDateString('en-CA', { timeZone: WIB_TIME_ZONE, year: 'numeric' })
}

/** Format a runtime timestamp in WIB; tolerates missing or invalid dates. */
export function formatDocumentDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  if (wibDateKey(d) === wibDateKey(now)) {
    return d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: WIB_TIME_ZONE,
    })
  }
  if (wibYear(d) === wibYear(now)) {
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', timeZone: WIB_TIME_ZONE })
  }
  return d.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: WIB_TIME_ZONE,
  })
}
