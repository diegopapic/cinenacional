// src/app/(site)/listados/peliculas/page.tsx

import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getMovies, getMovieFilters } from '@/lib/queries/peliculas'
import type { MovieFilters } from '@/lib/queries/peliculas'
import PeliculasFilterBar from '@/components/listados/peliculas/PeliculasFilterBar'
import PeliculasGrid from './PeliculasGrid'
import ServerPagination from '@/components/shared/ServerPagination'
import { buildTitle, buildSubtitle } from '@/lib/movies/movieListUtils'
import type { ViewMode } from '@/lib/shared/listTypes'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

// ─── Helpers ─────────────────────────────────────────────────────

function parseSearchParams(raw: Record<string, string | string[] | undefined>): {
  filters: MovieFilters
  page: number
  view: ViewMode
} {
  const get = (key: string): string | undefined => {
    const v = raw[key]
    return typeof v === 'string' ? v : undefined
  }

  const parseNum = (key: string): number | undefined => {
    const v = get(key)
    if (!v) return undefined
    const n = parseInt(v, 10)
    return isNaN(n) || n <= 0 ? undefined : n
  }

  const validSortBy = ['id', 'title', 'releaseDate', 'duration', 'popularity'] as const
  const rawSortBy = get('sortBy')
  const sortBy = rawSortBy && (validSortBy as readonly string[]).includes(rawSortBy)
    ? rawSortBy
    : 'popularity'

  const rawSortOrder = get('sortOrder')
  const sortOrder = rawSortOrder === 'asc' || rawSortOrder === 'desc'
    ? rawSortOrder
    : (sortBy === 'title' ? 'asc' : 'desc')

  const rawView = get('view')
  const view: ViewMode = rawView === 'detailed' ? 'detailed' : 'compact'

  return {
    filters: {
      search: get('search'),
      soundType: get('soundType'),
      colorTypeId: parseNum('colorTypeId'),
      tipoDuracion: get('tipoDuracion'),
      countryId: parseNum('countryId'),
      genreId: parseNum('genreId'),
      ratingId: parseNum('ratingId'),
      releaseDateFrom: get('releaseDateFrom'),
      releaseDateTo: get('releaseDateTo'),
      productionYearFrom: parseNum('productionYearFrom'),
      productionYearTo: parseNum('productionYearTo'),
      sortBy,
      sortOrder,
    },
    page: Math.max(1, parseInt(get('page') || '1', 10) || 1),
    view,
  }
}

// ─── Metadata ────────────────────────────────────────────────────

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const raw = await searchParams
  const { filters } = parseSearchParams(raw)
  const filterOptions = await getMovieFilters()

  // Adapt filterOptions to the shape buildTitle expects (MovieFiltersDataResponse)
  const filtersDataForTitle = {
    soundTypes: filterOptions.soundTypes,
    colorTypes: filterOptions.colorTypes,
    durationTypes: filterOptions.durationTypes,
    countries: filterOptions.countries,
    genres: filterOptions.genres,
    ratings: filterOptions.ratings,
    stages: filterOptions.stages,
    years: filterOptions.years,
  }

  const title = buildTitle(
    {
      soundType: filters.soundType || '',
      colorTypeId: (filters.colorTypeId || '') as number | '',
      tipoDuracion: filters.tipoDuracion || '',
      countryId: (filters.countryId || '') as number | '',
      genreId: (filters.genreId || '') as number | '',
      ratingId: (filters.ratingId || '') as number | '',
      releaseDateFrom: filters.releaseDateFrom || '',
      releaseDateTo: filters.releaseDateTo || '',
      productionYearFrom: (filters.productionYearFrom || '') as number | '',
      productionYearTo: (filters.productionYearTo || '') as number | '',
      sortBy: (filters.sortBy || 'popularity') as 'popularity',
      sortOrder: filters.sortOrder,
    },
    filtersDataForTitle,
  )

  return {
    title: `${title} — cinenacional.com`,
    description: 'Explorá el catálogo completo de películas argentinas. Filtrá por género, año, duración, país y más.',
    alternates: { canonical: 'https://cinenacional.com/listados/peliculas' },
  }
}

