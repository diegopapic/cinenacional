// src/app/(site)/buscar/page.tsx

'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import Image from 'next/image'
import cloudinaryLoader from '@/lib/images/cloudinaryLoader'
import { Search, Loader2, User } from 'lucide-react'
import { getPersonPhotoUrl } from '@/lib/images/imageUtils'
import {
  formatDuration,
  formatReleaseDate,
  getDisplayYear,
  getDurationTypeLabel,
  getStageLabel
} from '@/lib/movies/movieListUtils'
import { formatPartialDate } from '@/lib/people/personListUtils'
import type { MovieListItem } from '@/lib/movies/movieListTypes'

// ============ Tipos de respuesta de la API ============

interface SearchMovieResult {
  id: number
  slug: string
  title: string
  year: number | null
  releaseYear: number | null
  releaseMonth: number | null
  releaseDay: number | null
  posterUrl: string | null
  synopsis: string | null
  duration: number | null
  tipoDuracion: string | null
  stage: string
  soundType: string | null
  directors: Array<{ id: number; slug: string; name: string }>
  genres: Array<{ id: number; name: string }>
  countries: Array<{ id: number; name: string }>
}

interface SearchPersonResult {
  id: number
  slug: string
  firstName: string | null
  lastName: string | null
  photoUrl: string | null
  gender: string | null
  birthYear: number | null
  birthMonth: number | null
  birthDay: number | null
  deathYear: number | null
  deathMonth: number | null
  deathDay: number | null
  birthLocationPath: string | null
  deathLocationPath: string | null
  movieCount: number
  featuredMovie: {
    id: number
    slug: string
    title: string
    year: number | null
    role: string
  } | null
}

interface SearchPageResult {
  movies: SearchMovieResult[]
  people: SearchPersonResult[]
  totalMovies: number
  totalPeople: number
}

// ============ Helpers ============

