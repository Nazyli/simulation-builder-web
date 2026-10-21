import { apiClient } from './client'

export interface DocumentWriteInput {
  documentName: string
  contents: Array<{ page: number; content: string }>
}

export interface RuntimeDocumentContent {
  participantAttachmentEmailId: string | null
  participantDocContentId: string | null
  page: number | null
  isHighlight: boolean | null
  content: string | null
}

export interface RuntimeFileItem {
  emailAttachmentId: string | null
  participantDocId: string | null
  fileName: string | null
  ownerName: string | null
  isHighlight: boolean | null
  modifiedDate: string | null
  contents: RuntimeDocumentContent[]
  documentId: string | null
}

export interface RuntimeFolderFiles {
  folderName: string
  files: RuntimeFileItem[]
}

export interface RuntimeDocumentStructure {
  filesInFolders: RuntimeFolderFiles[]
  filesInRoot: RuntimeFileItem[]
}

export const createEmptyDocumentStructure = (): RuntimeDocumentStructure => ({
  filesInFolders: [],
  filesInRoot: [],
})

export const getDocuments = (participantId: string) =>
  apiClient<RuntimeDocumentStructure>(
    `/admin/runner/documents?participantId=${encodeURIComponent(participantId)}`,
  )

export const openDocument = (participantId: string, documentId: string) =>
  apiClient<RuntimeFileItem>(
    `/admin/runner/documents/${encodeURIComponent(documentId)}/open?participantId=${encodeURIComponent(participantId)}`,
    { method: 'POST' },
  )

export const createDocument = (participantId: string, input: DocumentWriteInput) =>
  apiClient<RuntimeFileItem>(
    `/admin/runner/documents?participantId=${encodeURIComponent(participantId)}`,
    { method: 'POST', body: JSON.stringify(input) },
  )

export const updateDocument = (
  participantId: string,
  documentId: string,
  input: DocumentWriteInput,
) =>
  apiClient<RuntimeFileItem>(
    `/admin/runner/documents/${encodeURIComponent(documentId)}?participantId=${encodeURIComponent(participantId)}`,
    { method: 'PUT', body: JSON.stringify(input) },
  )

/** Flat file list: root files first, then folder files in folder order. */
export function flattenRuntimeDocuments(structure: RuntimeDocumentStructure): RuntimeFileItem[] {
  return [...structure.filesInRoot, ...structure.filesInFolders.flatMap((folder) => folder.files)]
}

/** Find a runtime file item by its `participantDocId` anywhere in the structure. */
export function findRuntimeDocument(
  structure: RuntimeDocumentStructure,
  id: string,
): RuntimeFileItem | null {
  if (!id) return null
  return flattenRuntimeDocuments(structure).find((file) => file.participantDocId === id) ?? null
}

/**
 * Replace a runtime file item wherever it lives (root or folder), matching by
 * `participantDocId`. Immutable: untouched folders and arrays are preserved.
 * Unknown ids (including missing ids) are prepended to `filesInRoot`.
 */
export function replaceRuntimeDocument(
  structure: RuntimeDocumentStructure,
  updated: RuntimeFileItem,
): RuntimeDocumentStructure {
  const id = updated.participantDocId
  const matches = (file: RuntimeFileItem): boolean => id != null && file.participantDocId === id
  const replaced =
    id != null &&
    (structure.filesInRoot.some(matches) ||
      structure.filesInFolders.some((folder) => folder.files.some(matches)))
  if (!replaced) {
    return {
      filesInFolders: structure.filesInFolders.map((folder) => ({
        ...folder,
        files: [...folder.files],
      })),
      filesInRoot: [updated, ...structure.filesInRoot],
    }
  }
  const filesInFolders = structure.filesInFolders.map((folder) =>
    folder.files.some(matches)
      ? { ...folder, files: folder.files.map((file) => (matches(file) ? updated : file)) }
      : folder,
  )
  const filesInRoot = structure.filesInRoot.map((file) => (matches(file) ? updated : file))
  return { filesInFolders, filesInRoot }
}

/**
 * Insert a freshly created runtime file item (documents created from the
 * editor always live in `filesInRoot`). Replaces an existing item with the
 * same `participantDocId` if one is present.
 */
export function insertRuntimeDocument(
  structure: RuntimeDocumentStructure,
  created: RuntimeFileItem,
): RuntimeDocumentStructure {
  return replaceRuntimeDocument(structure, created)
}
