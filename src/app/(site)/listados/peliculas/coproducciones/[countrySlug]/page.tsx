// src/app/(site)/listados/peliculas/coproducciones/[countrySlug]/page.tsx
// SEO-friendly routes for coproductions with full filters + sort + view toggle.

import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getMovies, getMovieFilters } from '@/lib/queries/peliculas'
import type { MovieFilters } from '@/lib/queries/peliculas'
import PeliculasFilterBar from '@/components/listados/peliculas/PeliculasFilterBar'
import PeliculasGrid from '../../PeliculasGrid'
import ServerPagination from '@/components/shared/ServerPagination'
import { buildSubtitle } from '@/lib/movies/movieListUtils'
import type { ViewMode } from '@/lib/shared/listTypes'
import { COUNTRY_SLUG_MAP, COUNTRY_SLUGS } from '@/lib/movies/countrySlugMap'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ countrySlug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

// ─── Static params ──────────────────────────────────────────────

export function generateStaticParams() {
  return COUNTRY_SLUGS.map((slug) => ({ countrySlug: slug }))
}

// ─── Helpers ─────────────────────────────────────────────────────

function parseSearchParams(raw: Record<string, string | string[] | undefined>): {
  filters: Omit<MovieFilters, 'countryId'>
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
      // countryId excluded — comes from slug
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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { countrySlug } = await params
  const config = COUNTRY_SLUG_MAP[countrySlug]
  if (!config) return {}

  return {
    title: `Coproducciones argentino-${config.demonym} — cinenacional.com`,
    description: `Listado completo de coproducciones entre Argentina y ${config.name}. Filtrá por género, año, duración y más.`,
    alternates: { canonical: `https://cinenacional.com/listados/peliculas/coproducciones/${countrySlug}` },
  }
}

// ─── Page ────────────────────────────────────────────────────────

export default async function CoproductionCountryPage({ params, searchParams }: PageProps) {
  const { countrySlug } = await params
  const config = COUNTRY_SLUG_MAP[countrySlug]
  if (!config) notFound()

  const raw = await searchParams
  const { filters: baseFilters, page, view } = parseSearchParams(raw)

  // Merge the country from the slug into the filters
  const filters: MovieFilters = { ...baseFilters, countryId: config.countryId }

  const limit = view === 'detailed' ? 12 : 60

  const [moviesData, filterOptions] = await Promise.all([
    getMovies(filters, page, limit),
    getMovieFilters(),
  ])

  const { data: movies, totalCount, totalPages } = moviesData

  const filtersForSubtitle = {
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
  const subtitle = buildSubtitle(filtersForSubtitle)

  const basePath = `/listados/peliculas/coproducciones/${countrySlug}`

  const buildPageHref = (p: number) => {
    const params = new URLSearchParams()

    if (baseFilters.search) params.set('search', baseFilters.search)
    if (baseFilters.soundType) params.set('soundType', baseFilters.soundType)
    if (baseFilters.colorTypeId) params.set('colorTypeId', String(baseFilters.colorTypeId))
    if (baseFilters.tipoDuracion) params.set('tipoDuracion', baseFilters.tipoDuracion)
    // countryId NOT included — it's in the URL path
    if (baseFilters.genreId) params.set('genreId', String(baseFilters.genreId))
    if (baseFilters.ratingId) params.set('ratingId', String(baseFilters.ratingId))
    if (baseFilters.releaseDateFrom) params.set('releaseDateFrom', baseFilters.releaseDateFrom)
    if (baseFilters.releaseDateTo) params.set('releaseDateTo', baseFilters.releaseDateTo)
    if (baseFilters.productionYearFrom) params.set('productionYearFrom', String(baseFilters.productionYearFrom))
    if (baseFilters.productionYearTo) params.set('productionYearTo', String(baseFilters.productionYearTo))
    if (baseFilters.sortBy && baseFilters.sortBy !== 'popularity') params.set('sortBy', baseFilters.sortBy)
    const defaultOrder = baseFilters.sortBy === 'title' ? 'asc' : 'desc'
    if (baseFilters.sortOrder && baseFilters.sortOrder !== defaultOrder) params.set('sortOrder', baseFilters.sortOrder)
    if (view !== 'compact') params.set('view', view)
    if (p > 1) params.set('page', String(p))

    const qs = params.toString()
    return `${basePath}${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-12 lg:px-12">
      <h1 className="font-serif text-2xl tracking-tight md:text-3xl lg:text-4xl">
        Coproducciones argentino-{config.demonym}
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
          basePath={basePath}
          presetCountryId={config.countryId}
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
