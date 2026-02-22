// src/hooks/useListPage.ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  const [filters, setFilters] = useState<TFilters>({
    ...config.defaultFilters,
    limit: 24
  } as TFilters)
  const [filtersData, setFiltersData] = useState<TFiltersData | null>(null)

  // Estado de datos
  const [items, setItems] = useState<TItem[]>([])
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    totalPages: 1,
    totalCount: 0
  })

  // Estado de UI
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingFilters, setIsLoadingFilters] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('compact')
  const [showFilters, setShowFilters] = useState(false)

  // Cargar opciones de filtros al montar
  useEffect(() => {
    const loadFiltersData = async () => {
      setIsLoadingFilters(true)
      try {
        const response = await fetch(config.filtersEndpoint)
        if (!response.ok) throw new Error('Error al cargar filtros')
        const data = await response.json()
        setFiltersData(data)
      } catch (error) {
        console.error('Error loading filters:', error)
      } finally {
        setIsLoadingFilters(false)
      }
    }
    loadFiltersData()
  }, [config.filtersEndpoint])

  // Inicializar filtros desde URL
  useEffect(() => {
    const urlFilters = config.searchParamsToFilters(searchParams)
    setFilters(prev => ({ ...urlFilters, limit: prev.limit } as TFilters))
    setIsInitialized(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Cargar items cuando cambian los filtros
  useEffect(() => {
    if (!isInitialized) return
    const loadItems = async () => {
      setIsLoading(true)
      try {
        const apiParams = config.filtersToApiParams(filters)
        const params = new URLSearchParams(apiParams)
        const response = await fetch(`${config.listEndpoint}?${params}`)
        if (!response.ok) throw new Error('Error al cargar datos')
        const data = await response.json()
        setItems(data.data || [])
        setPagination({
          page: data.page || 1,
          totalPages: data.totalPages || 1,
          totalCount: data.totalCount || 0
        })
      } catch (error) {
        console.error('Error loading items:', error)
        setItems([])
      } finally {
        setIsLoading(false)
      }
    }
    loadItems()
  }, [filters, isInitialized]) // eslint-disable-line react-hooks/exhaustive-deps

  // Actualizar URL cuando cambian los filtros
  useEffect(() => {
    if (!isInitialized) return
    const params = config.filtersToSearchParams(filters)
    const queryString = params.toString()
    const newUrl = queryString ? `${config.basePath}?${queryString}` : config.basePath
    router.replace(newUrl, { scroll: false })
  }, [filters, router, isInitialized]) // eslint-disable-line react-hooks/exhaustive-deps

  // Limit dinámico según viewMode
  useEffect(() => {
    const newLimit = viewMode === 'compact' ? 24 : 12
    setFilters(prev => {
      if (prev.limit === newLimit) return prev
      return { ...prev, limit: newLimit, page: 1 }
    })
  }, [viewMode])

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
    filtersData,
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
