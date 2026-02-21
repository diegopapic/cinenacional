// src/lib/shared/listTypes.ts
// Tipos compartidos entre los distintos módulos de listados

export type ViewMode = 'compact' | 'detailed'

export type SortOrder = 'asc' | 'desc'

export interface FilterOption {
  id: number | string
  name: string
  count?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  totalCount: number
  page: number
  totalPages: number
  hasMore: boolean
}

export interface PaginationState {
  page: number
  totalPages: number
  totalCount: number
}
