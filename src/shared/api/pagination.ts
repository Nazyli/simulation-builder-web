export type SortMetadata = { sorted: boolean; unsorted: boolean; empty: boolean }

export type Page<T> = {
  content: T[]
  pageable: {
    sort: SortMetadata
    pageNumber: number
    pageSize: number
    offset: number
    paged: boolean
    unpaged: boolean
  }
  last: boolean
  totalPages: number
  totalElements: number
  first: boolean
  size: number
  number: number
  sort: SortMetadata
  numberOfElements: number
  empty: boolean
}

export type PageRequest = {
  page?: number
  size?: number
  search?: string
  sort?: string[]
}

export function paginationParams(request: PageRequest = {}): URLSearchParams {
  const params = new URLSearchParams({
    page: String(request.page ?? 0),
    size: String(request.size ?? 10),
  })
  if (request.search?.trim()) params.set('search', request.search.trim())
  request.sort?.filter((sort) => sort.trim()).forEach((sort) => params.append('sort', sort))
  return params
}
