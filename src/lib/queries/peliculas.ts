// src/lib/queries/peliculas.ts
// Server-side data fetching for the películas listing page.
// Extracts Prisma queries from /api/movies/list and /api/movies/filters.

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { MOVIE_STAGES, SOUND_TYPES, TIPOS_DURACION } from '@/lib/movies/movieConstants'

// ─── Constants ───────────────────────────────────────────────────

const DEFAULT_LIMIT = 60

// ─── Types ───────────────────────────────────────────────────────

export interface MovieListItem {
  id: number
  slug: string
  title: string
  year: number | null
  releaseYear: number | null
  releaseMonth: number | null
  releaseDay: number | null
  duration: number | null
  tipoDuracion: string | null
  posterUrl: string | null
  stage: string
  soundType: string | null
  synopsis: string | null
  colorType: { id: number; name: string } | null
  genres: Array<{ id: number; name: string }>
  directors: Array<{ id: number; slug: string; name: string }>
  countries: Array<{ id: number; name: string }>
}

export interface MoviesPageData {
  data: MovieListItem[]
  totalCount: number
  page: number
  totalPages: number
  hasMore: boolean
}

export interface MovieFilters {
  search?: string
  soundType?: string
  colorTypeId?: number
  tipoDuracion?: string
  countryId?: number
  genreId?: number
  ratingId?: number
  releaseDateFrom?: string
  releaseDateTo?: string
  productionYearFrom?: number
  productionYearTo?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface MovieFilterOptions {
  soundTypes: Array<{ id: string; name: string; count: number }>
  colorTypes: Array<{ id: number; name: string; count: number }>
  durationTypes: Array<{ id: string; name: string; count: number }>
  countries: Array<{ id: number; name: string; count: number }>
  genres: Array<{ id: number; name: string; count: number }>
  ratings: Array<{ id: number; name: string; count: number }>
  stages: Array<{ id: string; name: string; count: number }>
  years: {
    releaseYearMin: number | null
    releaseYearMax: number | null
    productionYearMin: number | null
    productionYearMax: number | null
  }
}

// ─── Helpers ─────────────────────────────────────────────────────

function buildWhereClause(filters: MovieFilters): Prisma.MovieWhereInput {
  const where: Prisma.MovieWhereInput = {}

  if (filters.search) {
    where.title = { contains: filters.search, mode: 'insensitive' }
  }

  if (filters.soundType) {
    where.soundType = filters.soundType
  }

  if (filters.colorTypeId) {
    where.colorTypeId = filters.colorTypeId
  }

  if (filters.tipoDuracion) {
    where.tipoDuracion = filters.tipoDuracion
  }

  if (filters.countryId) {
    where.movieCountries = { some: { countryId: filters.countryId } }
  }

  if (filters.genreId) {
    where.genres = { some: { genreId: filters.genreId } }
  }

  if (filters.ratingId) {
    where.ratingId = filters.ratingId
  }

  // Release date filters (YYYY-MM-DD)
  if (filters.releaseDateFrom || filters.releaseDateTo) {
    const conditions: Prisma.MovieWhereInput[] = []

    if (filters.releaseDateFrom) {
      const [yearFrom, monthFrom, dayFrom] = filters.releaseDateFrom.split('-').map(Number)
      conditions.push({
        OR: [
          { releaseYear: { gt: yearFrom } },
          {
            releaseYear: yearFrom,
            OR: [
              { releaseMonth: { gt: monthFrom } },
              { releaseMonth: monthFrom, releaseDay: { gte: dayFrom } },
              { releaseMonth: monthFrom, releaseDay: null },
              { releaseMonth: null },
            ],
          },
        ],
      })
    }

    if (filters.releaseDateTo) {
      const [yearTo, monthTo, dayTo] = filters.releaseDateTo.split('-').map(Number)
      conditions.push({
        OR: [
          { releaseYear: { lt: yearTo } },
          {
            releaseYear: yearTo,
            OR: [
              { releaseMonth: { lt: monthTo } },
              { releaseMonth: monthTo, releaseDay: { lte: dayTo } },
              { releaseMonth: monthTo, releaseDay: null },
              { releaseMonth: null },
            ],
          },
        ],
      })
    }

    if (conditions.length > 0) {
      where.AND = conditions
    }
  }

  // Production year filters
  if (filters.productionYearFrom || filters.productionYearTo) {
    where.year = {}
    if (filters.productionYearFrom) where.year.gte = filters.productionYearFrom
    if (filters.productionYearTo) where.year.lte = filters.productionYearTo
  }

  return where
}

/** Prisma select for movie list items */
const movieListSelect = {
  id: true,
  slug: true,
  title: true,
  year: true,
  releaseYear: true,
  releaseMonth: true,
  releaseDay: true,
  duration: true,
  tipoDuracion: true,
  posterUrl: true,
  stage: true,
  soundType: true,
  synopsis: true,
  colorType: { select: { id: true, name: true } },
  genres: {
    select: { genre: { select: { id: true, name: true } } },
    take: 3,
  },
  crew: {
    where: { roleId: 2 },
    select: {
      person: { select: { id: true, slug: true, firstName: true, lastName: true } },
    },
    take: 2,
  },
  movieCountries: {
    select: { location: { select: { id: true, name: true } } },
  },
} satisfies Prisma.MovieSelect

type RawMovieFromSelect = Prisma.MovieGetPayload<{ select: typeof movieListSelect }>

function transformMovie(movie: RawMovieFromSelect): MovieListItem {
  return {
    id: movie.id,
    slug: movie.slug,
    title: movie.title,
    year: movie.year,
    releaseYear: movie.releaseYear,
    releaseMonth: movie.releaseMonth,
    releaseDay: movie.releaseDay,
    duration: movie.duration,
    tipoDuracion: movie.tipoDuracion,
    posterUrl: movie.posterUrl,
    stage: movie.stage,
    soundType: movie.soundType,
    synopsis: movie.synopsis,
    colorType: movie.colorType,
    genres: movie.genres.map((g) => ({ id: g.genre.id, name: g.genre.name })),
    directors: movie.crew.map((c) => ({
      id: c.person.id,
      slug: c.person.slug,
      name: [c.person.firstName, c.person.lastName].filter(Boolean).join(' '),
    })),
    countries: movie.movieCountries.map((mc) => ({
      id: mc.location.id,
      name: mc.location.name,
    })),
  }
}

// ─── Queries ─────────────────────────────────────────────────────

/**
 * Returns paginated movies with filters and sorting.
 * Replicates the logic from /api/movies/list.
 */
export async function getMovies(
  filters: MovieFilters,
  page = 1,
  limit = DEFAULT_LIMIT,
): Promise<MoviesPageData> {
  const where = buildWhereClause(filters)
  const skip = (page - 1) * limit
  const sortBy = filters.sortBy || 'updatedAt'
  const sortOrder = filters.sortOrder || 'desc'

  // Alphabetic sort uses raw SQL for unaccent + article stripping
  if (sortBy === 'title') {
    const [data, totalCount] = await Promise.all([
      getMoviesWithAlphabeticSort(where, sortOrder, skip, limit),
      prisma.movie.count({ where }),
    ])
    const totalPages = Math.ceil(totalCount / limit)
    return { data, totalCount, page, totalPages, hasMore: page < totalPages }
  }

  // Standard Prisma sorting
  let orderBy: Prisma.MovieOrderByWithRelationInput | Prisma.MovieOrderByWithRelationInput[]
  const nullsLast = (dir: 'asc' | 'desc') =>
    ({ sort: dir, nulls: 'last' }) as const

  switch (sortBy) {
    case 'releaseDate':
      orderBy = [
        { releaseYear: nullsLast(sortOrder) },
        { releaseMonth: nullsLast(sortOrder) },
        { releaseDay: nullsLast(sortOrder) },
      ]
      break
    case 'duration':
      orderBy = { duration: nullsLast(sortOrder) }
      break
    case 'popularity':
      orderBy = { popularity: nullsLast(sortOrder) }
      break
    case 'id':
      orderBy = { id: sortOrder }
      break
    case 'updatedAt':
    default:
      orderBy = { updatedAt: sortOrder }
      break
  }

  const [movies, totalCount] = await Promise.all([
    prisma.movie.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: movieListSelect,
    }),
    prisma.movie.count({ where }),
  ])

  const totalPages = Math.ceil(totalCount / limit)
  return {
    data: movies.map(transformMovie),
    totalCount,
    page,
    totalPages,
    hasMore: page < totalPages,
  }
}