// ─── Page ────────────────────────────────────────────────────────

export default async function PeliculasPage({ searchParams }: PageProps) {
  const raw = await searchParams
  const { filters, page, view } = parseSearchParams(raw)

  const limit = view === 'detailed' ? 12 : 60

  const [moviesData, filterOptions] = await Promise.all([
    getMovies(filters, page, limit),
    getMovieFilters(),
  ])

  const { data: movies, totalCount, totalPages } = moviesData

  // Build title using the same logic as the old client component
  const filtersDataForTitle = {
    soundTypes: filterOptions.soundTypes,
    colorTypes: filterOptions.colorTypes,
    durationTypes: filterOptions.durationTypes,
    countries: filterOptions.countries,
    genres: filterOptions.genres,
    ratings: filterOptions.ratings,
    stages: filterOptions.stages,
    years: filterOptions.years,
  }

  const filtersForTitle = {
    soundType: filters.soundType || '',
    colorTypeId: (filters.colorTypeId || '') as number | '',
    tipoDuracion: filters.tipoDuracion || '',
    countryId: (filters.countryId || '') as number | '',
    genreId: (filters.genreId || '') as number | '',
    ratingId: (filters.ratingId || '') as number | '',
    releaseDateFrom: filters.releaseDateFrom || '',
    releaseDateTo: filters.releaseDateTo || '',
    productionYearFrom: (filters.productionYearFrom || '') as number | '',
    productionYearTo: (filters.productionYearTo || '') as number | '',
    sortBy: (filters.sortBy || 'popularity') as 'popularity',
    sortOrder: filters.sortOrder,
  }

  const title = buildTitle(filtersForTitle, filtersDataForTitle)
  const subtitle = buildSubtitle(filtersForTitle)

  const buildPageHref = (p: number) => {
    const params = new URLSearchParams()

    if (filters.search) params.set('search', filters.search)
    if (filters.soundType) params.set('soundType', filters.soundType)
    if (filters.colorTypeId) params.set('colorTypeId', String(filters.colorTypeId))
    if (filters.tipoDuracion) params.set('tipoDuracion', filters.tipoDuracion)
    if (filters.countryId) params.set('countryId', String(filters.countryId))
    if (filters.genreId) params.set('genreId', String(filters.genreId))
    if (filters.ratingId) params.set('ratingId', String(filters.ratingId))
    if (filters.releaseDateFrom) params.set('releaseDateFrom', filters.releaseDateFrom)
    if (filters.releaseDateTo) params.set('releaseDateTo', filters.releaseDateTo)
    if (filters.productionYearFrom) params.set('productionYearFrom', String(filters.productionYearFrom))
    if (filters.productionYearTo) params.set('productionYearTo', String(filters.productionYearTo))
    if (filters.sortBy && filters.sortBy !== 'popularity') params.set('sortBy', filters.sortBy)
    if (filters.sortOrder && filters.sortOrder !== 'desc') params.set('sortOrder', filters.sortOrder)
    if (view !== 'compact') params.set('view', view)
    if (p > 1) params.set('page', String(p))

    const qs = params.toString()
    return `/listados/peliculas${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-12 lg:px-12">
      <h1 className="font-serif text-2xl tracking-tight md:text-3xl lg:text-4xl">
        {title}
      </h1>

      <p className="mt-1 text-[13px] text-muted-foreground/50 md:text-sm">
        {subtitle}
      </p>

      {totalCount > 0 && (
        <p className="mt-1 text-[12px] text-muted-foreground/40 md:text-[13px]">
          {totalCount.toLocaleString('es-AR')} película{totalCount !== 1 ? 's' : ''}
        </p>
      )}

      <Suspense>
        <PeliculasFilterBar
          filterOptions={filterOptions}
          activeFilters={filters}
          viewMode={view}
        />
      </Suspense>

      <PeliculasGrid
        movies={movies}
        isLoading={false}
        viewMode={view}
      />

      <ServerPagination
        currentPage={page}
        totalPages={totalPages}
        buildHref={buildPageHref}
      />
    </div>
  )
}
