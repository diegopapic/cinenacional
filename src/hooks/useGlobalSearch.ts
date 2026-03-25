import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDebounce } from './useDebounce'

export interface SearchResult {
  movies: MovieSearchResult[]
  people: PersonSearchResult[]
  total: number
}

export interface MovieSearchResult {
  id: number
  slug: string
  title: string
  originalTitle?: string
  year?: number
  posterUrl?: string
  type: 'movie'
  director?: string | null
  matchedAlternativeTitle?: string | null
}

export interface PersonSearchResult {
  id: number
  slug: string
  name: string
  photoUrl?: string
  birthYear?: number
  deathYear?: number
  type: 'person'
  matchedAlternativeName?: string | null
}

interface UseGlobalSearchReturn {
  query: string
  setQuery: (query: string) => void
  results: SearchResult | null
  loading: boolean
  error: Error | null
  clearSearch: () => void
  hasResults: boolean
}

async function fetchSearch(q: string): Promise<SearchResult> {
  const response = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8`)
  if (!response.ok) throw new Error('Error en la búsqueda')
  return response.json()
}

export function useGlobalSearch(minChars: number = 2): UseGlobalSearchReturn {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)

  const enabled = debouncedQuery.length >= minChars

  const { data, isLoading, error } = useQuery({
    queryKey: ['global-search', debouncedQuery],
    queryFn: () => fetchSearch(debouncedQuery),
    enabled,
    staleTime: 10 * 1000, // 10s cache para búsquedas
    gcTime: 60 * 1000,
  })

  const clearSearch = useCallback(() => {
    setQuery('')
  }, [])

  const results = enabled ? (data ?? null) : null

  return {
    query,
    setQuery,
    results,
    loading: enabled && isLoading,
    error: error instanceof Error ? error : null,
    clearSearch,
    hasResults: !!(results && results.total > 0)
  }
}
