// src/app/listados/obituarios/page.tsx — Server Component
import { Metadata } from 'next'
import { getDeathYears, getObituarios } from '@/lib/queries/obituarios'
import ObituariosYearSelector from '@/components/listados/obituarios/ObituariosYearSelector'
import ObituariosGrid from '@/app/(site)/listados/obituarios/ObituariosGrid'
import ServerPagination from '@/components/shared/ServerPagination'

export const revalidate = 3600 // 1h

// ── Metadata ────────────────────────────────────────────────────────────────

type PageProps = {
  searchParams: Promise<{ year?: string; page?: string }>
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { year: yearParam } = await searchParams
  const year = yearParam ? parseInt(yearParam) : new Date().getFullYear()

  return {
    title: `Obituarios de ${year} — CineNacional`,
    description: `Personas del cine argentino fallecidas en ${year}.`,
    alternates: { canonical: `https://cinenacional.com/listados/obituarios?year=${year}` },
  }
}

// ── Page ────────────────────────────────────────────────────────────────────

export default async function ObituariosPage({ searchParams }: PageProps) {
  const { year: yearParam, page: pageParam } = await searchParams

  const currentYear = new Date().getFullYear()
  const selectedYear = yearParam ? parseInt(yearParam) || currentYear : currentYear
  const page = Math.max(1, Number(pageParam) || 1)

  // Fetch in parallel
  const [availableYears, obituariosData] = await Promise.all([
    getDeathYears(),
    getObituarios(selectedYear, page),
  ])

  const { people, totalCount, totalPages } = obituariosData

  const buildPageHref = (p: number) => {
    const params = new URLSearchParams()
    params.set('year', selectedYear.toString())
    if (p > 1) params.set('page', p.toString())
    return `/listados/obituarios?${params}`
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-12 lg:px-12">
      {/* Título */}
      <h1 className="font-serif text-2xl tracking-tight md:text-3xl lg:text-4xl">
        Obituarios de {selectedYear}
      </h1>

      {/* Contador */}
      {totalCount > 0 && (
        <p className="mt-1 text-[12px] text-muted-foreground/40 md:text-[13px]">
          {totalCount.toLocaleString('es-AR')} persona{totalCount !== 1 ? 's' : ''} fallecida{totalCount !== 1 ? 's' : ''}
        </p>
      )}

      {/* Selector de año (client component) */}
      <ObituariosYearSelector
        selectedYear={selectedYear}
        availableYears={availableYears}
      />

      {/* Grid de personas */}
      <ObituariosGrid
        people={people}
        isLoading={false}
      />

      {/* Paginación (server-rendered con Links) */}
      <ServerPagination
        currentPage={page}
        totalPages={totalPages}
        buildHref={buildPageHref}
      />
    </div>
  )
}
