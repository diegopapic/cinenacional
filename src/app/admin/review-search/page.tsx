// src/app/admin/review-search/page.tsx
'use client'

import { useState, useRef, useCallback } from 'react'
import { Search, Loader2, Save, ExternalLink, CheckSquare, Square, AlertCircle, UserSearch } from 'lucide-react'
import toast from 'react-hot-toast'
import { getCsrfHeaders } from '@/lib/csrf-client'

interface ReviewResult {
  medio: string
  autor: string | null
  link: string
  pelicula: string
}

interface MovieOption {
  id: number
  title: string
  year: number | null
}

interface SaveResult {
  review: ReviewResult
  success: boolean
  error?: string
  id?: number
}

export default function ReviewSearchPage() {
  const [movieTitle, setMovieTitle] = useState('')
  const [searching, setSearching] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [reviews, setReviews] = useState<ReviewResult[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState(false)
  const [saveResults, setSaveResults] = useState<SaveResult[] | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [enriching, setEnriching] = useState(false)
  const [enrichProgress, setEnrichProgress] = useState({ done: 0, total: 0 })

  // Movie selection
  const [movieQuery, setMovieQuery] = useState('')
  const [movieOptions, setMovieOptions] = useState<MovieOption[]>([])
  const [selectedMovie, setSelectedMovie] = useState<MovieOption | null>(null)
  const [loadingMovies, setLoadingMovies] = useState(false)
  const movieSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const searchMovies = useCallback((query: string) => {
    if (movieSearchTimeout.current) clearTimeout(movieSearchTimeout.current)
    if (query.trim().length < 2) {
      setMovieOptions([])
      return
    }
    movieSearchTimeout.current = setTimeout(async () => {
      setLoadingMovies(true)
      try {
        const res = await fetch(`/api/movies?search=${encodeURIComponent(query)}&limit=10`)
        if (res.ok) {
          const data = await res.json()
          const movies = (data.items || data).map((m: Record<string, unknown>) => ({
            id: m.id,
            title: m.title,
            year: m.year
          }))
          setMovieOptions(movies)
        }
      } catch {
        // ignore
      } finally {
        setLoadingMovies(false)
      }
    }, 300)
  }, [])

  function parseJsonFromText(text: string): ReviewResult[] | null {
    // Try to extract JSON array from potentially messy output
    // First try: direct parse
    try {
      const parsed = JSON.parse(text.trim())
      if (Array.isArray(parsed)) return parsed
    } catch {
      // continue
    }

    // Second try: find JSON array in text (may have markdown or extra text)
    const jsonMatch = text.match(/\[[\s\S]*?\](?=\s*(?:```|$|\n\n))/m)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0])
        if (Array.isArray(parsed)) return parsed
      } catch {
        // continue
      }
    }

    // Third try: find anything between [ and last ]
    const firstBracket = text.indexOf('[')
    const lastBracket = text.lastIndexOf(']')
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      try {
        const parsed = JSON.parse(text.slice(firstBracket, lastBracket + 1))
        if (Array.isArray(parsed)) return parsed
      } catch {
        // continue
      }
    }

    return null
  }

  async function enrichMissingAuthors(parsedReviews: ReviewResult[]) {
    const nullAuthorIndices = parsedReviews
      .map((r, i) => (!r.autor ? i : -1))
      .filter((i) => i !== -1)

    if (nullAuthorIndices.length === 0) return

    setEnriching(true)
    setEnrichProgress({ done: 0, total: nullAuthorIndices.length })

    // Process in parallel batches of 5
    const BATCH_SIZE = 5
    let completed = 0

    for (let i = 0; i < nullAuthorIndices.length; i += BATCH_SIZE) {
      const batch = nullAuthorIndices.slice(i, i + BATCH_SIZE)

      await Promise.all(
        batch.map(async (reviewIndex) => {
          try {
            const review = parsedReviews[reviewIndex]
            const res = await fetch('/api/review-search/extract-author', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...getCsrfHeaders() },
              body: JSON.stringify({ url: review.link })
            })

            if (res.ok) {
              const { author } = await res.json()
              if (author) {
                setReviews((prev) =>
                  prev.map((r, idx) =>
                    idx === reviewIndex ? { ...r, autor: author } : r
                  )
                )
              }
            }
          } catch {
            // individual failure is OK
          } finally {
            completed++
            setEnrichProgress({ done: completed, total: nullAuthorIndices.length })
          }
        })
      )
    }

    setEnriching(false)
  }

  async function handleSearch() {
    if (!movieTitle.trim()) return

    setSearching(true)
    setStreamText('')
    setReviews([])
    setSelected(new Set())
    setSaveResults(null)
    setParseError(null)
    setEnriching(false)

    try {
      const res = await fetch('/api/review-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getCsrfHeaders() },
        body: JSON.stringify({ movieTitle: movieTitle.trim() })
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error de red' }))
        toast.error(err.error || 'Error al buscar')
        setSearching(false)
        return
      }

      const reader = res.body?.getReader()
      if (!reader) {
        toast.error('Error: no se pudo leer la respuesta')
        setSearching(false)
        return
      }

      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'text') {
              accumulated += event.content
              setStreamText(accumulated)
            } else if (event.type === 'error') {
              toast.error(event.content)
            }
          } catch {
            // ignore malformed SSE lines
          }
        }
      }

      // Parse the accumulated text
      const parsed = parseJsonFromText(accumulated)
      if (parsed && parsed.length > 0) {
        setReviews(parsed)
        setSelected(new Set(parsed.map((_, i) => i)))
        setSearching(false)

        // Enrich reviews with missing authors
        enrichMissingAuthors(parsed)
      } else if (accumulated.trim()) {
        setParseError(
          'No se pudo extraer un JSON válido de la respuesta. Revisá el texto de Claude abajo.'
        )
      } else {
        setParseError('Claude no devolvió resultados.')
      }
    } catch (err) {
      toast.error('Error de conexión')
      console.error(err)
    } finally {
      setSearching(false)
    }
  }

  function toggleSelect(index: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === reviews.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(reviews.map((_, i) => i)))
    }
  }

  async function handleSave() {
    if (!selectedMovie) {
      toast.error('Seleccioná una película de la base de datos')
      return
    }
    if (selected.size === 0) {
      toast.error('Seleccioná al menos una crítica')
      return
    }

    setSaving(true)
    setSaveResults(null)

    try {
      const selectedReviews = reviews.filter((_, i) => selected.has(i))
      const res = await fetch('/api/review-search/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getCsrfHeaders() },
        body: JSON.stringify({
          movieId: selectedMovie.id,
          reviews: selectedReviews
        })
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Error al guardar')
        return
      }

      setSaveResults(data.results)
      toast.success(`${data.summary.saved} crítica(s) guardada(s)`)
      if (data.summary.failed > 0) {
        toast(
          `${data.summary.failed} crítica(s) no se pudieron guardar`,
          { icon: '⚠️' }
        )
      }
    } catch {
      toast.error('Error de conexión al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">Buscar Críticas</h1>
          <p className="mt-1 text-sm text-gray-500">
            Buscá críticas de películas en la web usando IA y guardalas en la base de datos
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Search section */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex gap-3">
            <input
              type="text"
              value={movieTitle}
              onChange={(e) => setMovieTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !searching && handleSearch()}
              placeholder="Título de la película..."
              className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900"
              disabled={searching}
            />
            <button
              onClick={handleSearch}
              disabled={searching || !movieTitle.trim()}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Buscar
            </button>
          </div>
        </div>

        {/* Streaming output */}
        {(searching || streamText) && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-sm font-medium text-gray-700 mb-2">
              {searching ? 'Buscando críticas...' : 'Respuesta de Claude'}
            </h2>
            <pre className="text-xs bg-gray-50 rounded-md p-4 overflow-x-auto whitespace-pre-wrap text-gray-800 max-h-64 overflow-y-auto">
              {streamText || 'Esperando respuesta...'}
            </pre>
          </div>
        )}

        {/* Parse error */}
        {parseError && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 shrink-0" />
            <p className="text-sm text-yellow-800">{parseError}</p>
          </div>
        )}

        {/* Results table */}
        {reviews.length > 0 && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-medium text-gray-900">
                  {reviews.length} crítica{reviews.length !== 1 && 's'} encontrada
                  {reviews.length !== 1 && 's'}
                </h2>
                {enriching && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-blue-600">
                    <UserSearch className="h-4 w-4 animate-pulse" />
                    Buscando autores ({enrichProgress.done}/{enrichProgress.total})...
                  </span>
                )}
              </div>
              <button
                onClick={toggleAll}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {selected.size === reviews.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-12 px-4 py-3" />
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Medio
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Autor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Link
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reviews.map((review, i) => {
                    const result = saveResults?.find((r) => r.review.link === review.link)
                    return (
                      <tr
                        key={i}
                        className={`hover:bg-gray-50 ${result?.success ? 'bg-green-50' : result && !result.success ? 'bg-red-50' : ''}`}
                      >
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggleSelect(i)}
                            className="text-gray-500 hover:text-blue-600"
                            disabled={!!result?.success}
                          >
                            {selected.has(i) ? (
                              <CheckSquare className="h-5 w-5 text-blue-600" />
                            ) : (
                              <Square className="h-5 w-5" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{review.medio}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {review.autor || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <a
                            href={review.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline max-w-xs truncate"
                          >
                            <ExternalLink className="h-3 w-3 shrink-0" />
                            <span className="truncate">{review.link}</span>
                          </a>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {result?.success && (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                              Guardada
                            </span>
                          )}
                          {result && !result.success && (
                            <span
                              className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800"
                              title={result.error}
                            >
                              Error
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Movie selector + Save */}
            <div className="px-6 py-4 border-t border-gray-200 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Película en la base de datos
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={selectedMovie ? `${selectedMovie.title} (${selectedMovie.year || 'S/A'})` : movieQuery}
                    onChange={(e) => {
                      setSelectedMovie(null)
                      setMovieQuery(e.target.value)
                      searchMovies(e.target.value)
                    }}
                    placeholder="Buscá la película en la base de datos..."
                    className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900"
                  />
                  {loadingMovies && (
                    <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-gray-400" />
                  )}
                  {movieOptions.length > 0 && !selectedMovie && (
                    <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {movieOptions.map((m) => (
                        <li key={m.id}>
                          <button
                            onClick={() => {
                              setSelectedMovie(m)
                              setMovieOptions([])
                              setMovieQuery('')
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-900 hover:bg-blue-50"
                          >
                            {m.title}{' '}
                            <span className="text-gray-500">({m.year || 'S/A'})</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  {selected.size} de {reviews.length} seleccionada{selected.size !== 1 && 's'}
                </p>
                <button
                  onClick={handleSave}
                  disabled={saving || selected.size === 0 || !selectedMovie}
                  className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Guardar seleccionadas
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
