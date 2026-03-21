// src/lib/queries/estrenos.ts
// Server-side data fetching for the estrenos page.
// Extracts Prisma queries from /api/movies (estrenos mode) and the
// MovieWithRelease → ReleaseEntry transformation from EstrenosContent.tsx.

import { prisma } from '@/lib/prisma'
import type { ReleaseEntry } from '@/components/FilmReleasesByYear'
import type { EstrenosMode } from '@/lib/estrenos/estrenosTypes'

// ─── Helpers ──────────────────────────────────────────────────────

function formatDirector(
  crew: { roleId: number; person: { id: number; firstName: string | null; lastName: string | null; slug: string } }[]
): string | undefined {
  const directores = crew.filter(c => c.roleId === 2)
  const nombres = directores
    .map(d => `${d.person.firstName || ''} ${d.person.lastName || ''}`.trim())
    .filter(Boolean)

  if (nombres.length > 2) return `${nombres.slice(0, 2).join(', ')} y otros`
  if (nombres.length > 0) return nombres.join(' y ')
  return undefined
}

function buildReleaseDateISO(
  year: number | null,
  month: number | null,
  day: number | null,
): string | undefined {
  if (!year) return undefined
  const y = year.toString().padStart(4, '0')
  const m = (month ?? 0).toString().padStart(2, '0')
  const d = (day ?? 0).toString().padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ─── Main Query ───────────────────────────────────────────────────

const movieSelect = {
  id: true,
  slug: true,
  title: true,
  releaseYear: true,
  releaseMonth: true,
  releaseDay: true,
  posterUrl: true,
  crew: {
    where: { roleId: 2 },
    include: {
      person: {
        select: { id: true, firstName: true, lastName: true, slug: true },
      },
      role: true,
    },
    orderBy: { billingOrder: 'asc' as const },
  },
} as const

/**
 * Fetches all releases for a given mode (year, decade, or upcoming)
 * and transforms them into ReleaseEntry[] ready for the component.
 */
export async function getEstrenos(mode: EstrenosMode): Promise<ReleaseEntry[]> {
  const where: Record<string, unknown> = {}

  if (mode.type === 'upcoming') {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    const currentDay = now.getDate()

    where.OR = [
      { releaseYear: { gt: currentYear } },
      {
        releaseYear: currentYear,
        releaseMonth: { gt: currentMonth },
      },
      {
        releaseYear: currentYear,
        releaseMonth: currentMonth,
        releaseDay: { gte: currentDay },
      },
      {
        releaseYear: currentYear,
        releaseMonth: null,
      },
      {
        releaseYear: currentYear,
        releaseMonth: currentMonth,
        releaseDay: null,
      },
    ]
  } else if (mode.type === 'decade') {
    where.releaseYear = { gte: mode.start, lte: mode.end }
  } else {
    // year
    where.releaseYear = mode.value
  }

  const movies = await prisma.movie.findMany({
    where,
    select: movieSelect,
    orderBy: [
      { releaseYear: 'asc' },
      { releaseMonth: 'asc' },
      { releaseDay: 'asc' },
    ],
    take: 10000,
  })

  return movies
    .filter(m => m.releaseYear)
    .map(m => ({
      title: m.title,
      href: `/pelicula/${m.slug}`,
      posterSrc: m.posterUrl || undefined,
      year: m.releaseYear,
      director: formatDirector(m.crew),
      releaseMonth: m.releaseMonth,
      releaseDay: m.releaseDay,
      releaseDateISO: buildReleaseDateISO(m.releaseYear, m.releaseMonth, m.releaseDay),
    }))
}
