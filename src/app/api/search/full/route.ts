// src/app/api/search/full/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api/api-handler'
import { normalizeSearch, norm } from '@/lib/api/search-utils'

export const dynamic = 'force-dynamic'

// ============ Types ============

interface MovieSearchRow {
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

interface DirectorRow { movieId: number; personId: number; slug: string; name: string }
interface GenreRow { movieId: number; genreId: number; name: string }
interface CountryRow { movieId: number; countryId: number; name: string }

interface PersonSearchRow {
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
  movieCount: number
}

interface LocationPathRow {
  person_id: number
  birth_location_path: string | null
  death_location_path: string | null
}

interface FeaturedMovieRow {
  person_id: number
  movie_id: number
  movie_slug: string
  movie_title: string
  movie_year: number | null
  role_name: string
}

// ============ Helpers ============

async function getMovieRelations(movieIds: number[]) {
  if (movieIds.length === 0) return { directors: new Map(), genres: new Map(), countries: new Map() }

  const [directorsRaw, genresRaw, countriesRaw] = await Promise.all([
    prisma.$queryRaw<DirectorRow[]>`
      SELECT mc.movie_id as "movieId", p.id as "personId", p.slug,
             TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')) as name
      FROM movie_crew mc
      JOIN people p ON p.id = mc.person_id
      JOIN roles r ON r.id = mc.role_id
      WHERE mc.movie_id = ANY(${movieIds}::int[])
        AND r.department = 'DIRECCION'
        AND r.name = 'Director'
      ORDER BY mc.billing_order ASC NULLS LAST
    `,
    prisma.$queryRaw<GenreRow[]>`
      SELECT mg.movie_id as "movieId", g.id as "genreId", g.name
      FROM movie_genres mg
      JOIN genres g ON g.id = mg.genre_id
      WHERE mg.movie_id = ANY(${movieIds}::int[])
      ORDER BY g.name ASC
    `,
    prisma.$queryRaw<CountryRow[]>`
      SELECT mc.movie_id as "movieId", l.id as "countryId", l.name
      FROM movie_countries mc
      JOIN locations l ON l.id = mc.country_id
      WHERE mc.movie_id = ANY(${movieIds}::int[])
    `,
  ])

  const directors = new Map<number, Array<{ id: number; slug: string; name: string }>>()
  for (const d of directorsRaw) {
    const list = directors.get(d.movieId) ?? []
    list.push({ id: d.personId, slug: d.slug, name: d.name })
    directors.set(d.movieId, list)
  }

  const genres = new Map<number, Array<{ id: number; name: string }>>()
  for (const g of genresRaw) {
    const list = genres.get(g.movieId) ?? []
    list.push({ id: g.genreId, name: g.name })
    genres.set(g.movieId, list)
  }

  const countries = new Map<number, Array<{ id: number; name: string }>>()
  for (const c of countriesRaw) {
    const list = countries.get(c.movieId) ?? []
    list.push({ id: c.countryId, name: c.name })
    countries.set(c.movieId, list)
  }

  return { directors, genres, countries }
}

async function getPersonExtras(personIds: number[]) {
  if (personIds.length === 0) return { locations: new Map(), featured: new Map() }

  const [locationPaths, featuredMovies] = await Promise.all([
    prisma.$queryRaw<LocationPathRow[]>`
      WITH RECURSIVE location_tree AS (
        SELECT id, name, parent_id, name::text as path
        FROM locations
        UNION ALL
        SELECT lt.id, lt.name, l.parent_id, lt.path || ', ' || l.name
        FROM location_tree lt
        INNER JOIN locations l ON lt.parent_id = l.id
      ),
      full_paths AS (
        SELECT id,
          (SELECT path FROM location_tree WHERE id = lt.id ORDER BY LENGTH(path) DESC LIMIT 1) as full_path
        FROM location_tree lt
        GROUP BY id
      )
      SELECT
        p.id as person_id,
        bp.full_path as birth_location_path,
        dp.full_path as death_location_path
      FROM people p
      LEFT JOIN full_paths bp ON p.birth_location_id = bp.id
      LEFT JOIN full_paths dp ON p.death_location_id = dp.id
      WHERE p.id = ANY(${personIds}::int[])
    `,
    prisma.$queryRaw<FeaturedMovieRow[]>`
      SELECT DISTINCT ON (sub.person_id)
        sub.person_id, sub.movie_id, sub.movie_slug, sub.movie_title, sub.movie_year, sub.role_name
      FROM (
        SELECT mc.person_id, m.id as movie_id, m.slug as movie_slug, m.title as movie_title,
               m.year as movie_year, 'Actor' as role_name, COALESCE(m.popularity, 0) as pop
        FROM movie_cast mc
        JOIN movies m ON m.id = mc.movie_id
        WHERE mc.person_id = ANY(${personIds}::int[])
        UNION ALL
        SELECT mcr.person_id, m.id, m.slug, m.title, m.year,
               r.name as role_name, COALESCE(m.popularity, 0) as pop
        FROM movie_crew mcr
        JOIN movies m ON m.id = mcr.movie_id
        JOIN roles r ON r.id = mcr.role_id
        WHERE mcr.person_id = ANY(${personIds}::int[])
      ) sub
      ORDER BY sub.person_id, sub.pop DESC, sub.movie_year DESC NULLS LAST
    `,
  ])

  const locations = new Map<number, { birthPath: string | null; deathPath: string | null }>()
  for (const lp of locationPaths) {
    locations.set(lp.person_id, {
      birthPath: lp.birth_location_path,
      deathPath: lp.death_location_path,
    })
  }

  const featured = new Map<number, FeaturedMovieRow>()
  for (const fm of featuredMovies) {
    if (!featured.has(fm.person_id)) {
      featured.set(fm.person_id, fm)
    }
  }

  return { locations, featured }
}

// ============ Route handler ============

export const GET = apiHandler(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')

  if (!query || query.length < 2) {
    return NextResponse.json({ movies: [], people: [], totalMovies: 0, totalPeople: 0 })
  }

  const searchQuery = normalizeSearch(query)
  const searchPattern = `%${searchQuery}%`
  const searchTerms = searchQuery.split(/\s+/).filter(term => term.length > 0)

  // ============ PELÍCULAS ============
  let movies: (MovieSearchRow & { matchedAlternativeTitle: string | null })[]
  if (searchTerms.length <= 1) {
    movies = await prisma.$queryRaw`
      SELECT m.id, m.slug, m.title, m.year,
        m.release_year as "releaseYear", m.release_month as "releaseMonth", m.release_day as "releaseDay",
        m.poster_url as "posterUrl", m.synopsis, m.duration, m.tipo_duracion as "tipoDuracion",
        m.stage, m.sound_type as "soundType", m.popularity,
        (SELECT mat.title FROM movie_alternative_titles mat
         WHERE mat.movie_id = m.id AND ${norm('mat.title')} LIKE ${searchPattern}
         LIMIT 1) as "matchedAlternativeTitle"
      FROM movies m
      WHERE ${norm('m.title')} LIKE ${searchPattern}
        OR EXISTS (
          SELECT 1 FROM movie_alternative_titles mat
          WHERE mat.movie_id = m.id AND ${norm('mat.title')} LIKE ${searchPattern}
        )
      ORDER BY COALESCE(m.popularity, 0) DESC, m.title ASC
      LIMIT 50
    `
  } else {
    const titleTermConditions = searchTerms.map(t =>
      Prisma.sql`${norm('m.title')} LIKE ${`%${t}%`}`
    )
    const titleWhereClause = Prisma.join(titleTermConditions, ' AND ')
    const altTitleTermConditions = searchTerms.map(t =>
      Prisma.sql`${norm('mat.title')} LIKE ${`%${t}%`}`
    )
    const altTitleWhereClause = Prisma.join(altTitleTermConditions, ' AND ')
    movies = await prisma.$queryRaw`
      SELECT m.id, m.slug, m.title, m.year,
        m.release_year as "releaseYear", m.release_month as "releaseMonth", m.release_day as "releaseDay",
        m.poster_url as "posterUrl", m.synopsis, m.duration, m.tipo_duracion as "tipoDuracion",
        m.stage, m.sound_type as "soundType", m.popularity,
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
        CASE WHEN ${norm('m.title')} LIKE ${searchPattern} THEN 0 ELSE 1 END,
        COALESCE(m.popularity, 0) DESC, m.title ASC
      LIMIT 50
    `
  }

  const { directors, genres, countries } = await getMovieRelations(movies.map(m => m.id))

  const formattedMovies = movies.map(movie => ({
    id: movie.id, slug: movie.slug, title: movie.title, year: movie.year,
    releaseYear: movie.releaseYear, releaseMonth: movie.releaseMonth, releaseDay: movie.releaseDay,
    posterUrl: movie.posterUrl, synopsis: movie.synopsis, duration: movie.duration,
    tipoDuracion: movie.tipoDuracion, stage: movie.stage, soundType: movie.soundType,
    directors: directors.get(movie.id) ?? [],
    genres: genres.get(movie.id) ?? [],
    countries: countries.get(movie.id) ?? [],
    matchedAlternativeTitle: movie.matchedAlternativeTitle ?? null,
  }))

  // ============ PERSONAS ============
  const people = await prisma.$queryRaw<(PersonSearchRow & { matchedAlternativeName: string | null })[]>`
    SELECT
      p.id, p.slug, p.first_name as "firstName", p.last_name as "lastName",
      p.photo_url as "photoUrl", p.gender,
      p.birth_year as "birthYear", p.birth_month as "birthMonth", p.birth_day as "birthDay",
      p.death_year as "deathYear", p.death_month as "deathMonth", p.death_day as "deathDay",
      (
        (SELECT COUNT(*)::int FROM movie_cast WHERE person_id = p.id) +
        (SELECT COUNT(*)::int FROM movie_crew WHERE person_id = p.id)
      ) as "movieCount",
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
      (
        (SELECT COUNT(*) FROM movie_cast WHERE person_id = p.id) +
        (SELECT COUNT(*) FROM movie_crew WHERE person_id = p.id)
      ) DESC,
      p.last_name ASC NULLS LAST,
      p.first_name ASC NULLS LAST
    LIMIT 50
  `

  const { locations, featured } = await getPersonExtras(people.map(p => p.id))

  const formattedPeople = people.map(person => {
    const loc = locations.get(person.id)
    const fm = featured.get(person.id)
    return {
      ...person,
      birthLocationPath: loc?.birthPath ?? null,
      deathLocationPath: loc?.deathPath ?? null,
      matchedAlternativeName: person.matchedAlternativeName ?? null,
      featuredMovie: fm ? {
        id: fm.movie_id, slug: fm.movie_slug, title: fm.movie_title,
        year: fm.movie_year, role: fm.role_name,
      } : null,
    }
  })

  return NextResponse.json({
    movies: formattedMovies,
    people: formattedPeople,
    totalMovies: formattedMovies.length,
    totalPeople: formattedPeople.length,
  })
}, 'buscar')