/** Resalta todas las ocurrencias del query en el texto */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query || query.length < 2) return <>{text}</>

  const terms = query.toLowerCase().trim().split(/\s+/).filter(t => t.length > 0)
  // Escapar regex chars y construir pattern que matchee cualquier término
  const escaped = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const pattern = new RegExp(`(${escaped.join('|')})`, 'gi')

  const parts = text.split(pattern)
  return (
    <>
      {parts.map((part, i) =>
        pattern.test(part) ? (
          <span key={i} className="text-accent">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

function formatPersonName(person: { firstName?: string | null; lastName?: string | null }): string {
  return [person.firstName, person.lastName].filter(Boolean).join(' ') || 'Sin nombre'
}

function formatCoproduction(countries: Array<{ id: number; name: string }>): string | null {
  const others = countries.filter(c => c.name.toLowerCase() !== 'argentina')
  if (others.length === 0) return null
  if (others.length === 1) return others[0].name
  if (others.length === 2) return `${others[0].name} y ${others[1].name}`
  const last = others[others.length - 1].name
  const rest = others.slice(0, -1).map(c => c.name).join(', ')
  return `${rest} y ${last}`
}

function getActorLabel(gender: string | null) {
  if (gender === 'FEMALE') return 'Actriz'
  if (gender === 'MALE') return 'Actor'
  return 'Actor/Actriz'
}

function getFeaturedRole(person: SearchPersonResult) {
  if (!person.featuredMovie) return null
  if (person.featuredMovie.role === 'Actor') return getActorLabel(person.gender)
  return person.featuredMovie.role
}

// ============ Componentes de resultado ============

function MovieResult({ movie, query }: { movie: SearchMovieResult; query: string }) {
  // Adaptar al tipo que espera getDisplayYear
  const displayYear = getDisplayYear(movie as unknown as MovieListItem)
  const releaseDateFormatted = formatReleaseDate(movie.releaseYear, movie.releaseMonth, movie.releaseDay)
  const durationFormatted = formatDuration(movie.duration)
  const durationTypeLabel = !movie.duration ? getDurationTypeLabel(movie.tipoDuracion) : ''
  const stageLabel = movie.stage && movie.stage !== 'COMPLETA' ? getStageLabel(movie.stage) : null
  const coproductionText = movie.countries.length > 1 ? formatCoproduction(movie.countries) : null

  return (
    <Link
      href={`/pelicula/${movie.slug}`}
      className="group flex gap-4 border-b border-border/10 py-4 last:border-b-0 md:gap-5"
    >
      {/* Poster */}
      <div className="relative aspect-2/3 w-20 shrink-0 overflow-hidden rounded-xs md:w-24">
        {movie.posterUrl ? (
          <Image
            loader={cloudinaryLoader}
            fill
            src={movie.posterUrl}
            alt={movie.title}
            sizes="96px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted/30">
            <svg
              className="h-8 w-8 text-muted-foreground/20"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
              />
            </svg>
          </div>
        )}
        <div className="absolute inset-0 border border-foreground/4" />
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        {/* Title + Year + Stage badge */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <p className="text-[14px] font-medium leading-snug text-foreground/80 transition-colors group-hover:text-accent md:text-[15px]">
            <HighlightMatch text={movie.title} query={query} />
            {displayYear && (
              <span className="ml-1.5 text-[12px] font-normal tabular-nums text-muted-foreground/40">
                ({displayYear})
              </span>
            )}
          </p>
          {stageLabel && (
            <span className="rounded-xs bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-widest text-amber-400/80">
              {stageLabel}
            </span>
          )}
        </div>

        {/* Directors */}
        {movie.directors.length > 0 && (
          <p className="text-[12px] text-muted-foreground/50">
            Dir: {movie.directors.map(d => d.name).join(', ')}
          </p>
        )}

        {/* Metadata row: genres, duration, duration type */}
        {(movie.genres.length > 0 || durationFormatted || durationTypeLabel) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground/40">
            {movie.genres.length > 0 && (
              <span>{movie.genres.map(g => g.name).join(', ')}</span>
            )}
            {durationFormatted && <span>{durationFormatted}</span>}
            {durationTypeLabel && <span>{durationTypeLabel}</span>}
          </div>
        )}

        {/* Release date */}
        {releaseDateFormatted && (
          <p className="text-[11px] text-muted-foreground/40">
            Estreno en Argentina: {releaseDateFormatted}
          </p>
        )}

        {/* Co-production */}
        {coproductionText && (
          <p className="text-[11px] text-muted-foreground/35">
            Coproducción con {coproductionText}
          </p>
        )}

        {/* Synopsis */}
        {movie.synopsis && (
          <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground/45">
            {movie.synopsis}
          </p>
        )}
      </div>
    </Link>
  )
}

function PersonResult({ person, query }: { person: SearchPersonResult; query: string }) {
  const personName = formatPersonName(person)
  const photoUrl = getPersonPhotoUrl(person.photoUrl, 'sm')

  const birthDateFormatted = formatPartialDate(person.birthYear, person.birthMonth, person.birthDay)
  const isDeceased = !!person.deathYear

  return (
    <div className="flex gap-4 border-b border-border/10 py-4 last:border-b-0 md:gap-5">
      {/* Portrait */}
      <Link href={`/persona/${person.slug}`} className="group relative h-28 w-20 shrink-0 overflow-hidden rounded-xs md:h-32 md:w-24">
        {photoUrl ? (
          <Image
            loader={cloudinaryLoader}
            src={photoUrl}
            alt={personName}
            fill
            sizes="(min-width: 768px) 96px, 80px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted/50">
            <User className="h-8 w-8 text-muted-foreground/30" />
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        {/* Name */}
        <h3 className="text-[14px] font-medium leading-snug md:text-[15px]">
          <Link href={`/persona/${person.slug}`} className="text-foreground/80 transition-colors hover:text-accent">
            <HighlightMatch text={personName} query={query} />
          </Link>
        </h3>

        {/* Birth */}
        {(birthDateFormatted || person.birthLocationPath) && (
          <p className="text-[12px] leading-snug text-muted-foreground/50">
            {birthDateFormatted && <span>Naci&oacute; el {birthDateFormatted}</span>}
            {person.birthLocationPath && (
              <span className="text-muted-foreground/40">
                {birthDateFormatted ? ' en ' : ''}{person.birthLocationPath}
              </span>
            )}
          </p>
        )}

        {/* Death */}
        {isDeceased && (
          <p className="text-[12px] leading-snug text-muted-foreground/50">
            Falleci&oacute; el {formatPartialDate(person.deathYear, person.deathMonth, person.deathDay)}
            {person.deathLocationPath && (
              <span className="text-muted-foreground/40"> en {person.deathLocationPath}</span>
            )}
          </p>
        )}

        {/* Featured movie */}
        {person.featuredMovie && (
          <p className="text-[12px] text-muted-foreground/40">
            {getFeaturedRole(person)}
            {' en '}
            <Link href={`/pelicula/${person.featuredMovie.slug}`} className="text-foreground/80 transition-colors hover:text-accent">
              {person.featuredMovie.title}
            </Link>
            {person.featuredMovie.year && (
              <span> ({person.featuredMovie.year})</span>
            )}
          </p>
        )}

        {/* Movie count */}
        {person.movieCount > 0 && (
          <p className="text-[11px] text-muted-foreground/35">
            {person.movieCount} pel&iacute;cula{person.movieCount !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  )
}

// ============ Página principal ============

export default function SearchPage() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''
  const [activeTab, setActiveTab] = useState<'all' | 'movies' | 'people'>('all')

  const { data: results = null, isLoading: loading, error: queryError } = useQuery<SearchPageResult>({
    queryKey: ['search-full', query],
    queryFn: async () => {
      const response = await fetch(`/api/search/full?q=${encodeURIComponent(query)}`)
      if (!response.ok) throw new Error('Error en la búsqueda')
      return response.json()
    },
    enabled: !!query,
  })

  const error = queryError ? 'Error al realizar la búsqueda. Por favor, intenta de nuevo.' : null

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
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-2xl tracking-tight text-foreground md:text-3xl lg:text-4xl">
          Resultados de búsqueda
        </h1>
        <p className="text-muted-foreground mt-2">
          Buscando: <span className="font-medium text-foreground">&quot;{query}&quot;</span>
        </p>
        {results && (
          <p className="text-sm text-muted-foreground/60 mt-1">
            {results.totalMovies + results.totalPeople} resultados encontrados
            ({results.totalMovies} películas, {results.totalPeople} personas)
          </p>
        )}
      </div>

      {/* Tabs */}
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

      {/* Content */}
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
              <div className="grid grid-cols-1 gap-0 md:grid-cols-2 md:gap-x-8">
                {filteredMovies.map((movie) => (
                  <MovieResult key={movie.id} movie={movie} query={query} />
                ))}
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
              <div className="grid grid-cols-1 gap-0 md:grid-cols-2 md:gap-x-8">
                {filteredPeople.map((person) => (
                  <PersonResult key={person.id} person={person} query={query} />
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
            No se encontraron películas ni personas que coincidan con &quot;{query}&quot;
          </p>
        </div>
      )}
    </div>
  )
}
