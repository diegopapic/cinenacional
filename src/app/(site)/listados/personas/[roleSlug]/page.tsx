// src/app/(site)/listados/personas/[roleSlug]/page.tsx
// SEO-friendly routes for specific roles, e.g. /listados/personas/actores

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { getPeople, getPeopleFilters } from '@/lib/queries/personas'
import type { PersonFilters } from '@/lib/queries/personas'
import PersonasFilterBar from '@/components/listados/personas/PersonasFilterBar'
import PersonasGrid from '../PersonasGrid'
import ServerPagination from '@/components/shared/ServerPagination'
import { buildSubtitle } from '@/lib/people/personListUtils'
import type { PersonListFilters, PersonWithMovie } from '@/lib/people/personListTypes'
import type { ViewMode } from '@/lib/shared/listTypes'
import { ROLE_SLUG_MAP, ROLE_SLUGS } from '@/lib/people/roleSlugMap'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ roleSlug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

// ─── Static params for known slugs ─────────────────────────────

export function generateStaticParams() {
  return ROLE_SLUGS.map((slug) => ({ roleSlug: slug }))
}

// ─── Helpers ─────────────────────────────────────────────────────

function parseSearchParams(raw: Record<string, string | string[] | undefined>): {
  filters: Omit<PersonFilters, 'roleId'>
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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { roleSlug } = await params
  const config = ROLE_SLUG_MAP[roleSlug]
  if (!config) return {}

  return {
    title: `${config.title} del cine argentino — cinenacional.com`,
    description: config.description,
    alternates: { canonical: `https://cinenacional.com/listados/personas/${roleSlug}` },
  }
}

// ─── Page ────────────────────────────────────────────────────────

export default async function RolePersonasPage({ params, searchParams }: PageProps) {
  const { roleSlug } = await params
  const config = ROLE_SLUG_MAP[roleSlug]
  if (!config) notFound()

  const raw = await searchParams
  const { filters: baseFilters, page, view } = parseSearchParams(raw)

  // Merge the role from the slug into the filters
  const filters: PersonFilters = { ...baseFilters, roleId: config.roleId }

  const limit = view === 'detailed' ? 12 : 60

  const [peopleData, filterOptions] = await Promise.all([
    getPeople(filters, page, limit),
    getPeopleFilters(),
  ])

  const { data: people, totalCount, totalPages } = peopleData

  const filtersForTitle = toListFilters(filters)
  const subtitle = buildSubtitle(filtersForTitle)

  const basePath = `/listados/personas/${roleSlug}`

  const buildPageHref = (p: number) => {
    const params = new URLSearchParams()

    if (baseFilters.search) params.set('search', baseFilters.search)
    if (baseFilters.gender) params.set('gender', baseFilters.gender)
    if (baseFilters.birthLocationId) params.set('birthLocationId', String(baseFilters.birthLocationId))
    if (baseFilters.deathLocationId) params.set('deathLocationId', String(baseFilters.deathLocationId))
    if (baseFilters.nationalityId) params.set('nationalityId', String(baseFilters.nationalityId))
    // roleId NOT included — it's in the URL path
    if (baseFilters.birthYearFrom) params.set('birthYearFrom', String(baseFilters.birthYearFrom))
    if (baseFilters.birthYearTo) params.set('birthYearTo', String(baseFilters.birthYearTo))
    if (baseFilters.deathYearFrom) params.set('deathYearFrom', String(baseFilters.deathYearFrom))
    if (baseFilters.deathYearTo) params.set('deathYearTo', String(baseFilters.deathYearTo))
    if (baseFilters.sortBy && baseFilters.sortBy !== 'id') params.set('sortBy', baseFilters.sortBy)
    const defaultOrder = (baseFilters.sortBy === 'lastName' || baseFilters.sortBy === 'birthDate') ? 'asc' : 'desc'
    if (baseFilters.sortOrder && baseFilters.sortOrder !== defaultOrder) params.set('sortOrder', baseFilters.sortOrder)
    if (view !== 'compact') params.set('view', view)
    if (p > 1) params.set('page', String(p))

    const qs = params.toString()
    return `${basePath}${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-12 lg:px-12">
      <h1 className="font-serif text-2xl tracking-tight md:text-3xl lg:text-4xl">
        {config.title} del cine argentino
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
          basePath={basePath}
          presetRoleId={config.roleId}
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