/**
 * Returns filter option data (genres, countries, ratings, etc. with counts).
 * Replicates the logic from /api/movies/filters.
 */
export async function getMovieFilters(): Promise<MovieFilterOptions> {
  const [
    soundTypes,
    colorTypes,
    durationTypes,
    countries,
    genres,
    ratings,
    stages,
    yearRanges,
  ] = await Promise.all([
    prisma.$queryRaw<Array<{ sound_type: string; count: bigint }>>`
      SELECT sound_type, COUNT(*) as count
      FROM movies
      WHERE sound_type IS NOT NULL AND sound_type != ''
      GROUP BY sound_type
      ORDER BY count DESC
    `,
    prisma.$queryRaw<Array<{ id: number; name: string; count: bigint }>>`
      SELECT ct.id, ct.name, COUNT(m.id) as count
      FROM color_types ct
      INNER JOIN movies m ON m.color_type_id = ct.id
      GROUP BY ct.id, ct.name
      ORDER BY count DESC
    `,
    prisma.$queryRaw<Array<{ tipo_duracion: string; count: bigint }>>`
      SELECT tipo_duracion, COUNT(*) as count
      FROM movies
      WHERE tipo_duracion IS NOT NULL AND tipo_duracion != ''
      GROUP BY tipo_duracion
      ORDER BY count DESC
    `,
    prisma.$queryRaw<Array<{ id: number; name: string; count: bigint }>>`
      SELECT l.id, l.name, COUNT(DISTINCT mc.movie_id) as count
      FROM locations l
      INNER JOIN movie_countries mc ON mc.country_id = l.id
      WHERE l.name != 'Argentina'
      GROUP BY l.id, l.name
      HAVING COUNT(DISTINCT mc.movie_id) > 0
      ORDER BY l.name ASC
    `,
    prisma.$queryRaw<Array<{ id: number; name: string; count: bigint }>>`
      SELECT g.id, g.name, COUNT(DISTINCT mg.movie_id) as count
      FROM genres g
      INNER JOIN movie_genres mg ON mg.genre_id = g.id
      GROUP BY g.id, g.name
      ORDER BY g.name ASC
    `,
    prisma.$queryRaw<Array<{ id: number; name: string; abbreviation: string | null; count: bigint }>>`
      SELECT r.id, r.name, r.abbreviation, COUNT(m.id) as count
      FROM ratings r
      INNER JOIN movies m ON m.rating_id = r.id
      GROUP BY r.id, r.name, r.abbreviation, r."order"
      ORDER BY r."order" ASC
    `,
    prisma.$queryRaw<Array<{ stage: string; count: bigint }>>`
      SELECT stage, COUNT(*) as count
      FROM movies
      GROUP BY stage
      ORDER BY count DESC
    `,
    prisma.$queryRaw<Array<{
      release_year_min: number | null
      release_year_max: number | null
      production_year_min: number | null
      production_year_max: number | null
    }>>`
      SELECT
        MIN(release_year) as release_year_min,
        MAX(release_year) as release_year_max,
        MIN(year) as production_year_min,
        MAX(year) as production_year_max
      FROM movies
    `,
  ])

  return {
    soundTypes: soundTypes.map((s) => ({
      id: s.sound_type,
      name: formatSoundType(s.sound_type),
      count: Number(s.count),
    })),
    colorTypes: colorTypes.map((c) => ({
      id: c.id,
      name: c.name,
      count: Number(c.count),
    })),
    durationTypes: durationTypes.map((d) => ({
      id: d.tipo_duracion,
      name: formatDurationType(d.tipo_duracion),
      count: Number(d.count),
    })),
    countries: countries.map((c) => ({
      id: c.id,
      name: c.name,
      count: Number(c.count),
    })),
    genres: genres.map((g) => ({
      id: g.id,
      name: g.name,
      count: Number(g.count),
    })),
    ratings: ratings.map((r) => ({
      id: r.id,
      name: r.abbreviation || r.name,
      count: Number(r.count),
    })),
    stages: stages.map((s) => ({
      id: s.stage,
      name: formatStage(s.stage),
      count: Number(s.count),
    })),
    years: {
      releaseYearMin: yearRanges[0]?.release_year_min || null,
      releaseYearMax: yearRanges[0]?.release_year_max || null,
      productionYearMin: yearRanges[0]?.production_year_min || null,
      productionYearMax: yearRanges[0]?.production_year_max || null,
    },
  }
}

