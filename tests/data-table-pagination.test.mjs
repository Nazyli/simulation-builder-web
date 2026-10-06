import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { tsImport } from 'tsx/esm/api'

const { DataTable } = await tsImport('../src/shared/components/data-table.tsx', {
  parentURL: import.meta.url,
  tsconfig: fileURLToPath(new URL('../tsconfig.app.json', import.meta.url)),
})

const columns = [
  {
    id: 'name',
    header: 'Name',
    cell: (row) => row.name,
    sortValue: (row) => row.name,
    sortField: 'name',
  },
]

test('server table preserves page rows/order, uses server totals and search', () => {
  const html = renderToStaticMarkup(
    React.createElement(DataTable, {
      rows: [
        { id: 'b', name: 'Bravo' },
        { id: 'a', name: 'Alpha' },
      ],
      columns,
      selectable: false,
      server: {
        page: 1,
        size: 10,
        totalPages: 2,
        totalElements: 13,
        search: 'server-only-match',
        sort: { id: 'name', desc: false },
        onPageChange() {},
        onSizeChange() {},
        onSearchChange() {},
        onSortChange() {},
      },
    }),
  )
  assert.ok(html.indexOf('Bravo') < html.indexOf('Alpha'))
  assert.match(html, /13 records/)
  assert.match(html, /Page 2 \/ 2/)
  assert.match(html, /value="server-only-match"/)
  assert.doesNotMatch(html, /No matching records/)
})

test('local table still slices rows without requiring server metadata', () => {
  const html = renderToStaticMarkup(
    React.createElement(DataTable, {
      rows: [
        { id: 'a', name: 'Alpha' },
        { id: 'b', name: 'Bravo' },
      ],
      columns,
      selectable: false,
      pageSize: 1,
    }),
  )
  assert.match(html, /Alpha/)
  assert.doesNotMatch(html, /Bravo/)
  assert.match(html, /Page 1 \/ 2/)
})

test('server table hides sorting on columns without a server sort field', () => {
  const html = renderToStaticMarkup(
    React.createElement(DataTable, {
      rows: [{ id: 'a', name: 'Alpha' }],
      columns: [{ ...columns[0], sortField: undefined }],
      selectable: false,
      server: {
        page: 0,
        size: 10,
        totalPages: 1,
        totalElements: 1,
        search: '',
        sort: null,
        onPageChange() {},
        onSizeChange() {},
        onSearchChange() {},
        onSortChange() {},
      },
    }),
  )
  assert.doesNotMatch(html, /Sort by Name/)
  assert.doesNotMatch(html, /aria-sort=/)
})

test('unpaginated local table renders every row without page controls', () => {
  const html = renderToStaticMarkup(
    React.createElement(DataTable, {
      rows: [
        { id: 'a', name: 'Alpha' },
        { id: 'b', name: 'Bravo' },
      ],
      columns,
      selectable: false,
      pageSize: 1,
      pagination: false,
    }),
  )
  assert.match(html, /Alpha/)
  assert.match(html, /Bravo/)
  assert.doesNotMatch(html, /Previous|Next|Rows per page/)
})
