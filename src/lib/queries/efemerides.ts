// src/lib/queries/efemerides.ts
// Server-side data fetching for the efemérides page.
// Extracts Prisma queries from /api/efemerides.

import { prisma } from '@/lib/prisma'
import { formatearEfemeride } from '@/lib/utils/efemerides'
import type { Efemeride, DirectorInfo } from '@/types/home.types'

// ─── Types ────────────────────────────────────────────────────────

export interface EfemeridesResult {
  efemerides: Efemeride[]
  month: number
  day: number
}

// ─── Helpers ──────────────────────────────────────────────────────

function extractDirectors(
  crew: { person: { slug: string; firstName: string | null; lastName: string | null } }[]
): DirectorInfo[] {
  return crew
    .map(c => ({
      name: `${c.person.firstName || ''} ${c.person.lastName || ''}`.trim(),
      slug: c.person.slug,
    }))
    .filter(d => d.name)
}

// ─── Main Query ───────────────────────────────────────────────────

const directorSelect = {
  where: { roleId: 2 },
  select: {
    person: {
      select: { slug: true, firstName: true, lastName: true },
    },
  },
} as const

/**
 * Fetches all efemérides for a given day/month.
 * Includes: movie releases, filming start/end, births, deaths.
 */
export async function getEfemerides(month: number, day: number): Promise<EfemeridesResult> {
  const [
    peliculasEstreno,
    peliculasInicioRodaje,
    peliculasFinRodaje,
    personasNacimiento,
    personasMuerte,
  ] = await Promise.all([
    prisma.movie.findMany({
      where: { releaseDay: day, releaseMonth: month, releaseYear: { not: null } },
      select: {
        id: true, slug: true, title: true,
        releaseYear: true, releaseMonth: true, releaseDay: true,
        posterUrl: true, crew: directorSelect,
      },
    }),
    prisma.movie.findMany({
      where: { filmingStartDay: day, filmingStartMonth: month, filmingStartYear: { not: null } },
      select: {
        id: true, slug: true, title: true,
        filmingStartYear: true, filmingStartMonth: true, filmingStartDay: true,
        posterUrl: true, crew: directorSelect,
      },
    }),
    prisma.movie.findMany({
      where: { filmingEndDay: day, filmingEndMonth: month, filmingEndYear: { not: null } },
      select: {
        id: true, slug: true, title: true,
        filmingEndYear: true, filmingEndMonth: true, filmingEndDay: true,
        posterUrl: true, crew: directorSelect,
      },
    }),
    prisma.person.findMany({
      where: { birthDay: day, birthMonth: month, birthYear: { not: null } },
      select: {
        id: true, slug: true, firstName: true, lastName: true,
        birthYear: true, birthMonth: true, birthDay: true, photoUrl: true,
      },
    }),
    prisma.person.findMany({
      where: { deathDay: day, deathMonth: month, deathYear: { not: null } },
      select: {
        id: true, slug: true, firstName: true, lastName: true,
        deathYear: true, deathMonth: true, deathDay: true, photoUrl: true,
      },
    }),
  ])

  const efemerides: (Efemeride | null)[] = []

  // Estrenos
  for (const p of peliculasEstreno) {
    const directors = extractDirectors(p.crew)
    efemerides.push(
      formatearEfemeride({
        tipo: 'pelicula', tipoEvento: 'estreno',
        año: p.releaseYear!, mes: p.releaseMonth!, dia: p.releaseDay!,
        fecha: new Date(p.releaseYear!, p.releaseMonth! - 1, p.releaseDay!),
        titulo: p.title, directors, directorSlug: directors[0]?.slug,
        slug: p.slug, posterUrl: p.posterUrl || undefined,
      })
    )
  }

  // Inicio de rodaje
  for (const p of peliculasInicioRodaje) {
    const directors = extractDirectors(p.crew)
    efemerides.push(
      formatearEfemeride({
        tipo: 'pelicula', tipoEvento: 'inicio_rodaje',
        año: p.filmingStartYear!, mes: p.filmingStartMonth!, dia: p.filmingStartDay!,
        fecha: new Date(p.filmingStartYear!, p.filmingStartMonth! - 1, p.filmingStartDay!),
        titulo: p.title, directors, directorSlug: directors[0]?.slug,
        slug: p.slug, posterUrl: p.posterUrl || undefined,
      })
    )
  }

  // Fin de rodaje
  for (const p of peliculasFinRodaje) {
    const directors = extractDirectors(p.crew)
    efemerides.push(
      formatearEfemeride({
        tipo: 'pelicula', tipoEvento: 'fin_rodaje',
        año: p.filmingEndYear!, mes: p.filmingEndMonth!, dia: p.filmingEndDay!,
        fecha: new Date(p.filmingEndYear!, p.filmingEndMonth! - 1, p.filmingEndDay!),
        titulo: p.title, directors, directorSlug: directors[0]?.slug,
        slug: p.slug, posterUrl: p.posterUrl || undefined,
      })
    )
  }

  // Nacimientos
  for (const persona of personasNacimiento) {
    const nombre = `${persona.firstName || ''} ${persona.lastName || ''}`.trim()
    efemerides.push(
      formatearEfemeride({
        tipo: 'persona', tipoEvento: 'nacimiento',
        año: persona.birthYear!, mes: persona.birthMonth!, dia: persona.birthDay!,
        fecha: new Date(persona.birthYear!, persona.birthMonth! - 1, persona.birthDay!),
        nombre, slug: persona.slug, photoUrl: persona.photoUrl || undefined,
      })
    )
  }

  // Muertes
  for (const persona of personasMuerte) {
    const nombre = `${persona.firstName || ''} ${persona.lastName || ''}`.trim()
    efemerides.push(
      formatearEfemeride({
        tipo: 'persona', tipoEvento: 'muerte',
        año: persona.deathYear!, mes: persona.deathMonth!, dia: persona.deathDay!,
        fecha: new Date(persona.deathYear!, persona.deathMonth! - 1, persona.deathDay!),
        nombre, slug: persona.slug, photoUrl: persona.photoUrl || undefined,
      })
    )
  }

  // Filter nulls, sort by recency (fewer years ago first)
  const validas = efemerides
    .filter((e): e is Efemeride => e !== null)
    .sort((a, b) => {
      const añosA = parseInt(a.hace.match(/\d+/)?.[0] || '0')
      const añosB = parseInt(b.hace.match(/\d+/)?.[0] || '0')
      return añosA - añosB
    })

  return { efemerides: validas, month, day }
}
