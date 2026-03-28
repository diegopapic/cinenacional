// src/app/api/search/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api/api-handler'
import { parseIntClamped, LIMITS } from '@/lib/api/parse-params'
import { applyRateLimit, getClientIp, RATE_LIMIT_PRESETS } from '@/lib/rate-limit'
import { normalizeSearch, norm } from '@/lib/api/search-utils'

export const dynamic = 'force-dynamic'

/**
 * Obtiene el año a mostrar para una película.
 * Prioridad: año de producción (year) > año de estreno (releaseYear)
 * Retorna null si ambos están vacíos o son 0
 */
function getDisplayYear(year: number | null, releaseYear: number | null): number | null {
  // Prioridad 1: año de producción
  if (year && year > 0) {
    return year
  }

  // Prioridad 2: año de estreno
  if (releaseYear && releaseYear > 0) {
    return releaseYear
  }

  // Ninguno disponible
  return null
}

export const GET = apiHandler(async (request: NextRequest) => {
    const ip = getClientIp(request)
    const limited = await applyRateLimit(ip, RATE_LIMIT_PRESETS.search)
    if (limited) return limited

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    const limit = parseIntClamped(searchParams.get('limit'), 10, LIMITS.MIN, LIMITS.MAX)

    if (!query || query.length < 2) {
      return NextResponse.json({
        movies: [],
        people: [],
        total: 0
      })
    }

    const searchQuery = normalizeSearch(query)
    const searchPattern = `%${searchQuery}%`
    const searchTerms = searchQuery.split(/\s+/).filter(term => term.length > 0)

    // Búsqueda de películas con normalización de acentos (translate() built-in)
    interface MovieSearchRow {
      id: number
      slug: string
      title: string
      year: number | null
      releaseYear: number | null
      posterUrl: string | null
      matchedAlternativeTitle: string | null
    }

    let movies: MovieSearchRow[]
    if (searchTerms.length <= 1) {
      movies = await prisma.$queryRaw`
        SELECT
          m.id,
          m.slug,
          m.title,
          m.year,
          m.release_year as "releaseYear",
          m.poster_url as "posterUrl",
          (SELECT mat.title FROM movie_alternative_titles mat
           WHERE mat.movie_id = m.id AND ${norm('mat.title')} LIKE ${searchPattern}
           LIMIT 1) as "matchedAlternativeTitle"
        FROM movies m
        WHERE
          ${norm('m.title')} LIKE ${searchPattern}
          OR EXISTS (
            SELECT 1 FROM movie_alternative_titles mat
            WHERE mat.movie_id = m.id AND ${norm('mat.title')} LIKE ${searchPattern}
          )
        ORDER BY
          CASE
            WHEN ${norm('m.title')} = ${searchQuery} THEN 1
            WHEN ${norm('m.title')} LIKE ${searchQuery + '%'} THEN 2
            WHEN ${norm('m.title')} LIKE ${searchPattern} THEN 3
            ELSE 4
          END,
          m.popularity DESC NULLS LAST,
          m.title ASC
        LIMIT ${limit}
      `
    } else {
      // Multi-term: cada palabra debe aparecer en el título o en un título alternativo
      const titleTermConditions = searchTerms.map(t =>
        Prisma.sql`${norm('m.title')} LIKE ${`%${t}%`}`
      )
      const titleWhereClause = Prisma.join(titleTermConditions, ' AND ')
      const altTitleTermConditions = searchTerms.map(t =>
        Prisma.sql`${norm('mat.title')} LIKE ${`%${t}%`}`
      )
      const altTitleWhereClause = Prisma.join(altTitleTermConditions, ' AND ')
      movies = await prisma.$queryRaw`
        SELECT
          m.id,
          m.slug,
          m.title,
          m.year,
          m.release_year as "releaseYear",
          m.poster_url as "posterUrl",
          (SELECT mat2.title FROM movie_alternative_titles mat2
           WHERE mat2.movie_id = m.id AND ${altTitleWhereClause}
           LIMIT 1) as "matchedAlternativeTitle"
        FROM movies m
        WHERE (${titleWhereClause})
          OR EXISTS (
            SELECT 1 FROM movie_alternative_titles mat
            WHERE mat.movie_id = m.id AND ${altTitleWhereClause}
          )
        ORDER BY
          CASE
            WHEN ${norm('m.title')} = ${searchQuery} THEN 1
            WHEN ${norm('m.title')} LIKE ${searchQuery + '%'} THEN 2
            WHEN ${norm('m.title')} LIKE ${searchPattern} THEN 3
            ELSE 4
          END,
          m.popularity DESC NULLS LAST,
          m.title ASC
        LIMIT ${limit}
      `
    }

    // Búsqueda de personas con normalización de acentos
    interface PersonSearchRow {
      id: number
      slug: string
      first_name: string | null
      last_name: string | null
      real_name: string | null
      photo_url: string | null
      birth_year: number | null
      death_year: number | null
      matchedAlternativeName: string | null
    }

    let people: PersonSearchRow[]

    if (searchTerms.length === 1) {
      people = await prisma.$queryRaw`
        SELECT
          p.id,
          p.slug,
          p.first_name,
          p.last_name,
          p.real_name,
          p.photo_url,
          p.birth_year,
          p.death_year,
          (SELECT pan.full_name FROM people_alternative_names pan
           WHERE pan.person_id = p.id AND ${norm('pan.full_name')} LIKE ${searchPattern}
           LIMIT 1) as "matchedAlternativeName"
        FROM people p
        WHERE p.is_active = true
        AND (
          ${norm("COALESCE(p.first_name, '')")} LIKE ${searchPattern}
          OR ${norm("COALESCE(p.last_name, '')")} LIKE ${searchPattern}
          OR ${norm("COALESCE(p.real_name, '')")} LIKE ${searchPattern}
          OR ${norm("COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')")} LIKE ${searchPattern}
          OR EXISTS (
            SELECT 1 FROM people_alternative_names pan
            WHERE pan.person_id = p.id AND ${norm('pan.full_name')} LIKE ${searchPattern}
          )
        )
        ORDER BY
          CASE
            WHEN ${norm("COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')")} = ${searchQuery} THEN 1
            WHEN ${norm("COALESCE(p.first_name, '')")} = ${searchQuery} OR ${norm("COALESCE(p.last_name, '')")} = ${searchQuery} THEN 2
            WHEN ${norm("COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')")} LIKE ${searchQuery + '%'} THEN 3
            ELSE 4
          END,
          p.last_name ASC NULLS LAST,
          p.first_name ASC NULLS LAST
        LIMIT ${limit}
      `
    } else {
      const firstTerm = `%${searchTerms[0]}%`
      const secondTerm = `%${searchTerms[1]}%`

      people = await prisma.$queryRaw`
        SELECT
          p.id,
          p.slug,
          p.first_name,
          p.last_name,
          p.real_name,
          p.photo_url,
          p.birth_year,
          p.death_year,
          (SELECT pan.full_name FROM people_alternative_names pan
           WHERE pan.person_id = p.id AND ${norm('pan.full_name')} LIKE ${searchPattern}
           LIMIT 1) as "matchedAlternativeName"
        FROM people p
        WHERE p.is_active = true
        AND (
          ${norm("COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')")} LIKE ${searchPattern}
          OR ${norm("COALESCE(p.last_name, '') || ' ' || COALESCE(p.first_name, '')")} LIKE ${searchPattern}
          OR ${norm("COALESCE(p.real_name, '')")} LIKE ${searchPattern}
          OR (
            (${norm("COALESCE(p.first_name, '')")} LIKE ${firstTerm} OR ${norm("COALESCE(p.last_name, '')")} LIKE ${firstTerm})
            AND
            (${norm("COALESCE(p.first_name, '')")} LIKE ${secondTerm} OR ${norm("COALESCE(p.last_name, '')")} LIKE ${secondTerm})
          )
          OR EXISTS (
            SELECT 1 FROM people_alternative_names pan
            WHERE pan.person_id = p.id AND ${norm('pan.full_name')} LIKE ${searchPattern}
          )
        )
        ORDER BY
          CASE
            WHEN ${norm("COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')")} = ${searchQuery} THEN 1
            WHEN ${norm("COALESCE(p.last_name, '') || ' ' || COALESCE(p.first_name, '')")} = ${searchQuery} THEN 2
            WHEN ${norm("COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')")} LIKE ${searchQuery + '%'} THEN 3
            ELSE 4
          END,
          p.last_name ASC NULLS LAST,
          p.first_name ASC NULLS LAST
        LIMIT ${limit}
      `
    }

    // Formatear resultados
    const formattedMovies = movies.map((movie: MovieSearchRow) => ({
      id: movie.id,
      slug: movie.slug,
      title: movie.title,
      year: getDisplayYear(movie.year, movie.releaseYear),
      posterUrl: movie.posterUrl,
      type: 'movie' as const,
      matchedAlternativeTitle: movie.matchedAlternativeTitle ?? null
    }))

    const formattedPeople = people.map(person => ({
      id: person.id,
      slug: person.slug,
      name: `${person.first_name || ''} ${person.last_name || ''}`.trim() || person.real_name || 'Sin nombre',
      photoUrl: person.photo_url,
      birthYear: person.birth_year,
      deathYear: person.death_year,
      type: 'person' as const,
      matchedAlternativeName: person.matchedAlternativeName ?? null
    }))

    return NextResponse.json({
      movies: formattedMovies,
      people: formattedPeople,
      total: formattedMovies.length + formattedPeople.length
    })
}, 'buscar')
