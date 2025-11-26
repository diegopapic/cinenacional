// src/app/buscar/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Film, User, Calendar, Search, Loader2 } from 'lucide-react'
import { formatPartialDate } from '@/lib/shared/dateUtils'

interface SearchPageResult {
  movies: Array<{
    id: number
    slug: string
    title: string
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
    biography?: string
    _count?: {
      castRoles: number
      crewRoles: number
    }
  }>
  totalMovies: number
  totalPeople: number
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

  const getReleaseDate = (movie: any) => {
    if (!movie.releaseYear) return null
    return formatPartialDate({
      year: movie.releaseYear,
      month: movie.releaseMonth,
      day: movie.releaseDay
    })
  }

  const getBirthDate = (person: any) => {
    if (!person.birthYear) return null
    return formatPartialDate({
      year: person.birthYear,
      month: person.birthMonth,
      day: person.birthDay
    }, { monthFormat: 'short' })
  }

  const filteredMovies = results?.movies || []
  const filteredPeople = results?.people || []
  const showMovies = activeTab === 'all' || activeTab === 'movies'
  const showPeople = activeTab === 'all' || activeTab === 'people'

  if (!query) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center">
          <Search className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">
            Ingresa un término de búsqueda
          </h1>
          <p className="text-zinc-400">
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
        <h1 className="text-3xl font-bold text-white mb-2">
          Resultados de búsqueda
        </h1>
        <p className="text-zinc-400">
          Buscando: <span className="font-medium text-white">"{query}"</span>
        </p>
        {results && (
          <p className="text-sm text-zinc-500 mt-1">
            {results.totalMovies + results.totalPeople} resultados encontrados
            ({results.totalMovies} películas, {results.totalPeople} personas)
          </p>
        )}
      </div>

      {/* Tabs de filtrado */}
      <div className="border-b border-zinc-800 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('all')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'all'
                ? 'border-zinc-400 text-white'
                : 'border-transparent text-zinc-400 hover:text-white hover:border-zinc-600'
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
                ? 'border-zinc-400 text-white'
                : 'border-transparent text-zinc-400 hover:text-white hover:border-zinc-600'
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
                ? 'border-zinc-400 text-white'
                : 'border-transparent text-zinc-400 hover:text-white hover:border-zinc-600'
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
          <Loader2 className="w-8 h-8 animate-spin text-zinc-600 mr-3" />
          <span className="text-zinc-400">Buscando...</span>
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
                <h2 className="text-xl font-bold text-white mb-4">
                  Películas ({filteredMovies.length})
                </h2>
              )}
              <div className="grid gap-4">
                {filteredMovies.map((movie) => (
                  <Link
                    key={movie.id}
                    href={`/pelicula/${movie.slug}`}
                    className="bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors p-4 flex gap-4 group"
                  >
                    <div className="flex-shrink-0 w-20 h-28 bg-zinc-800 rounded overflow-hidden">
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
                          <Film className="w-8 h-8 text-zinc-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-zinc-300 transition-colors">
                        {movie.title}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-zinc-400 mb-2">
                        {getReleaseDate(movie) && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {getReleaseDate(movie)}
                          </span>
                        )}
                        {getDirectorName(movie) && (
                          <span>Dir: {getDirectorName(movie)}</span>
                        )}
                      </div>
                      {movie.synopsis && (
                        <p className="text-sm text-zinc-400 line-clamp-2">
                          {movie.synopsis}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Personas */}
          {showPeople && filteredPeople.length > 0 && (
            <div>
              {activeTab === 'all' && (
                <h2 className="text-xl font-bold text-white mb-4">
                  Personas ({filteredPeople.length})
                </h2>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                {filteredPeople.map((person) => (
                  <Link
                    key={person.id}
                    href={`/persona/${person.slug}`}
                    className="bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors p-4 flex gap-4 group"
                  >
                    <div className="flex-shrink-0 w-20 h-20 bg-zinc-800 rounded-full overflow-hidden">
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
                          <User className="w-8 h-8 text-zinc-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-zinc-300 transition-colors">
                        {getPersonName(person)}
                      </h3>
                      {getBirthDate(person) && (
                        <p className="text-sm text-zinc-400 mb-1">
                          n. {getBirthDate(person)}
                        </p>
                      )}
                      {person._count && (
                        <p className="text-xs text-zinc-500">
                          {person._count.castRoles > 0 && `${person._count.castRoles} actuaciones`}
                          {person._count.castRoles > 0 && person._count.crewRoles > 0 && ' • '}
                          {person._count.crewRoles > 0 && `${person._count.crewRoles} trabajos técnicos`}
                        </p>
                      )}
                      {person.biography && (
                        <p className="text-sm text-zinc-400 line-clamp-2 mt-2">
                          {person.biography}
                        </p>
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
          <Search className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            No se encontraron resultados
          </h2>
          <p className="text-zinc-400">
            No se encontraron películas ni personas que coincidan con "{query}"
          </p>
        </div>
      )}
    </div>
  )
}