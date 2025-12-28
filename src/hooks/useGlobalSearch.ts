import { useState, useEffect, useCallback } from 'react'
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
}

export interface PersonSearchResult {
  id: number
  slug: string
  name: string
  photoUrl?: string
  birthYear?: number
  deathYear?: number
  type: 'person'
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

export function useGlobalSearch(minChars: number = 2): UseGlobalSearchReturn {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const debouncedQuery = useDebounce(query, 300)

  const search = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < minChars) {
      setResults(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&limit=8`)
      
      if (!response.ok) {
        throw new Error('Error en la búsqueda')
      }

      const data = await response.json()
      setResults(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error desconocido'))
      setResults(null)
    } finally {
      setLoading(false)
    }
  }, [minChars])

  useEffect(() => {
    if (debouncedQuery) {
      search(debouncedQuery)
    } else {
      setResults(null)
    }
  }, [debouncedQuery, search])

  const clearSearch = useCallback(() => {
    setQuery('')
    setResults(null)
    setError(null)
  }, [])

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    clearSearch,
    hasResults: !!(results && results.total > 0)
  }
}