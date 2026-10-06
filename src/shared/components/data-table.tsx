import { useMemo, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export type DataTableColumn<T> = {
  id: string
  header: string
  cell: (row: T) => ReactNode
  sortValue?: (row: T) => string | number
  sortField?: string
  filterValue?: (row: T) => string
  headerClassName?: string
  cellClassName?: string
}

export type TableSort = { id: string; desc: boolean } | null
export type ServerTableState = {
  page: number
  size: number
  totalPages: number
  totalElements: number
  search: string
  sort: TableSort
  isFetching?: boolean
  onPageChange: (page: number) => void
  onSizeChange: (size: number) => void
  onSearchChange: (search: string) => void
  onSortChange: (sort: TableSort) => void
}

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  pageSize = 10,
  onSelectionChange,
  selectable = true,
  toolbarActions,
  showColumnToggle = true,
  pagination = true,
  server,
}: {
  rows: T[]
  columns: DataTableColumn<T>[]
  pageSize?: number
  onSelectionChange?: (rows: T[]) => void
  selectable?: boolean
  toolbarActions?: ReactNode
  showColumnToggle?: boolean
  pagination?: boolean
  server?: ServerTableState
}) {
  const [localFilter, setFilter] = useState('')
  const [localSort, setSort] = useState<TableSort>(null)
  const [visible, setVisible] = useState(() => new Set(columns.map((column) => column.id)))
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [localPage, setPage] = useState(0)
  const filter = server ? server.search : localFilter
  const sort = server ? server.sort : localSort
  const page = server ? server.page : localPage
  const changePage = server ? server.onPageChange : setPage
  const canSort = (column: DataTableColumn<T>) =>
    server ? Boolean(column.sortField) : Boolean(column.sortValue)
  const shownColumns = columns.filter((column) => visible.has(column.id))
  const filtered = useMemo(
    () =>
      server
        ? rows
        : rows
            .filter((row) =>
              columns.some((column) =>
                (column.filterValue?.(row) ?? String(column.sortValue?.(row) ?? ''))
                  .toLowerCase()
                  .includes(filter.toLowerCase()),
              ),
            )
            .sort((left, right) => {
              if (!sort) return 0
              const column = columns.find((item) => item.id === sort.id)
              const compared = String(column?.sortValue?.(left) ?? '').localeCompare(
                String(column?.sortValue?.(right) ?? ''),
                undefined,
                { numeric: true },
              )
              return sort.desc ? -compared : compared
            }),
    [rows, columns, filter, sort, server],
  )
  const pages = server
    ? Math.max(1, server.totalPages)
    : pagination
      ? Math.max(1, Math.ceil(filtered.length / pageSize))
      : 1
  const slice =
    pagination && !server
      ? filtered.slice(
          Math.min(page, pages - 1) * pageSize,
          Math.min(page, pages - 1) * pageSize + pageSize,
        )
      : filtered
  function select(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
    onSelectionChange?.(rows.filter((row) => next.has(row.id)))
  }
  return (
    <section
      aria-busy={server?.isFetching}
      className="app-data-table min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white"
    >
      <div className="app-data-table__toolbar flex min-w-0 flex-wrap items-center gap-2 border-b border-slate-100 bg-white px-3.5 py-3">
        <Input
          aria-label="Filter rows"
          placeholder="Filter"
          value={filter}
          onChange={(event) => {
            if (server) server.onSearchChange(event.target.value)
            else {
              setFilter(event.target.value)
              setPage(0)
            }
          }}
          className={server ? 'min-w-0 flex-1 sm:w-[180px] sm:flex-none' : 'w-[180px] max-w-full'}
        />
        {toolbarActions}
        {showColumnToggle && (
          <details className="group relative ml-auto">
            <summary className="cursor-pointer text-xs font-semibold text-slate-500 group-open:text-violet-600">
              Columns
            </summary>
            <div className="absolute top-full right-0 z-20 mt-1.5 grid min-w-[150px] gap-0.5 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
              {columns.map((column) => (
                <label
                  key={column.id}
                  className="flex cursor-pointer items-center gap-1.5 rounded-sm px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                >
                  <Checkbox
                    checked={visible.has(column.id)}
                    onCheckedChange={() =>
                      setVisible((current) => {
                        const next = new Set(current)
                        if (next.has(column.id)) next.delete(column.id)
                        else next.add(column.id)
                        return next
                      })
                    }
                  />{' '}
                  {column.header}
                </label>
              ))}
            </div>
          </details>
        )}
      </div>
      <div className="min-w-0">
        <Table className="min-w-max text-xs">
          <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-1 [&_th]:h-8 [&_th]:bg-slate-50 [&_th]:px-1.5 [&_th]:text-[11px] [&_th]:font-semibold [&_th]:tracking-normal">
            <TableRow>
              {selectable && (
                <TableHead className="w-9">
                  <Checkbox
                    aria-label="Select page"
                    checked={slice.length > 0 && slice.every((row) => selected.has(row.id))}
                    onCheckedChange={() => {
                      const next = new Set(selected)
                      const selectPage = !slice.every((row) => next.has(row.id))
                      slice.forEach((row) => (selectPage ? next.add(row.id) : next.delete(row.id)))
                      setSelected(next)
                      onSelectionChange?.(rows.filter((row) => next.has(row.id)))
                    }}
                  />
                </TableHead>
              )}
              {shownColumns.map((column) => (
                <TableHead
                  key={column.id}
                  className={column.headerClassName}
                  aria-sort={
                    canSort(column)
                      ? sort?.id === column.id
                        ? sort.desc
                          ? 'descending'
                          : 'ascending'
                        : 'none'
                      : undefined
                  }
                >
                  {canSort(column) ? (
                    <button
                      type="button"
                      aria-label={`Sort by ${column.header}`}
                      onClick={() => {
                        const next =
                          sort?.id === column.id
                            ? { id: column.id, desc: !sort.desc }
                            : { id: column.id, desc: false }
                        if (server) server.onSortChange(next)
                        else setSort(next)
                      }}
                      className={`inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-[11px] font-semibold tracking-normal text-slate-500 transition hover:text-violet-600 ${column.headerClassName?.includes('text-right') ? 'w-full justify-end' : ''}`}
                    >
                      {column.header}
                      {sort?.id === column.id ? (sort.desc ? ' ↓' : ' ↑') : ''}
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold tracking-normal text-slate-500">
                      {column.header}
                    </span>
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {slice.map((row) => (
              <TableRow key={row.id}>
                {selectable && (
                  <TableCell>
                    <Checkbox
                      aria-label={`Select ${row.id}`}
                      checked={selected.has(row.id)}
                      onCheckedChange={() => select(row.id)}
                    />
                  </TableCell>
                )}
                {shownColumns.map((column) => (
                  <TableCell
                    key={column.id}
                    className={`px-1.5 py-1.5 text-xs text-slate-700 ${column.cellClassName ?? ''}`}
                  >
                    {column.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {slice.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={shownColumns.length + (selectable ? 1 : 0)}
                  className="py-6 text-center text-sm text-slate-400"
                >
                  No matching records.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <footer className="app-data-table__footer flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-500">
        <span>
          {server ? server.totalElements : filtered.length} records
          {selectable ? ` · ${selected.size} selected` : ''}
        </span>
        {pagination && (
          <div className="flex items-center gap-2">
            {server && (
              <select
                aria-label="Rows per page"
                value={server.size}
                onChange={(event) => server.onSizeChange(Number(event.target.value))}
                className="rounded-md border border-slate-200 bg-white px-2 py-1"
              >
                {[10, 20, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size} / page
                  </option>
                ))}
              </select>
            )}
            <Button
              type="button"
              size="xs"
              variant="outline"
              disabled={page === 0 || server?.isFetching}
              onClick={() => changePage(page - 1)}
            >
              Previous
            </Button>
            <span>
              Page {Math.min(page + 1, pages)} / {pages}
            </span>
            <Button
              type="button"
              size="xs"
              variant="outline"
              disabled={page >= pages - 1 || server?.isFetching}
              onClick={() => changePage(page + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </footer>
    </section>
  )
}
