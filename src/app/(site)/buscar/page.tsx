// src/app/buscar/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Film, User, Calendar, Search, Loader2 } from 'lucide-react'
import { formatPartialDate } from '@/lib/shared/dateUtils'
import DOMPurify from 'dompurify'

/**
 * Sanitiza HTML permitiendo solo tags de formato básico.
 * Útil para mostrar previews con itálicas, negritas, etc.
 */
function sanitizeHtml(html: string): string {
  if (!html) return ''
  if (typeof window === 'undefined') {
    // Fallback para SSR: remover tags peligrosos pero mantener formato
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
  }
  return DOMPurify.sanitize(html, { 
    ALLOWED_TAGS: ['i', 'em', 'b', 'strong', 'br'],
    ALLOWED_ATTR: []
  })
}

interface SearchPageResult {
  movies: Array<{
    id: number
    slug: string
    title: string
    year?: number
    releaseYear?: number
    releaseMonth?: number
    releaseDay?: number
    posterUrl?: string
    synopsis?: string
    directors?: Array<{
      person: {
        firstName?: string
        lastName?: string
      }
    }>
  }>
  people: Array<{
    id: number
    slug: string
    firstName?: string
    lastName?: string
    photoUrl?: string
    birthYear?: number
    birthMonth?: number
    birthDay?: number
    deathYear?: number
    deathMonth?: number
    deathDay?: number
    biography?: string
    _count?: {
      castRoles: number
      crewRoles: number
    }
  }>
  totalMovies: number
  totalPeople: number
}

/**
 * Obtiene el año a mostrar para una película.
 * Prioridad: año de producción (year) > año de estreno (releaseYear)
 * Retorna null si ambos están vacíos o son 0
 */
function getDisplayYear(movie: { year?: number; releaseYear?: number }): number | null {
  // Prioridad 1: año de producción
  if (movie.year && movie.year > 0) {
    return movie.year
  }
  
  // Prioridad 2: año de estreno
  if (movie.releaseYear && movie.releaseYear > 0) {
    return movie.releaseYear
  }
  
  // Ninguno disponible
  return null
}

