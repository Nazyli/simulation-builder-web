import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import type { Page, PageRequest } from '../../shared/api/pagination'
import type { ServerTableState, TableSort } from '../../shared/components/data-table'

export function useUsageTable<T>(
  key: readonly unknown[],
  fetchPage: (request: PageRequest) => Promise<Page<T>>,
  defaultSort: Exclude<TableSort, null>,
) {
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sort, setSort] = useState<TableSort>(defaultSort)
  useEffect(() => {
    if (search === debouncedSearch) return
    const timeout = window.setTimeout(() => {
      setPage(0)
      setDebouncedSearch(search)
    }, 300)
    return () => window.clearTimeout(timeout)
  }, [search, debouncedSearch])
  const request = {
    page,
    size,
    search: debouncedSearch,
    sort: sort ? [`${sort.id},${sort.desc ? 'desc' : 'asc'}`] : undefined,
  }
  const query = useQuery({
    queryKey: [...key, request],
    queryFn: () => fetchPage(request),
    placeholderData: keepPreviousData,
  })
  const server: ServerTableState = {
    page,
    size,
    search,
    sort,
    totalPages: query.data?.totalPages ?? 0,
    totalElements: query.data?.totalElements ?? 0,
    isFetching: query.isFetching,
    onPageChange: setPage,
    onSizeChange: (value) => {
      setPage(0)
      setSize(value)
    },
    onSearchChange: setSearch,
    onSortChange: (value) => {
      setPage(0)
      setSort(value)
    },
  }
  return { query, server }
}
