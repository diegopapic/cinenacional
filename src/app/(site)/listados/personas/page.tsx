// src/app/(site)/listados/personas/page.tsx

import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getPeople, getPeopleFilters } from '@/lib/queries/personas'
import type { PersonFilters } from '@/lib/queries/personas'
import PersonasFilterBar from '@/components/listados/personas/PersonasFilterBar'
import PersonasGrid from './PersonasGrid'
import ServerPagination from '@/components/shared/ServerPagination'
import { buildTitle, buildSubtitle } from '@/lib/people/personListUtils'
import type { PersonListFilters, PersonWithMovie } from '@/lib/people/personListTypes'
import type { ViewMode } from '@/lib/shared/listTypes'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

// ─── Helpers ─────────────────────────────────────────────────────

function parseSearchParams(raw: Record<string, string | string[] | undefined>): {
  filters: PersonFilters
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

  const validSortBy = ['id', 'lastName', 'birthDate', 'deathDate', 'movieCount'] as const
  const rawSortBy = get('sortBy')
  const sortBy = rawSortBy && (validSortBy as readonly string[]).includes(rawSortBy)
    ? rawSortBy
    : 'id'

  const rawSortOrder = get('sortOrder')
  const defaultOrder = (sortBy === 'lastName' || sortBy === 'birthDate') ? 'asc' : 'desc'
  const sortOrder = rawSortOrder === 'asc' || rawSortOrder === 'desc'
    ? rawSortOrder
    : defaultOrder

  const rawView = get('view')
  const view: ViewMode = rawView === 'detailed' ? 'detailed' : 'compact'

  return {
    filters: {
      search: get('search'),
      gender: get('gender'),
      birthLocationId: parseNum('birthLocationId'),
      deathLocationId: parseNum('deathLocationId'),
      nationalityId: parseNum('nationalityId'),
      roleId: get('roleId'),
      birthYearFrom: parseNum('birthYearFrom'),
      birthYearTo: parseNum('birthYearTo'),
      deathYearFrom: parseNum('deathYearFrom'),
      deathYearTo: parseNum('deathYearTo'),
      sortBy,
      sortOrder,
    },
    page: Math.max(1, parseInt(get('page') || '1', 10) || 1),
    view,
  }
}

/** Adapt PersonFilters to PersonListFilters for buildTitle/buildSubtitle */
function toListFilters(filters: PersonFilters): PersonListFilters {
  return {
    search: filters.search || '',
    gender: (filters.gender || '') as PersonListFilters['gender'],
    birthLocationId: (filters.birthLocationId || '') as number | '',
    deathLocationId: (filters.deathLocationId || '') as number | '',
    nationalityId: (filters.nationalityId || '') as number | '',
    roleId: (filters.roleId || '') as PersonListFilters['roleId'],
    birthYearFrom: (filters.birthYearFrom || '') as number | '',
    birthYearTo: (filters.birthYearTo || '') as number | '',
    deathYearFrom: (filters.deathYearFrom || '') as number | '',
    deathYearTo: (filters.deathYearTo || '') as number | '',
    sortBy: (filters.sortBy || 'id') as PersonListFilters['sortBy'],
    sortOrder: filters.sortOrder,
  }
}

// ─── Metadata ────────────────────────────────────────────────────

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const raw = await searchParams
  const { filters } = parseSearchParams(raw)
  const filterOptions = await getPeopleFilters()

  const filtersForTitle = toListFilters(filters)
  const title = buildTitle(filtersForTitle, filterOptions)

  return {
    title: `${title} — cinenacional.com`,
    description: 'Explorá el archivo completo de personas del cine argentino. Filtrá por rol, nacionalidad, lugar de nacimiento y más.',
    alternates: { canonical: 'https://cinenacional.com/listados/personas' },
  }
}

// ─── Page ────────────────────────────────────────────────────────

export default async function PersonasPage({ searchParams }: PageProps) {
  const raw = await searchParams
  const { filters, page, view } = parseSearchParams(raw)

  const limit = view === 'detailed' ? 12 : 60

  const [peopleData, filterOptions] = await Promise.all([
    getPeople(filters, page, limit),
    getPeopleFilters(),
  ])

  const { data: people, totalCount, totalPages } = peopleData

  const filtersForTitle = toListFilters(filters)
  const title = buildTitle(filtersForTitle, filterOptions)
  const subtitle = buildSubtitle(filtersForTitle)

  const buildPageHref = (p: number) => {
    const params = new URLSearchParams()

    if (filters.search) params.set('search', filters.search)
    if (filters.gender) params.set('gender', filters.gender)
    if (filters.birthLocationId) params.set('birthLocationId', String(filters.birthLocationId))
    if (filters.deathLocationId) params.set('deathLocationId', String(filters.deathLocationId))
    if (filters.nationalityId) params.set('nationalityId', String(filters.nationalityId))
    if (filters.roleId) params.set('roleId', String(filters.roleId))
    if (filters.birthYearFrom) params.set('birthYearFrom', String(filters.birthYearFrom))
    if (filters.birthYearTo) params.set('birthYearTo', String(filters.birthYearTo))
    if (filters.deathYearFrom) params.set('deathYearFrom', String(filters.deathYearFrom))
    if (filters.deathYearTo) params.set('deathYearTo', String(filters.deathYearTo))
    if (filters.sortBy && filters.sortBy !== 'id') params.set('sortBy', filters.sortBy)
    const defaultOrder = (filters.sortBy === 'lastName' || filters.sortBy === 'birthDate') ? 'asc' : 'desc'
    if (filters.sortOrder && filters.sortOrder !== defaultOrder) params.set('sortOrder', filters.sortOrder)
    if (view !== 'compact') params.set('view', view)
    if (p > 1) params.set('page', String(p))

    const qs = params.toString()
    return `/listados/personas${qs ? `?${qs}` : ''}`
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
          {totalCount.toLocaleString('es-AR')} persona{totalCount !== 1 ? 's' : ''}
        </p>
      )}

      <Suspense>
        <PersonasFilterBar
          filterOptions={filterOptions}
          activeFilters={filters}
          viewMode={view}
        />
      </Suspense>

      <PersonasGrid
        people={people as unknown as PersonWithMovie[]}
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