export default function SearchPage() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''
  const [results, setResults] = useState<SearchPageResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'movies' | 'people'>('all')

  useEffect(() => {
    if (!query) return

    const searchFullResults = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/search/full?q=${encodeURIComponent(query)}`)
        
        if (!response.ok) {
          throw new Error('Error en la búsqueda')
        }

        const data = await response.json()
        setResults(data)
      } catch (err) {
        setError('Error al realizar la búsqueda. Por favor, intenta de nuevo.')
        console.error('Search error:', err)
      } finally {
        setLoading(false)
      }
    }

    searchFullResults()
  }, [query])

  const getDirectorName = (movie: any) => {
    const director = movie.directors?.[0]?.person
    if (!director) return null
    return `${director.firstName || ''} ${director.lastName || ''}`.trim()
  }

  const getPersonName = (person: any) => {
    return `${person.firstName || ''} ${person.lastName || ''}`.trim()
  }

  /**
   * Formatea las fechas de vida de una persona.
   * - Solo nacimiento: "n. 16 de enero de 1957"
   * - Nacimiento y muerte: "(19 de abril de 1922-12 de diciembre de 2012)"
   * - Solo muerte: "m. 26 de septiembre de 1943"
   */
  const getLifeDates = (person: any): string | null => {
    const hasBirth = !!person.birthYear
    const hasDeath = !!person.deathYear
    
    if (!hasBirth && !hasDeath) return null
    
    const formatDate = (year?: number, month?: number, day?: number): string => {
      return formatPartialDate(
        { year: year ?? null, month: month ?? null, day: day ?? null },
        { monthFormat: 'long' }
      )
    }
    
    if (hasBirth && hasDeath) {
      // Caso: nacimiento y muerte
      const birthStr = formatDate(person.birthYear, person.birthMonth, person.birthDay)
      const deathStr = formatDate(person.deathYear, person.deathMonth, person.deathDay)
      return `(${birthStr}-${deathStr})`
    } else if (hasBirth) {
      // Caso: solo nacimiento
      const birthStr = formatDate(person.birthYear, person.birthMonth, person.birthDay)
      return `n. ${birthStr}`
    } else {
      // Caso: solo muerte
      const deathStr = formatDate(person.deathYear, person.deathMonth, person.deathDay)
      return `m. ${deathStr}`
    }
  }

  const filteredMovies = results?.movies || []
  const filteredPeople = results?.people || []
  const showMovies = activeTab === 'all' || activeTab === 'movies'
  const showPeople = activeTab === 'all' || activeTab === 'people'

  if (!query) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center">
          <Search className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" />
          <h1 className="font-serif text-2xl tracking-tight text-foreground md:text-3xl">
            Ingresa un término de búsqueda
          </h1>
          <p className="text-muted-foreground mt-2">
            Busca películas y personas del cine argentino
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header de búsqueda */}
      <div className="mb-8">
        <h1 className="font-serif text-2xl tracking-tight text-foreground md:text-3xl lg:text-4xl">
          Resultados de búsqueda
        </h1>
        <p className="text-muted-foreground mt-2">
          Buscando: <span className="font-medium text-foreground">"{query}"</span>
        </p>
        {results && (
          <p className="text-sm text-muted-foreground/60 mt-1">
            {results.totalMovies + results.totalPeople} resultados encontrados
            ({results.totalMovies} películas, {results.totalPeople} personas)
          </p>
        )}
      </div>

      {/* Tabs de filtrado */}
      <div className="border-b border-border/40 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('all')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'all'
                ? 'border-foreground/60 text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            Todos
            {results && (
              <span className="ml-2 text-xs">
                ({results.totalMovies + results.totalPeople})
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('movies')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'movies'
                ? 'border-foreground/60 text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            Películas
            {results && (
              <span className="ml-2 text-xs">({results.totalMovies})</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('people')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'people'
                ? 'border-foreground/60 text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            Personas
            {results && (
              <span className="ml-2 text-xs">({results.totalPeople})</span>
            )}
          </button>
        </nav>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground/40 mr-3" />
          <span className="text-muted-foreground">Buscando...</span>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-500">{error}</p>
        </div>
      ) : results && (results.totalMovies > 0 || results.totalPeople > 0) ? (
        <div className="space-y-8">
          {/* Películas */}
          {showMovies && filteredMovies.length > 0 && (
            <div>
              {activeTab === 'all' && (
                <h2 className="font-serif text-xl md:text-2xl tracking-tight text-foreground mb-4">
                  Películas ({filteredMovies.length})
                </h2>
              )}
              <div className="grid gap-4">
                {filteredMovies.map((movie) => {
                  const displayYear = getDisplayYear(movie)
                  
                  return (
                    <Link
                      key={movie.id}
                      href={`/pelicula/${movie.slug}`}
                      className="bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors p-4 flex gap-4 group"
                    >
                      <div className="flex-shrink-0 w-20 h-28 bg-muted/50 rounded overflow-hidden">
                        {movie.posterUrl ? (
                          <Image
                            src={movie.posterUrl}
                            alt={movie.title}
                            width={80}
                            height={112}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Film className="w-8 h-8 text-muted-foreground/40" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-medium text-foreground mb-1 group-hover:text-foreground/80 transition-colors">
                          {movie.title}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                          {displayYear && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {displayYear}
                            </span>
                          )}
                          {getDirectorName(movie) && (
                            <span>Dir: {getDirectorName(movie)}</span>
                          )}
                        </div>
                        {movie.synopsis && (
                          <p
                            className="text-sm text-muted-foreground line-clamp-2"
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(movie.synopsis) }}
                          />
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Personas */}
          {showPeople && filteredPeople.length > 0 && (
            <div>
              {activeTab === 'all' && (
                <h2 className="font-serif text-xl md:text-2xl tracking-tight text-foreground mb-4">
                  Personas ({filteredPeople.length})
                </h2>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                {filteredPeople.map((person) => (
                  <Link
                    key={person.id}
                    href={`/persona/${person.slug}`}
                    className="bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors p-4 flex gap-4 group"
                  >
                    <div className="flex-shrink-0 w-20 h-20 bg-muted/50 rounded-full overflow-hidden">
                      {person.photoUrl ? (
                        <Image
                          src={person.photoUrl}
                          alt={getPersonName(person)}
                          width={80}
                          height={80}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-8 h-8 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-foreground mb-1 group-hover:text-foreground/80 transition-colors">
                        {getPersonName(person)}
                      </h3>
                      {getLifeDates(person) && (
                        <p className="text-sm text-muted-foreground mb-1">
                          {getLifeDates(person)}
                        </p>
                      )}
                      {person._count && (
                        <p className="text-xs text-muted-foreground/60">
                          {person._count.castRoles > 0 && `${person._count.castRoles} actuaciones`}
                          {person._count.castRoles > 0 && person._count.crewRoles > 0 && ' • '}
                          {person._count.crewRoles > 0 && `${person._count.crewRoles} trabajos técnicos`}
                        </p>
                      )}
                      {person.biography && (
                        <p
                          className="text-sm text-muted-foreground line-clamp-2 mt-2"
                          dangerouslySetInnerHTML={{ __html: sanitizeHtml(person.biography) }}
                        />
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <Search className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" />
          <h2 className="font-serif text-xl md:text-2xl tracking-tight text-foreground mb-2">
            No se encontraron resultados
          </h2>
          <p className="text-muted-foreground">
            No se encontraron películas ni personas que coincidan con "{query}"
          </p>
        </div>
      )}
    </div>
  )
}