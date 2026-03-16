// src/app/admin/review-search/page.tsx
'use client'

import React, { useState, useRef, useCallback } from 'react'
import { Search, Loader2, Save, ExternalLink, CheckSquare, Square, AlertCircle, UserSearch, Copy, FileText, ChevronDown, ChevronUp, UserCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { getCsrfHeaders } from '@/lib/csrf-client'

interface ReviewResult {
  medio: string
  autor: string | null
  titulo: string | null
  fecha: string | null
  link: string
  pelicula: string
  summary?: string | null
  authorId?: number | null
}

interface MovieOption {
  id: number
  title: string
  year: number | null
  director: string | null
}

interface SaveResult {
  review: ReviewResult
  success: boolean
  error?: string
  id?: number
}

export default function ReviewSearchPage() {
  const [searching, setSearching] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [reviews, setReviews] = useState<ReviewResult[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState(false)
  const [saveResults, setSaveResults] = useState<SaveResult[] | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [enriching, setEnriching] = useState(false)
  const [enrichProgress, setEnrichProgress] = useState({ done: 0, total: 0 })
  const [duplicates, setDuplicates] = useState<Set<number>>(new Set())
  const [nonReviewFlags, setNonReviewFlags] = useState<Map<number, string[]>>(new Map())
  const [summarizing, setSummarizing] = useState(false)
  const [summarizeProgress, setSummarizeProgress] = useState({ done: 0, total: 0 })
  const [expandedSummary, setExpandedSummary] = useState<number | null>(null)

  // Author auto-resolution
  const [resolvingAuthors, setResolvingAuthors] = useState(false)

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
          const items = data.movies || data.items || (Array.isArray(data) ? data : [])
          const movies = items.map((m: Record<string, unknown>) => {
            // Extract director from crew (roleId 2)
            let director: string | null = null
            const crew = m.crew as Array<{ roleId?: number; role?: string | { name?: string }; person?: { firstName?: string; lastName?: string } }> | undefined
            if (crew && crew.length > 0) {
              const dir = crew.find(c => {
                if (c.roleId === 2) return true
                const roleName = typeof c.role === 'string' ? c.role : c.role?.name
                return roleName === 'Director' || roleName === 'Dirección'
              })
              if (dir?.person) {
                director = [dir.person.firstName, dir.person.lastName].filter(Boolean).join(' ')
              }
            }
            return { id: m.id as number, title: m.title as string, year: m.year as number | null, director }
          })
          setMovieOptions(movies)
        }
      } catch {
        // ignore
      } finally {
        setLoadingMovies(false)
      }
    }, 300)
  }, [])

  /**
   * Find duplicate reviews using 3 passes (all require same domain + same author):
   * Pass 1: Same normalized title → duplicate
   * Pass 2: One URL slug contains the other → duplicate (e.g. /nuestra-tierra/ vs /73ssiff-nuestra-tierra/)
   * Pass 3: Slug "essences" overlap (subset check) → duplicate. Catches same review republished
   *         at festival vs theatrical release with completely different slugs.
   * Returns the set of indices to mark as duplicates (keeps first occurrence).
   */
  function findDuplicates(revs: ReviewResult[]): Set<number> {
    const dupes = new Set<number>()
    const normalize = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
    const getSlug = (url: string): string => {
      try {
        const segments = new URL(url).pathname.split('/').filter(Boolean)
        return segments[segments.length - 1] || ''
      } catch { return '' }
    }

    // Extract meaningful words from URL slug, removing stop words, dates,
    // festival/review terms — leaves only the "essence" (movie name, director, etc.)
    const slugStopWords = new Set([
      'de', 'del', 'la', 'el', 'los', 'las', 'en', 'a', 'y', 'un', 'una', 'por', 'con', 'para', 'sobre',
      'the', 'of', 'and', 'in', 'an', 'by', 'for', 'with', 'at', 'to', 'from', 'that', 'which', 'who',
      'critica', 'review', 'resena', 'estrenos', 'estreno', 'festival', 'venecia', 'venice',
      'cannes', 'berlin', 'berlinale', 'toronto', 'tiff', 'bafici', 'ssiff', 'mar',
      'seccion', 'oficial', 'fuera', 'competicion', 'competencia', 'especial',
      'post', 'nota', 'entry', 'article',
      'cine', 'pelicula', 'film', 'movie', 'director', 'directora', 'dirigida',
      'entrevista', 'interview', 'perfil', 'profile', 'reportaje'
    ])
    const getSlugEssence = (url: string): string[] => {
      const slug = getSlug(url)
      if (!slug) return []
      return slug.split(/[-_]/).filter(w => {
        if (!w || w.length <= 1) return false
        if (slugStopWords.has(w.toLowerCase())) return false
        if (/^\d+$/.test(w)) return false
        if (/^\d+ssiff$/i.test(w)) return false
        return true
      }).map(w => w.toLowerCase())
    }

    // Group by domain
    const byDomain = new Map<string, number[]>()
    for (let i = 0; i < revs.length; i++) {
      try {
        const domain = new URL(revs[i].link).hostname.replace(/^www\./, '')
        if (!byDomain.has(domain)) byDomain.set(domain, [])
        byDomain.get(domain)!.push(i)
      } catch { /* skip invalid URLs */ }
    }

    for (const indices of byDomain.values()) {
      if (indices.length < 2) continue

      // Pass 1: same domain + same author + same title → duplicate (keep first)
      const seen = new Map<string, number>()
      for (const idx of indices) {
        const author = revs[idx].autor
        if (!author || author === 'null') continue
        const authorKey = normalize(author)
        const titleKey = normalize(revs[idx].titulo || revs[idx].link)
        const key = `${authorKey}::${titleKey}`
        if (seen.has(key)) {
          dupes.add(idx)
        } else {
          seen.set(key, idx)
        }
      }

      // Pairwise checks for Pass 2 and 3 (same domain + same author)
      for (let a = 0; a < indices.length; a++) {
        if (dupes.has(indices[a])) continue
        for (let b = a + 1; b < indices.length; b++) {
          if (dupes.has(indices[b])) continue
          const idxA = indices[a]
          const idxB = indices[b]
          const authorA = revs[idxA].autor
          const authorB = revs[idxB].autor
          if (!authorA || !authorB || authorA === 'null' || authorB === 'null') continue
          if (normalize(authorA) !== normalize(authorB)) continue

          // Pass 2: one slug contains the other
          const slugA = getSlug(revs[idxA].link)
          const slugB = getSlug(revs[idxB].link)
          if (slugA && slugB && slugA.length >= 3 && slugB.length >= 3) {
            if (slugA.includes(slugB) || slugB.includes(slugA)) {
              dupes.add(idxB)
              continue
            }
          }

          // Pass 3: slug essence subset — one's meaningful words are fully contained in the other's
          const essenceA = getSlugEssence(revs[idxA].link)
          const essenceB = getSlugEssence(revs[idxB].link)
          if (essenceA.length >= 2 && essenceB.length >= 2) {
            const shorter = essenceA.length <= essenceB.length ? essenceA : essenceB
            const longerSet = new Set(essenceA.length <= essenceB.length ? essenceB : essenceA)
            const allContained = shorter.every(w => longerSet.has(w))
            if (allContained) {
              dupes.add(idxB)
            }
          }
        }
      }
    }

    return dupes
  }

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

  /**
   * Auto-resolve authors: calls server endpoint that finds or creates Person records.
   */
  async function resolveAuthors() {
    // Collect unique author names from non-duplicate, non-flagged reviews without authorId
    const authorNames = new Map<string, number[]>()

    setReviews((currentReviews) => {
      for (let i = 0; i < currentReviews.length; i++) {
        const r = currentReviews[i]
        if (r.autor && !r.authorId && !duplicates.has(i) && !nonReviewFlags.has(i)) {
          const name = r.autor.trim()
          if (name && name !== 'null') {
            if (!authorNames.has(name)) authorNames.set(name, [])
            authorNames.get(name)!.push(i)
          }
        }
      }
      return currentReviews
    })

    if (authorNames.size === 0) return

    setResolvingAuthors(true)
    try {
      const res = await fetch('/api/review-search/resolve-authors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getCsrfHeaders() },
        body: JSON.stringify({ names: [...authorNames.keys()] })
      })

      if (!res.ok) {
        toast.error('Error al resolver autores')
        return
      }

      const data = await res.json()
      const resultMap = new Map<string, number>()
      for (const r of data.results) {
        resultMap.set(r.name, r.personId)
      }

      // Apply resolved IDs to reviews
      const updates = new Map<number, number>()
      for (const [name, indices] of authorNames) {
        const personId = resultMap.get(name)
        if (personId) {
          for (const idx of indices) {
            updates.set(idx, personId)
          }
        }
      }

      if (updates.size > 0) {
        setReviews((prev) =>
          prev.map((r, idx) => {
            const personId = updates.get(idx)
            return personId ? { ...r, authorId: personId } : r
          })
        )
      }

      if (data.summary.created > 0 || data.summary.resolved > 0) {
        toast.success(
          `Autores: ${data.summary.resolved} existente(s), ${data.summary.created} creado(s)`
        )
      }
    } catch {
      toast.error('Error de conexión al resolver autores')
    } finally {
      setResolvingAuthors(false)
    }
  }

  async function enrichReviews(parsedReviews: ReviewResult[]) {
    console.log('[enrichReviews] ENTERED, reviews:', parsedReviews.length)

    // Check if a title is essentially just the movie name
    const isTitleJustMovieName = (title: string, movie: string) => {
      const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
      const cleanMovie = normalize(movie)
      if (normalize(title) === cleanMovie) return true
      const stripped = title.replace(/\s*\([^)]*\)\s*/g, ' ').trim()
      if (normalize(stripped) === cleanMovie) return true
      const segments = stripped.split(/\s*[|–—]\s*|\s+-\s+/)
      const prefix = /^(critica|review|resena|critica de|review of)\s*/i
      return segments.some(seg => {
        const n = normalize(seg)
        return n === cleanMovie || n.replace(prefix, '').trim() === cleanMovie
      })
    }

    // Always enrich ALL reviews: authoritative sources (JSON-LD, meta) override Claude
    setEnriching(true)
    setEnrichProgress({ done: 0, total: parsedReviews.length })
    toast(`Verificando metadatos de ${parsedReviews.length} críticas...`)

    let corrected = 0

    for (let i = 0; i < parsedReviews.length; i++) {
      const review = parsedReviews[i]

      try {
        const res = await fetch('/api/review-search/extract-author', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getCsrfHeaders() },
          body: JSON.stringify({ url: review.link, movieTitle: review.pelicula })
        })

        if (res.ok) {
          const data = await res.json()
          console.log(`[enrich] ${review.medio}: author=${data.author}, title=${data.title}, fecha=${data.fecha}, method=${data.method}`)
          const updates: Partial<ReviewResult> = {}

          // Author: authoritative sources (json-ld, meta) always override Claude.
          // Byline only fills in if Claude had no author.
          const isAuthoritative = data.method === 'json-ld' || data.method === 'meta'
          const claudeAuthorMissing = !review.autor || review.autor === 'null' || review.autor === 'N/A' || review.autor === 'No disponible'

          // Track non-review signals
          if (data.nonReviewSignals && data.nonReviewSignals.length > 0) {
            console.log(`[enrich] ${review.medio}: NON-REVIEW signals:`, data.nonReviewSignals)
            setNonReviewFlags(prev => {
              const next = new Map(prev)
              next.set(i, data.nonReviewSignals)
              return next
            })
          }

          if (data.author && (isAuthoritative || claudeAuthorMissing)) {
            if (!review.autor || data.author !== review.autor) {
              if (review.autor && data.author !== review.autor) {
                console.log(`[enrich] ${review.medio}: overriding Claude author "${review.autor}" → "${data.author}" (${data.method})`)
              }
              updates.autor = data.author
              corrected++
            }
          }

          // Title: replace if missing or if current is just the movie name
          if (data.title && (!review.titulo || isTitleJustMovieName(review.titulo, review.pelicula))) {
            updates.titulo = data.title
          }
          // Date: fill in if missing
          if (data.fecha && !review.fecha) updates.fecha = data.fecha

          if (Object.keys(updates).length > 0) {
            setReviews((prev) =>
              prev.map((r, idx) => (idx === i ? { ...r, ...updates } : r))
            )
          }
        } else {
          console.error(`[enrich] ${review.medio}: HTTP ${res.status} from extract-author endpoint`)
        }
      } catch (err) {
        console.error(`[enrich] ${review.medio}: fetch failed`, err)
      }

      setEnrichProgress({ done: i + 1, total: parsedReviews.length })
    }

    setEnriching(false)
    if (corrected > 0) {
      toast.success(`${corrected} metadato(s) corregido(s) automáticamente`)
    }

    // Run dedup after enrichment (now we have corrected authors)
    setReviews((currentReviews) => {
      const dupes = findDuplicates(currentReviews)
      if (dupes.size > 0) {
        setDuplicates(dupes)
        setSelected((prev) => {
          const next = new Set(prev)
          dupes.forEach((idx) => next.delete(idx))
          return next
        })
        toast(`${dupes.size} duplicada(s) detectada(s) y deseleccionada(s)`, { icon: '🔄' })
      }
      return currentReviews
    })

    // Auto-deselect non-reviews
    setNonReviewFlags((currentFlags) => {
      if (currentFlags.size > 0) {
        setSelected((prev) => {
          const next = new Set(prev)
          currentFlags.forEach((_, idx) => next.delete(idx))
          return next
        })
        toast(`${currentFlags.size} resultado(s) marcado(s) como posible no-crítica`, { icon: '⚠️' })
      }
      return currentFlags
    })

    // Auto-resolve authors against the DB
    // Small delay to let state settle after enrichment updates
    await new Promise((r) => setTimeout(r, 100))
    await resolveAuthors()
  }

  async function handleSummarize() {
    const selectedIndices = Array.from(selected).filter(
      (i) => !duplicates.has(i) && !nonReviewFlags.has(i) && !reviews[i]?.summary
    )

    if (selectedIndices.length === 0) {
      toast('No hay críticas seleccionadas sin resumen', { icon: '⚠️' })
      return
    }

    setSummarizing(true)
    setSummarizeProgress({ done: 0, total: selectedIndices.length })
    toast(`Generando resúmenes de ${selectedIndices.length} críticas...`)

    let generated = 0

    for (let j = 0; j < selectedIndices.length; j++) {
      const i = selectedIndices[j]
      const review = reviews[i]

      try {
        const res = await fetch('/api/review-search/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getCsrfHeaders() },
          body: JSON.stringify({ url: review.link })
        })

        if (res.ok) {
          const data = await res.json()
          if (data.summary) {
            setReviews((prev) =>
              prev.map((r, idx) => (idx === i ? { ...r, summary: data.summary } : r))
            )
            generated++
          }
        } else {
          const err = await res.json().catch(() => ({ error: 'Error' }))
          console.error(`[summarize] ${review.medio}: ${err.error}`)
        }
      } catch (err) {
        console.error(`[summarize] ${review.medio}: fetch failed`, err)
      }

      setSummarizeProgress({ done: j + 1, total: selectedIndices.length })
    }

    setSummarizing(false)
    if (generated > 0) {
      toast.success(`${generated} resumen(es) generado(s)`)
    }
  }

  async function handleSearch() {
    if (!selectedMovie) {
      toast.error('Seleccioná una película de la base de datos')
      return
    }

    setSearching(true)
    setStreamText('')
    setReviews([])
    setSelected(new Set())
    setSaveResults(null)
    setParseError(null)
    setEnriching(false)
    setDuplicates(new Set())
    setNonReviewFlags(new Map())
    setResolvingAuthors(false)

    try {
      const res = await fetch('/api/review-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getCsrfHeaders() },
        body: JSON.stringify({
          movieTitle: selectedMovie.title,
          movieYear: selectedMovie.year,
          movieDirector: selectedMovie.director
        })
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
        // Normalize "null" strings to actual null
        for (const r of parsed) {
          if (r.autor === 'null' || r.autor === 'N/A' || r.autor === 'No disponible') {
            r.autor = null
          }
          if (!r.titulo || r.titulo === 'null') r.titulo = null
          if (!r.fecha || r.fecha === 'null') r.fecha = null
        }
        setReviews(parsed)
        // Initial dedup with Claude-provided authors
        const initialDupes = findDuplicates(parsed)
        setDuplicates(initialDupes)
        // Select all except initial duplicates
        const initialSelection = new Set(parsed.map((_, i) => i))
        initialDupes.forEach((idx) => initialSelection.delete(idx))
        setSelected(initialSelection)
        setSearching(false)

        if (initialDupes.size > 0) {
          toast(`${initialDupes.size} duplicada(s) detectada(s) y deseleccionada(s)`, { icon: '🔄' })
        }

        // Enrich ALL reviews: authoritative HTML metadata overrides Claude's authors
        console.log(`[search] Parsed ${parsed.length} reviews, enriching all`)
        try {
          await enrichReviews(parsed)
        } catch (enrichErr) {
          console.error('[search] enrichReviews CRASHED:', enrichErr)
          toast.error(`Error verificando metadatos: ${enrichErr instanceof Error ? enrichErr.message : String(enrichErr)}`)
        }
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Película
          </label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={selectedMovie ? `${selectedMovie.title} (${selectedMovie.year || 'S/A'})${selectedMovie.director ? ` — ${selectedMovie.director}` : ''}` : movieQuery}
                onChange={(e) => {
                  setSelectedMovie(null)
                  setMovieQuery(e.target.value)
                  searchMovies(e.target.value)
                }}
                onKeyDown={(e) => e.key === 'Enter' && selectedMovie && !searching && handleSearch()}
                placeholder="Buscá la película en la base de datos..."
                className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900"
                disabled={searching}
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
                        {m.director && (
                          <span className="text-gray-400 ml-1">— {m.director}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              onClick={handleSearch}
              disabled={searching || !selectedMovie}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Buscar críticas
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
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enriqueciendo ({enrichProgress.done}/{enrichProgress.total})...
                  </span>
                )}
                {resolvingAuthors && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-green-600">
                    <UserSearch className="h-4 w-4 animate-pulse" />
                    Resolviendo autores...
                  </span>
                )}
                {summarizing && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-purple-600">
                    <FileText className="h-4 w-4 animate-pulse" />
                    Generando resúmenes ({summarizeProgress.done}/{summarizeProgress.total})...
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
                      Título
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Autor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Fecha
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
                    const isDuplicate = duplicates.has(i)
                    const isNonReview = nonReviewFlags.has(i)
                    const hasSummary = !!review.summary
                    const isExpanded = expandedSummary === i
                    const hasAuthorId = !!review.authorId
                    return (
                      <React.Fragment key={i}>
                        <tr
                          className={`hover:bg-gray-50 ${result?.success ? 'bg-green-50' : result && !result.success ? 'bg-red-50' : isDuplicate ? 'bg-yellow-50/50' : isNonReview ? 'bg-orange-50/50' : ''}`}
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
                          <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate" title={review.titulo || ''}>
                            {review.titulo || '—'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {review.autor && review.autor !== 'null' ? (
                              <span
                                className={`inline-flex items-center gap-1.5 ${
                                  hasAuthorId
                                    ? 'text-green-700'
                                    : 'text-gray-700'
                                }`}
                                title={hasAuthorId ? `Autor asignado (ID: ${review.authorId})` : 'Autor pendiente de resolución'}
                              >
                                {hasAuthorId && (
                                  <UserCheck className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                )}
                                <span>{review.autor}</span>
                              </span>
                            ) : (
                              <span className="text-gray-400">Sin autor</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                            {review.fecha || '—'}
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
                            <div className="flex items-center gap-1.5">
                              {isDuplicate && !result && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                                  <Copy className="h-3 w-3" />
                                  Duplicada
                                </span>
                              )}
                              {nonReviewFlags.has(i) && !isDuplicate && !result && (
                                <span
                                  className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800 cursor-help"
                                  title={nonReviewFlags.get(i)!.join('\n')}
                                >
                                  <AlertCircle className="h-3 w-3" />
                                  No parece crítica
                                </span>
                              )}
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
                              {hasSummary && (
                                <button
                                  onClick={() => setExpandedSummary(isExpanded ? null : i)}
                                  className="inline-flex items-center gap-0.5 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800 hover:bg-purple-200"
                                  title="Ver resumen"
                                >
                                  <FileText className="h-3 w-3" />
                                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {hasSummary && isExpanded && (
                          <tr className="bg-purple-50/30">
                            <td colSpan={7} className="px-8 py-3">
                              <p className="text-sm text-gray-700 italic leading-relaxed">{review.summary}</p>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  {selected.size} de {reviews.length} seleccionada{selected.size !== 1 && 's'}
                  {selectedMovie && (
                    <span className="ml-2 text-gray-400">
                      → {selectedMovie.title} ({selectedMovie.year || 'S/A'})
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSummarize}
                    disabled={summarizing || enriching || selected.size === 0}
                    className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {summarizing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                    Generar resúmenes
                  </button>
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
          </div>
        )}
      </main>

    </div>
  )
}