// ─── Alphabetic sort (raw SQL) ───────────────────────────────────

interface RawAlphabeticMovie {
  id: number
  slug: string
  title: string
  year: number | null
  release_year: number | null
  release_month: number | null
  release_day: number | null
  duration: number | null
  tipo_duracion: string | null
  poster_url: string | null
  stage: string
  sound_type: string | null
  synopsis: string | null
  color_type_id: number | null
}

async function getMoviesWithAlphabeticSort(
  where: Prisma.MovieWhereInput,
  sortOrder: 'asc' | 'desc',
  skip: number,
  limit: number,
): Promise<MovieListItem[]> {
  const whereClauses: string[] = []
  const params: (string | number | null)[] = []
  let paramIndex = 1

  if (where.title && typeof where.title === 'object' && 'contains' in where.title) {
    whereClauses.push(`m.title ILIKE $${paramIndex}`)
    params.push(`%${where.title.contains}%`)
    paramIndex++
  }

  if (where.soundType) {
    whereClauses.push(`m.sound_type = $${paramIndex}`)
    params.push(where.soundType as string)
    paramIndex++
  }

  if (where.colorTypeId) {
    whereClauses.push(`m.color_type_id = $${paramIndex}`)
    params.push(where.colorTypeId as number)
    paramIndex++
  }

  if (where.tipoDuracion) {
    whereClauses.push(`m.tipo_duracion = $${paramIndex}`)
    params.push(where.tipoDuracion as string)
    paramIndex++
  }

  if (where.movieCountries && 'some' in where.movieCountries) {
    whereClauses.push(
      `EXISTS (SELECT 1 FROM movie_countries mc WHERE mc.movie_id = m.id AND mc.country_id = $${paramIndex})`,
    )
    const movieCountrySome = where.movieCountries.some as { countryId: number }
    params.push(movieCountrySome.countryId)
    paramIndex++
  }

  if (where.genres && 'some' in where.genres) {
    whereClauses.push(
      `EXISTS (SELECT 1 FROM movie_genres mg WHERE mg.movie_id = m.id AND mg.genre_id = $${paramIndex})`,
    )
    const genreSome = where.genres.some as { genreId: number }
    params.push(genreSome.genreId)
    paramIndex++
  }

  if (where.ratingId) {
    whereClauses.push(`m.rating_id = $${paramIndex}`)
    params.push(where.ratingId as number)
    paramIndex++
  }

  if (where.year && typeof where.year === 'object') {
    if ('gte' in where.year) {
      whereClauses.push(`m.year >= $${paramIndex}`)
      params.push(where.year.gte as number)
      paramIndex++
    }
    if ('lte' in where.year) {
      whereClauses.push(`m.year <= $${paramIndex}`)
      params.push(where.year.lte as number)
      paramIndex++
    }
  }

  const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''
  const orderDirection = sortOrder === 'desc' ? 'DESC' : 'ASC'

  const query = `
    WITH cleaned_titles AS (
      SELECT
        m.*,
        TRIM(
          regexp_replace(
            regexp_replace(
              m.title,
              '^(el|la|los|las|un|una|unos|unas)[[:space:]]+',
              '',
              'i'
            ),
            '^[^a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ]+',
            ''
          )
        ) as sort_title
      FROM movies m
      ${whereSQL}
    )
    SELECT
      id, slug, title, year, release_year, release_month, release_day,
      duration, tipo_duracion, poster_url, stage, sound_type, synopsis,
      color_type_id
    FROM cleaned_titles
    ORDER BY
      CASE WHEN sort_title = '' OR sort_title IS NULL THEN 1 ELSE 0 END,
      LOWER(unaccent(COALESCE(NULLIF(sort_title, ''), title))) ${orderDirection},
      title ${orderDirection}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `

  params.push(limit, skip)

  const rawMovies = await prisma.$queryRawUnsafe<RawAlphabeticMovie[]>(query, ...params)
  const movieIds = rawMovies.map((m) => m.id)

  if (movieIds.length === 0) return []

  // Load relations in parallel
  const [colorTypes, genreRows, crewRows, countryRows] = await Promise.all([
    prisma.colorType.findMany({
      where: {
        id: {
          in: rawMovies.map((m) => m.color_type_id).filter((id): id is number => id != null),
        },
      },
      select: { id: true, name: true },
    }),
    prisma.movieGenre.findMany({
      where: { movieId: { in: movieIds } },
      select: { movieId: true, genre: { select: { id: true, name: true } } },
      take: movieIds.length * 3,
    }),
    prisma.movieCrew.findMany({
      where: { movieId: { in: movieIds }, roleId: 2 },
      select: {
        movieId: true,
        person: { select: { id: true, slug: true, firstName: true, lastName: true } },
      },
      take: movieIds.length * 2,
    }),
    prisma.movieCountry.findMany({
      where: { movieId: { in: movieIds } },
      select: { movieId: true, location: { select: { id: true, name: true } } },
    }),
  ])

  const colorTypeMap = new Map(colorTypes.map((ct) => [ct.id, ct]))
  const genresByMovie = new Map<number, typeof genreRows>()
  const crewByMovie = new Map<number, typeof crewRows>()
  const countriesByMovie = new Map<number, typeof countryRows>()

  for (const g of genreRows) {
    const existing = genresByMovie.get(g.movieId) || []
    if (existing.length < 3) {
      existing.push(g)
      genresByMovie.set(g.movieId, existing)
    }
  }

  for (const c of crewRows) {
    const existing = crewByMovie.get(c.movieId) || []
    if (existing.length < 2) {
      existing.push(c)
      crewByMovie.set(c.movieId, existing)
    }
  }

  for (const c of countryRows) {
    const existing = countriesByMovie.get(c.movieId) || []
    existing.push(c)
    countriesByMovie.set(c.movieId, existing)
  }

  return rawMovies.map((movie) => ({
    id: movie.id,
    slug: movie.slug,
    title: movie.title,
    year: movie.year,
    releaseYear: movie.release_year,
    releaseMonth: movie.release_month,
    releaseDay: movie.release_day,
    duration: movie.duration,
    tipoDuracion: movie.tipo_duracion,
    posterUrl: movie.poster_url,
    stage: movie.stage,
    soundType: movie.sound_type,
    synopsis: movie.synopsis,
    colorType: movie.color_type_id ? colorTypeMap.get(movie.color_type_id) || null : null,
    genres: (genresByMovie.get(movie.id) || []).map((g) => ({
      id: g.genre.id,
      name: g.genre.name,
    })),
    directors: (crewByMovie.get(movie.id) || []).map((c) => ({
      id: c.person.id,
      slug: c.person.slug,
      name: [c.person.firstName, c.person.lastName].filter(Boolean).join(' '),
    })),
    countries: (countriesByMovie.get(movie.id) || []).map((c) => ({
      id: c.location.id,
      name: c.location.name,
    })),
  }))
}

// ─── Format helpers ──────────────────────────────────────────────

function formatSoundType(type: string): string {
  const found = SOUND_TYPES.find((s) => s.value.toLowerCase() === type.toLowerCase())
  return found ? found.label : type
}

function formatDurationType(type: string): string {
  const found = TIPOS_DURACION.find((d) => d.value.toLowerCase() === type.toLowerCase())
  return found ? found.label : type
}

function formatStage(stage: string): string {
  const found = MOVIE_STAGES.find((s) => s.value === stage)
  return found ? found.label : stage
}
