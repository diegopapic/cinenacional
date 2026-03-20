// src/hooks/useListPage.ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import type { ViewMode } from '@/components/shared/ViewToggle'
import type { PaginationState } from '@/lib/shared/listTypes'

export interface ListPageConfig<TFilters, TItem, TFiltersData> {
  /** Base URL for the list page (e.g. '/listados/peliculas') */
  basePath: string
  /** API endpoint for fetching items (e.g. '/api/movies/list') */
  listEndpoint: string
  /** API endpoint for fetching filter options (e.g. '/api/movies/filters') */
  filtersEndpoint: string
  /** Default filters */
  defaultFilters: TFilters
  /** Convert URL search params to filters */
  searchParamsToFilters: (params: URLSearchParams) => TFilters
  /** Convert filters to URL search params */
  filtersToSearchParams: (filters: TFilters) => URLSearchParams
  /** Convert filters to API query params */
  filtersToApiParams: (filters: TFilters) => Record<string, string>
  /** Count active filters (excluding sort/pagination) */
  countActiveFilters: (filters: TFilters) => number
  /** Check if there are active filters */
  hasActiveFilters: (filters: TFilters) => boolean
  /** Clear filters keeping sort/pagination */
  clearFilters: (filters: TFilters) => TFilters
  /** Determine default sort order for a given sortBy value */
  getDefaultSortOrder: (sortBy: string) => 'asc' | 'desc'
}

export interface ListPageState<TFilters, TItem, TFiltersData> {
  filters: TFilters
  filtersData: TFiltersData | null
  items: TItem[]
  pagination: PaginationState
  isLoading: boolean
  isLoadingFilters: boolean
  viewMode: ViewMode
  showFilters: boolean
  activeFiltersCount: number
  setViewMode: (mode: ViewMode) => void
  setShowFilters: (show: boolean) => void
  handleFilterChange: <K extends keyof TFilters>(key: K, value: TFilters[K]) => void
  handleClearFilters: () => void
  handleSortByChange: (sortBy: string) => void
  handleToggleSortOrder: () => void
  handlePageChange: (page: number) => void
}

export function useListPage<
  TFilters extends { sortBy?: string; sortOrder?: 'asc' | 'desc'; page?: number; limit?: number },
  TItem,
  TFiltersData
>(config: ListPageConfig<TFilters, TItem, TFiltersData>): ListPageState<TFilters, TItem, TFiltersData> {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Estado de filtros
  const [filters, setFilters] = useState<TFilters>(() => {
    const urlFilters = config.searchParamsToFilters(searchParams)
    return { ...urlFilters, limit: 24 } as TFilters
  })

  // Estado de UI
  const [viewMode, setViewModeState] = useState<ViewMode>('compact')
  const [showFilters, setShowFilters] = useState(false)

  // Query: opciones de filtros (se carga una sola vez)
  const { data: filtersData = null, isLoading: isLoadingFilters } = useQuery<TFiltersData>({
    queryKey: ['list-filters', config.filtersEndpoint],
    queryFn: async () => {
      const response = await fetch(config.filtersEndpoint)
      if (!response.ok) throw new Error('Error al cargar filtros')
      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5min cache para filtros
  })

  // Query: items
  const apiParams = config.filtersToApiParams(filters)
  const { data: itemsData, isLoading } = useQuery({
    queryKey: ['list-items', config.listEndpoint, apiParams],
    queryFn: async () => {
      const params = new URLSearchParams(apiParams)
      const response = await fetch(`${config.listEndpoint}?${params}`)
      if (!response.ok) throw new Error('Error al cargar datos')
      return response.json()
    },
  })

  const items: TItem[] = itemsData?.data ?? []
  const pagination: PaginationState = {
    page: itemsData?.page ?? 1,
    totalPages: itemsData?.totalPages ?? 1,
    totalCount: itemsData?.totalCount ?? 0,
  }

  // Actualizar URL cuando cambian los filtros
  useEffect(() => {
    const params = config.filtersToSearchParams(filters)
    const queryString = params.toString()
    const newUrl = queryString ? `${config.basePath}?${queryString}` : config.basePath
    router.replace(newUrl, { scroll: false })
  }, [filters, router]) // eslint-disable-line react-hooks/exhaustive-deps

  // setViewMode con limit dinámico
  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode)
    const newLimit = mode === 'compact' ? 24 : 12
    setFilters(prev => {
      if (prev.limit === newLimit) return prev
      return { ...prev, limit: newLimit, page: 1 }
    })
  }, [])

  const handleFilterChange = useCallback(<K extends keyof TFilters>(
    key: K,
    value: TFilters[K]
  ) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1
    }))
  }, [])

  const handleClearFilters = useCallback(() => {
    setFilters(config.clearFilters(filters))
  }, [filters, config])

  const handleSortByChange = useCallback((sortBy: string) => {
    const defaultOrder = config.getDefaultSortOrder(sortBy)
    setFilters(prev => ({
      ...prev,
      sortBy,
      sortOrder: defaultOrder,
      page: 1
    } as TFilters))
  }, [config])

  const handleToggleSortOrder = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      sortOrder: prev.sortOrder === 'desc' ? 'asc' : 'desc',
      page: 1
    }))
  }, [])

  const handlePageChange = useCallback((newPage: number) => {
    setFilters(prev => ({
      ...prev,
      page: newPage
    }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const activeFiltersCount = config.countActiveFilters(filters)

  return {
    filters,
    filtersData: filtersData as TFiltersData | null,
    items,
    pagination,
    isLoading,
    isLoadingFilters,
    viewMode,
    showFilters,
    activeFiltersCount,
    setViewMode,
    setShowFilters,
    handleFilterChange,
    handleClearFilters,
    handleSortByChange,
    handleToggleSortOrder,
    handlePageChange,
  }
}
