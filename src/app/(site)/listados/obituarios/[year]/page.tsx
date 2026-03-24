// src/app/listados/obituarios/[year]/page.tsx — Server Component
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getDeathYears, getObituarios } from '@/lib/queries/obituarios'
import ObituariosYearSelector from '@/components/listados/obituarios/ObituariosYearSelector'
import ObituariosGrid from '@/app/(site)/listados/obituarios/ObituariosGrid'
import ServerPagination from '@/components/shared/ServerPagination'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ year: string }>
  searchParams: Promise<{ page?: string }>
}

function parseYear(raw: string): number | null {
  const num = parseInt(raw)
  if (isNaN(num) || num < 1900 || num > new Date().getFullYear() + 1) return null
  return num
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { year: yearParam } = await params
  const year = parseYear(yearParam)
  if (!year) return {}

  return {
    title: `Obituarios de ${year} — cinenacional.com`,
    description: `Personas del cine argentino fallecidas en ${year}.`,
    alternates: { canonical: `https://cinenacional.com/listados/obituarios/${year}` },
  }
}

export default async function ObituariosYearPage({ params, searchParams }: PageProps) {
  const { year: yearParam } = await params
  const year = parseYear(yearParam)
  if (!year) notFound()

  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)

  const [availableYears, obituariosData] = await Promise.all([
    getDeathYears(),
    getObituarios(year, page),
  ])

  const { people, totalCount, totalPages } = obituariosData

  const buildPageHref = (p: number) => {
    const base = `/listados/obituarios/${year}`
    return p > 1 ? `${base}?page=${p}` : base
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-12 lg:px-12">
      <h1 className="font-serif text-2xl tracking-tight md:text-3xl lg:text-4xl">
        Obituarios de {year}
      </h1>

      {totalCount > 0 && (
        <p className="mt-1 text-[12px] text-muted-foreground/40 md:text-[13px]">
          {totalCount.toLocaleString('es-AR')} persona{totalCount !== 1 ? 's' : ''} fallecida{totalCount !== 1 ? 's' : ''}
        </p>
      )}

      <ObituariosYearSelector
        selectedYear={year}
        availableYears={availableYears}
      />

      <ObituariosGrid
        people={people}
        isLoading={false}
      />

      <ServerPagination
        currentPage={page}
        totalPages={totalPages}
        buildHref={buildPageHref}
      />
    </div>
  )
}
