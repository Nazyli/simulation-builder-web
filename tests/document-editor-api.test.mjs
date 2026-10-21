import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createDocument,
  flattenRuntimeDocuments,
  findRuntimeDocument,
  getDocuments,
  insertRuntimeDocument,
  openDocument,
  replaceRuntimeDocument,
  updateDocument,
} from '../src/shared/api/documents.ts'

function envelope(data) {
  return {
    ok: true,
    json: async () => ({ status: 'success', info: { code: 200, message: 'ok' }, data }),
  }
}

function fileItem(participantDocId, overrides = {}) {
  return {
    emailAttachmentId: null,
    participantDocId,
    fileName: `File ${participantDocId}`,
    ownerName: 'participant-1',
    isHighlight: false,
    modifiedDate: null,
    contents: [],
    documentId: null,
    ...overrides,
  }
}

function structure(root, folders = []) {
  return { filesInRoot: root, filesInFolders: folders }
}

test('createDocument posts camelCase document pages to the participant endpoint', async () => {
  let request
  globalThis.fetch = async (path, init) => {
    request = { path, init }
    return envelope({})
  }

  await createDocument('participant 1', {
    documentName: 'Guide',
    contents: [{ page: 1, content: '<p>One</p>' }],
  })

  assert.equal(request.path, '/admin/runner/documents?participantId=participant%201')
  assert.equal(request.init.method, 'POST')
  assert.deepEqual(JSON.parse(request.init.body), {
    documentName: 'Guide',
    contents: [{ page: 1, content: '<p>One</p>' }],
  })
})

test('updateDocument puts the full page set for the selected runtime document', async () => {
  let request
  globalThis.fetch = async (path, init) => {
    request = { path, init }
    return envelope({})
  }

  await updateDocument('participant/1', 'document/2', {
    documentName: 'Updated Guide',
    contents: [
      { page: 1, content: '<p>One</p>' },
      { page: 2, content: '<p>Two</p>' },
    ],
  })

  assert.equal(request.path, '/admin/runner/documents/document%2F2?participantId=participant%2F1')
  assert.equal(request.init.method, 'PUT')
  assert.deepEqual(JSON.parse(request.init.body).contents, [
    { page: 1, content: '<p>One</p>' },
    { page: 2, content: '<p>Two</p>' },
  ])
})

test('getDocuments calls the participant endpoint and returns the folder structure', async () => {
  let request
  const payload = { filesInFolders: [], filesInRoot: [] }
  globalThis.fetch = async (path, init) => {
    request = { path, init }
    return envelope(payload)
  }

  const result = await getDocuments('p1')
  assert.equal(request.path, '/admin/runner/documents?participantId=p1')
  assert.deepEqual(result, payload)
})

test('openDocument posts to the open endpoint and returns the file item', async () => {
  let request
  globalThis.fetch = async (path, init) => {
    request = { path, init }
    return envelope(fileItem('doc-1'))
  }

  const result = await openDocument('participant 1', 'doc 1')
  assert.equal(request.path, '/admin/runner/documents/doc%201/open?participantId=participant%201')
  assert.equal(request.init.method, 'POST')
  assert.equal(result.participantDocId, 'doc-1')
})

test('flattenRuntimeDocuments lists root files first, then folder files in order', () => {
  const root = [fileItem('root-1'), fileItem('root-2')]
  const folders = [
    { folderName: 'Alpha', files: [fileItem('a-1'), fileItem('a-2')] },
    { folderName: 'Beta', files: [fileItem('b-1')] },
  ]

  const ids = flattenRuntimeDocuments(structure(root, folders)).map((file) => file.participantDocId)
  assert.deepEqual(ids, ['root-1', 'root-2', 'a-1', 'a-2', 'b-1'])
})

test('findRuntimeDocument locates items in folders and root without mutating the structure', () => {
  const target = fileItem('a-2')
  const current = structure(
    [fileItem('root-1')],
    [{ folderName: 'Alpha', files: [fileItem('a-1'), target] }],
  )

  assert.strictEqual(findRuntimeDocument(current, 'a-2'), target)
  assert.strictEqual(findRuntimeDocument(current, 'root-1'), current.filesInRoot[0])
  assert.strictEqual(findRuntimeDocument(current, 'missing'), null)
  assert.strictEqual(findRuntimeDocument(current, ''), null)
})

test('replaceRuntimeDocument keeps the folder position of the updated file', () => {
  const updated = fileItem('a-1', { fileName: 'Updated', modifiedDate: '2026-10-21T00:00:00Z' })
  const current = structure(
    [fileItem('root-1')],
    [{ folderName: 'Alpha', files: [fileItem('a-1'), fileItem('a-2')] }],
  )

  const next = replaceRuntimeDocument(current, updated)

  assert.deepEqual(
    next.filesInFolders[0].files.map((file) => file.fileName),
    ['Updated', 'File a-2'],
  )
  assert.deepEqual(next.filesInRoot, current.filesInRoot)
  assert.deepEqual(
    current.filesInFolders[0].files.map((file) => file.fileName),
    ['File a-1', 'File a-2'],
  )
})

test('replaceRuntimeDocument replaces in root when the item lives there', () => {
  const updated = fileItem('root-1', { fileName: 'Root Updated' })
  const current = structure(
    [fileItem('root-1'), fileItem('root-2')],
    [{ folderName: 'Alpha', files: [fileItem('a-1')] }],
  )

  const next = replaceRuntimeDocument(current, updated)

  assert.deepEqual(
    next.filesInRoot.map((file) => file.fileName),
    ['Root Updated', 'File root-2'],
  )
  assert.deepEqual(
    next.filesInFolders[0].files.map((file) => file.fileName),
    ['File a-1'],
  )
})

test('replaceRuntimeDocument prepends unknown or missing ids to filesInRoot', () => {
  const unknownId = fileItem('brand-new')
  const missingId = fileItem(null)

  const fromUnknown = replaceRuntimeDocument(
    structure([fileItem('root-1')], [{ folderName: 'Alpha', files: [fileItem('a-1')] }]),
    unknownId,
  )
  assert.deepEqual(
    fromUnknown.filesInRoot.map((file) => file.participantDocId),
    ['brand-new', 'root-1'],
  )
  assert.deepEqual(
    fromUnknown.filesInFolders[0].files.map((file) => file.participantDocId),
    ['a-1'],
  )

  const fromMissing = replaceRuntimeDocument(structure([fileItem('root-1')]), missingId)
  assert.deepEqual(
    fromMissing.filesInRoot.map((file) => file.participantDocId),
    [null, 'root-1'],
  )
})

test('insertRuntimeDocument prepends created documents to filesInRoot', () => {
  const created = fileItem('new-1', { fileName: 'New draft' })
  const current = structure(
    [fileItem('root-1')],
    [{ folderName: 'Alpha', files: [fileItem('a-1')] }],
  )

  const next = insertRuntimeDocument(current, created)

  assert.deepEqual(
    next.filesInRoot.map((file) => file.fileName),
    ['New draft', 'File root-1'],
  )
  assert.deepEqual(next.filesInFolders, current.filesInFolders)
})
