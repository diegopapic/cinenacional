// src/app/api/search/full/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api/api-handler'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:search:full')

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (request: NextRequest) => {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')

    if (!query || query.length < 2) {
      return NextResponse.json({
        movies: [],
        people: [],
        totalMovies: 0,
        totalPeople: 0
      })
    }

    const searchQuery = query.toLowerCase().trim()
    const searchPattern = `%${searchQuery}%`
    const searchTerms = searchQuery.split(/\s+/).filter(term => term.length > 0)

    try {
      // ============ PELÍCULAS ============
      interface FullMovieSearchRow {
        id: number
        slug: string
        title: string
        year: number | null
        releaseYear: number | null
        releaseMonth: number | null
        releaseDay: number | null
        posterUrl: string | null
        synopsis: string | null
        duration: number | null
        tipoDuracion: string | null
        stage: string
        soundType: string | null
        popularity: number | null
      }

      let movies: FullMovieSearchRow[]
      if (searchTerms.length <= 1) {
        movies = await prisma.$queryRaw<FullMovieSearchRow[]>`
          SELECT
            id, slug, title, year,
            release_year as "releaseYear",
            release_month as "releaseMonth",
            release_day as "releaseDay",
            poster_url as "posterUrl",
            synopsis, duration,
            tipo_duracion as "tipoDuracion",
            stage, sound_type as "soundType",
            popularity
          FROM movies
          WHERE unaccent(LOWER(title)) LIKE unaccent(${searchPattern})
          ORDER BY COALESCE(popularity, 0) DESC, title ASC
          LIMIT 50
        `
      } else {
        const termConditions = searchTerms.map(t =>
          Prisma.sql`unaccent(LOWER(title)) LIKE unaccent(${`%${t}%`})`
        )
        const whereClause = Prisma.join(termConditions, ' AND ')
        movies = await prisma.$queryRaw<FullMovieSearchRow[]>`
          SELECT
            id, slug, title, year,
            release_year as "releaseYear",
            release_month as "releaseMonth",
            release_day as "releaseDay",
            poster_url as "posterUrl",
            synopsis, duration,
            tipo_duracion as "tipoDuracion",
            stage, sound_type as "soundType",
            popularity
          FROM movies
          WHERE ${whereClause}
          ORDER BY
            CASE
              WHEN unaccent(LOWER(title)) LIKE unaccent(${searchPattern}) THEN 0
              ELSE 1
            END,
            COALESCE(popularity, 0) DESC,
            title ASC
          LIMIT 50
        `
      }

      // Obtener directores, géneros y países para las películas encontradas
      const movieIds = movies.map(m => m.id)

      const [directors, genres, countries] = movieIds.length > 0
        ? await Promise.all([
            prisma.$queryRaw<Array<{ movieId: number; personId: number; slug: string; name: string }>>`
              SELECT mc.movie_id as "movieId", p.id as "personId", p.slug,
                     TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')) as name
              FROM movie_crew mc
              JOIN people p ON p.id = mc.person_id
              JOIN roles r ON r.id = mc.role_id
              WHERE mc.movie_id = ANY(${movieIds}::int[])
                AND r.department = 'DIRECTING'
                AND r.name = 'Director'
              ORDER BY mc.display_order ASC NULLS LAST
            `,
            prisma.$queryRaw<Array<{ movieId: number; genreId: number; name: string }>>`
              SELECT mg.movie_id as "movieId", g.id as "genreId", g.name
              FROM movie_genres mg
              JOIN genres g ON g.id = mg.genre_id
              WHERE mg.movie_id = ANY(${movieIds}::int[])
              ORDER BY g.name ASC
            `,
            prisma.$queryRaw<Array<{ movieId: number; countryId: number; name: string }>>`
              SELECT mc.movie_id as "movieId", l.id as "countryId", l.name
              FROM movie_countries mc
              JOIN locations l ON l.id = mc.country_id
              WHERE mc.movie_id = ANY(${movieIds}::int[])
            `,
          ])
        : [[], [], []]

      // Agrupar por película
      const directorsByMovie = new Map<number, Array<{ id: number; slug: string; name: string }>>()
      for (const d of directors) {
        const list = directorsByMovie.get(d.movieId) ?? []
        list.push({ id: d.personId, slug: d.slug, name: d.name })
        directorsByMovie.set(d.movieId, list)
      }

      const genresByMovie = new Map<number, Array<{ id: number; name: string }>>()
      for (const g of genres) {
        const list = genresByMovie.get(g.movieId) ?? []
        list.push({ id: g.genreId, name: g.name })
        genresByMovie.set(g.movieId, list)
      }

      const countriesByMovie = new Map<number, Array<{ id: number; name: string }>>()
      for (const c of countries) {
        const list = countriesByMovie.get(c.movieId) ?? []
        list.push({ id: c.countryId, name: c.name })
        countriesByMovie.set(c.movieId, list)
      }

      const formattedMovies = movies.map(movie => ({
        id: movie.id,
        slug: movie.slug,
        title: movie.title,
        year: movie.year,
        releaseYear: movie.releaseYear,
        releaseMonth: movie.releaseMonth,
        releaseDay: movie.releaseDay,
        posterUrl: movie.posterUrl,
        synopsis: movie.synopsis,
        duration: movie.duration,
        tipoDuracion: movie.tipoDuracion,
        stage: movie.stage,
        soundType: movie.soundType,
        directors: directorsByMovie.get(movie.id) ?? [],
        genres: genresByMovie.get(movie.id) ?? [],
        countries: countriesByMovie.get(movie.id) ?? [],
      }))

      // ============ PERSONAS ============
      interface FullPersonSearchRow {
        id: number
        slug: string
        firstName: string | null
        lastName: string | null
        photoUrl: string | null
        gender: string | null
        birthYear: number | null
        birthMonth: number | null
        birthDay: number | null
        deathYear: number | null
        deathMonth: number | null
        deathDay: number | null
        birthLocationPath: string | null
        deathLocationPath: string | null
        movieCount: number
      }

      const people = await prisma.$queryRaw<FullPersonSearchRow[]>`
        SELECT
          p.id, p.slug,
          p.first_name as "firstName",
          p.last_name as "lastName",
          p.photo_url as "photoUrl",
          p.gender,
          p.birth_year as "birthYear",
          p.birth_month as "birthMonth",
          p.birth_day as "birthDay",
          p.death_year as "deathYear",
          p.death_month as "deathMonth",
          p.death_day as "deathDay",
          (
            SELECT STRING_AGG(l2.name, ', ' ORDER BY l2.type DESC)
            FROM locations l2
            WHERE l2.id = p.birth_location_id
               OR l2.id = (SELECT parent_id FROM locations WHERE id = p.birth_location_id)
               OR l2.id = (SELECT parent_id FROM locations WHERE id = (SELECT parent_id FROM locations WHERE id = p.birth_location_id))
          ) as "birthLocationPath",
          (
            SELECT STRING_AGG(l3.name, ', ' ORDER BY l3.type DESC)
            FROM locations l3
            WHERE l3.id = p.death_location_id
               OR l3.id = (SELECT parent_id FROM locations WHERE id = p.death_location_id)
               OR l3.id = (SELECT parent_id FROM locations WHERE id = (SELECT parent_id FROM locations WHERE id = p.death_location_id))
          ) as "deathLocationPath",
          (
            (SELECT COUNT(*)::int FROM movie_cast WHERE person_id = p.id) +
            (SELECT COUNT(*)::int FROM movie_crew WHERE person_id = p.id)
          ) as "movieCount"
        FROM people p
        WHERE p.is_active = true
        AND (
          unaccent(LOWER(COALESCE(p.first_name, ''))) LIKE unaccent(${searchPattern})
          OR unaccent(LOWER(COALESCE(p.last_name, ''))) LIKE unaccent(${searchPattern})
          OR unaccent(LOWER(COALESCE(p.real_name, ''))) LIKE unaccent(${searchPattern})
          OR unaccent(LOWER(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE unaccent(${searchPattern})
        )
        ORDER BY
          (
            (SELECT COUNT(*) FROM movie_cast WHERE person_id = p.id) +
            (SELECT COUNT(*) FROM movie_crew WHERE person_id = p.id)
          ) DESC,
          p.last_name ASC NULLS LAST,
          p.first_name ASC NULLS LAST
        LIMIT 50
      `

      // Obtener película destacada para cada persona
      const personIds = people.map(p => p.id)

      interface FeaturedMovieRow {
        personId: number
        movieId: number
        movieSlug: string
        movieTitle: string
        movieYear: number | null
        roleName: string
        source: string
      }

      const featuredMovies = personIds.length > 0
        ? await prisma.$queryRaw<FeaturedMovieRow[]>`
            SELECT DISTINCT ON (sub.person_id)
              sub.person_id as "personId",
              sub.movie_id as "movieId",
              sub.movie_slug as "movieSlug",
              sub.movie_title as "movieTitle",
              sub.movie_year as "movieYear",
              sub.role_name as "roleName",
              sub.source
            FROM (
              SELECT mc.person_id, m.id as movie_id, m.slug as movie_slug, m.title as movie_title, m.year as movie_year,
                     'Actor' as role_name, 'cast' as source,
                     COALESCE(m.popularity, 0) as pop
              FROM movie_cast mc
              JOIN movies m ON m.id = mc.movie_id
              WHERE mc.person_id = ANY(${personIds}::int[])
              UNION ALL
              SELECT mcr.person_id, m.id, m.slug, m.title, m.year,
                     r.name as role_name, 'crew' as source,
                     COALESCE(m.popularity, 0) as pop
              FROM movie_crew mcr
              JOIN movies m ON m.id = mcr.movie_id
              JOIN roles r ON r.id = mcr.role_id
              WHERE mcr.person_id = ANY(${personIds}::int[])
            ) sub
            ORDER BY sub.person_id, sub.pop DESC, sub.movie_year DESC NULLS LAST
          `
        : []

      const featuredByPerson = new Map<number, FeaturedMovieRow>()
      for (const fm of featuredMovies) {
        if (!featuredByPerson.has(fm.personId)) {
          featuredByPerson.set(fm.personId, fm)
        }
      }

      const formattedPeople = people.map(person => {
        const featured = featuredByPerson.get(person.id)
        return {
          ...person,
          featuredMovie: featured ? {
            id: featured.movieId,
            slug: featured.movieSlug,
            title: featured.movieTitle,
            year: featured.movieYear,
            role: featured.roleName,
          } : null,
        }
      })

      return NextResponse.json({
        movies: formattedMovies,
        people: formattedPeople,
        totalMovies: formattedMovies.length,
        totalPeople: formattedPeople.length
      })

    } catch {
      log.debug('Unaccent not available, using fallback')

      // Fallback sin unaccent (simplificado)
      const [movies, people] = await Promise.all([
        prisma.movie.findMany({
          where: {
            AND: searchTerms.map(term => ({
              title: { contains: term, mode: 'insensitive' as const }
            }))
          },
          select: {
            id: true, slug: true, title: true, year: true,
            releaseYear: true, releaseMonth: true, releaseDay: true,
            posterUrl: true, synopsis: true, duration: true,
            tipoDuracion: true, stage: true, soundType: true, popularity: true,
            genres: { select: { genre: { select: { id: true, name: true } } } },
            crew: {
              where: { role: { department: 'DIRECTING', name: 'Director' } },
              select: { person: { select: { id: true, slug: true, firstName: true, lastName: true } } },
              orderBy: { displayOrder: 'asc' }
            },
            countries: { select: { country: { select: { id: true, name: true } } } },
          },
          orderBy: [{ popularity: 'desc' }, { title: 'asc' }],
          take: 50
        }),
        prisma.person.findMany({
          where: {
            isActive: true,
            OR: [
              { firstName: { contains: query, mode: 'insensitive' } },
              { lastName: { contains: query, mode: 'insensitive' } },
              { realName: { contains: query, mode: 'insensitive' } }
            ]
          },
          select: {
            id: true, slug: true, firstName: true, lastName: true,
            photoUrl: true, gender: true,
            birthYear: true, birthMonth: true, birthDay: true,
            deathYear: true, deathMonth: true, deathDay: true,
            _count: { select: { castRoles: true, crewRoles: true } }
          },
          take: 50
        })
      ])

      const formattedMovies = movies.map(m => ({
        id: m.id, slug: m.slug, title: m.title, year: m.year,
        releaseYear: m.releaseYear, releaseMonth: m.releaseMonth, releaseDay: m.releaseDay,
        posterUrl: m.posterUrl, synopsis: m.synopsis, duration: m.duration,
        tipoDuracion: m.tipoDuracion, stage: m.stage, soundType: m.soundType,
        directors: m.crew.map(c => ({
          id: c.person.id, slug: c.person.slug,
          name: [c.person.firstName, c.person.lastName].filter(Boolean).join(' ')
        })),
        genres: m.genres.map(g => g.genre),
        countries: m.countries.map(c => c.country),
      }))

      const sortedPeople = [...people].sort((a, b) => {
        const totalA = (a._count?.castRoles || 0) + (a._count?.crewRoles || 0)
        const totalB = (b._count?.castRoles || 0) + (b._count?.crewRoles || 0)
        return totalB - totalA
      })

      const formattedPeople = sortedPeople.map(p => ({
        id: p.id, slug: p.slug, firstName: p.firstName, lastName: p.lastName,
        photoUrl: p.photoUrl, gender: p.gender,
        birthYear: p.birthYear, birthMonth: p.birthMonth, birthDay: p.birthDay,
        deathYear: p.deathYear, deathMonth: p.deathMonth, deathDay: p.deathDay,
        birthLocationPath: null, deathLocationPath: null,
        movieCount: (p._count?.castRoles || 0) + (p._count?.crewRoles || 0),
        featuredMovie: null,
      }))

      return NextResponse.json({
        movies: formattedMovies,
        people: formattedPeople,
        totalMovies: formattedMovies.length,
        totalPeople: formattedPeople.length
      })
    }
}, 'buscar')
