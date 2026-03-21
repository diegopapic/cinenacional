// src/lib/queries/obituarios.ts
// Server-side data fetching for the obituarios page.
// Extracts Prisma queries from /api/people/death-years and /api/people (obituarios mode).

import { prisma } from '@/lib/prisma'
import type { PersonWithDeath } from '@/lib/obituarios/obituariosTypes'

// ─── Types ────────────────────────────────────────────────────────

export interface ObituariosPageData {
  people: PersonWithDeath[]
  totalCount: number
  page: number
  totalPages: number
}

// ─── Queries ──────────────────────────────────────────────────────

/**
 * Returns all unique death years, sorted descending (most recent first).
 */
export async function getDeathYears(): Promise<number[]> {
  const result = await prisma.person.findMany({
    where: { deathYear: { not: null } },
    select: { deathYear: true },
    distinct: ['deathYear'],
    orderBy: { deathYear: 'desc' },
  })

  return result
    .map(r => r.deathYear)
    .filter((year): year is number => year !== null)
}

/**
 * Returns paginated obituarios for a given year.
 * Matches the API behavior: sortBy deathDate desc, 90 items per page.
 */
export async function getObituarios(
  year: number,
  page = 1,
  limit = 90,
): Promise<ObituariosPageData> {
  const where = {
    deathYear: year,
  }

  const [totalCount, people] = await Promise.all([
    prisma.person.count({ where }),
    prisma.person.findMany({
      where,
      select: {
        id: true,
        slug: true,
        firstName: true,
        lastName: true,
        photoUrl: true,
        birthYear: true,
        birthMonth: true,
        birthDay: true,
        deathYear: true,
        deathMonth: true,
        deathDay: true,
      },
      orderBy: [
        { deathYear: 'desc' },
        { deathMonth: 'desc' },
        { deathDay: 'desc' },
      ],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  return {
    people: people as PersonWithDeath[],
    totalCount,
    page,
    totalPages: Math.ceil(totalCount / limit),
  }
}
