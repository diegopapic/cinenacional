// src/lib/queries/personas.ts
// Server-side data fetching for the personas listing page.
// Extracts Prisma queries from /api/people/list and /api/people/filters.

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// ─── Types ───────────────────────────────────────────────────────

export interface PersonListItem {
  id: number
  slug: string
  firstName: string | null
  lastName: string | null
  realName: string | null
  name: string
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
  featuredMovie: {
    id: number
    slug: string
    title: string
    year: number | null
    role: string
  } | null
  movieCount: number
}

export interface PersonsPageData {
  data: PersonListItem[]
  totalCount: number
  page: number
  totalPages: number
  hasMore: boolean
}

export interface PersonFilters {
  search?: string
  gender?: string
  birthLocationId?: number
  deathLocationId?: number
  nationalityId?: number
  roleId?: string // number, 'ACTOR', or 'SELF'
  birthYearFrom?: number
  birthYearTo?: number
  deathYearFrom?: number
  deathYearTo?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface LocationFilterOption {
  id: number
  name: string
  fullPath: string
  count: number
}

export interface RoleFilterOption {
  id: number | string
  name: string
  department: string
  isActor: boolean
  count: number
}

export interface PersonFilterOptions {
  birthLocations: LocationFilterOption[]
  deathLocations: LocationFilterOption[]
  nationalities: Array<{ id: number; name: string; gentilicio?: string; count: number }>
  roles: RoleFilterOption[]
  years: {
    birthYearMin: number | null
    birthYearMax: number | null
    deathYearMin: number | null
    deathYearMax: number | null
  }
}

// ─── Helpers ─────────────────────────────────────────────────────

const DEFAULT_LIMIT = 60

async function getLocationDescendantIds(locationId: number): Promise<number[]> {
  const descendants = await prisma.$queryRaw<Array<{ id: number }>>`
    WITH RECURSIVE location_descendants AS (
      SELECT id FROM locations WHERE id = ${locationId}
      UNION ALL
      SELECT l.id FROM locations l
      INNER JOIN location_descendants ld ON l.parent_id = ld.id
    )
    SELECT id FROM location_descendants
  `
  return descendants.map((d) => d.id)
}

function buildWhereClause(
  filters: PersonFilters,
  birthLocationIds: number[],
  deathLocationIds: number[],
): Prisma.PersonWhereInput {
  const where: Prisma.PersonWhereInput = { isActive: true }

  // Search by name
  if (filters.search && filters.search.trim().length >= 2) {
    const searchTerms = filters.search.trim().split(/\s+/)

    if (searchTerms.length === 1) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { realName: { contains: filters.search, mode: 'insensitive' } },
      ]
    } else {
      where.OR = [
        { realName: { contains: filters.search, mode: 'insensitive' } },
        {
          AND: searchTerms.map((term) => ({
            OR: [
              { firstName: { contains: term, mode: 'insensitive' as const } },
              { lastName: { contains: term, mode: 'insensitive' as const } },
            ],
          })),
        },
      ]
    }
  }

  if (filters.gender === 'MALE' || filters.gender === 'FEMALE' || filters.gender === 'OTHER') {
    where.gender = filters.gender
  }

  if (birthLocationIds.length > 0) {
    where.birthLocationId = { in: birthLocationIds }
  }

  if (deathLocationIds.length > 0) {
    where.deathLocationId = { in: deathLocationIds }
  }

  if (filters.nationalityId) {
    where.nationalities = { some: { locationId: filters.nationalityId } }
  }

  if (filters.roleId) {
    if (filters.roleId === 'ACTOR') {
      where.castRoles = { some: { isActor: true } }
    } else if (filters.roleId === 'SELF') {
      where.castRoles = { some: { isActor: false } }
    } else {
      const parsedRoleId = parseInt(filters.roleId, 10)
      if (!isNaN(parsedRoleId) && parsedRoleId > 0) {
        where.crewRoles = { some: { roleId: parsedRoleId } }
      }
    }
  }

  if (filters.birthYearFrom || filters.birthYearTo) {
    where.birthYear = {}
    if (filters.birthYearFrom) where.birthYear.gte = filters.birthYearFrom
    if (filters.birthYearTo) where.birthYear.lte = filters.birthYearTo
  }

  if (filters.deathYearFrom || filters.deathYearTo) {
    where.deathYear = {}
    if (filters.deathYearFrom) where.deathYear.gte = filters.deathYearFrom
    if (filters.deathYearTo) where.deathYear.lte = filters.deathYearTo
  }

  const sortBy = filters.sortBy || 'id'
  if (sortBy === 'birthDate') {
    const existing = typeof where.birthYear === 'object' && where.birthYear ? where.birthYear : {}
    where.birthYear = { ...existing, not: null }
  }
  if (sortBy === 'deathDate') {
    const existing = typeof where.deathYear === 'object' && where.deathYear ? where.deathYear : {}
    where.deathYear = { ...existing, not: null }
  }

  return where
}

/** Build raw SQL WHERE clause for complex sort queries */
function buildRawWhereClause(
  filters: PersonFilters,
  birthLocationIds: number[],
  deathLocationIds: number[],
): Prisma.Sql {
  const conditions: Prisma.Sql[] = [Prisma.sql`p.is_active = true`]

  if (birthLocationIds.length > 0) {
    conditions.push(Prisma.sql`p.birth_location_id = ANY(${birthLocationIds})`)
  }
  if (deathLocationIds.length > 0) {
    conditions.push(Prisma.sql`p.death_location_id = ANY(${deathLocationIds})`)
  }
  if (filters.gender) {
    conditions.push(Prisma.sql`p.gender::text = ${filters.gender}`)
  }
  if (filters.birthYearFrom) {
    conditions.push(Prisma.sql`p.birth_year >= ${filters.birthYearFrom}`)
  }
  if (filters.birthYearTo) {
    conditions.push(Prisma.sql`p.birth_year <= ${filters.birthYearTo}`)
  }
  if (filters.deathYearFrom) {
    conditions.push(Prisma.sql`p.death_year >= ${filters.deathYearFrom}`)
  }
  if (filters.deathYearTo) {
    conditions.push(Prisma.sql`p.death_year <= ${filters.deathYearTo}`)
  }
  if (filters.nationalityId) {
    conditions.push(
      Prisma.sql`EXISTS (SELECT 1 FROM person_nationalities pn WHERE pn.person_id = p.id AND pn.location_id = ${filters.nationalityId})`,
    )
  }
  if (filters.roleId === 'ACTOR') {
    conditions.push(
      Prisma.sql`EXISTS (SELECT 1 FROM movie_cast mc WHERE mc.person_id = p.id AND mc.is_actor = true)`,
    )
  } else if (filters.roleId === 'SELF') {
    conditions.push(
      Prisma.sql`EXISTS (SELECT 1 FROM movie_cast mc WHERE mc.person_id = p.id AND mc.is_actor = false)`,
    )
  } else if (filters.roleId) {
    const parsedRoleId = parseInt(filters.roleId, 10)
    if (!isNaN(parsedRoleId) && parsedRoleId > 0) {
      conditions.push(
        Prisma.sql`EXISTS (SELECT 1 FROM movie_crew mcr WHERE mcr.person_id = p.id AND mcr.role_id = ${parsedRoleId})`,
      )
    }
  }

  const sortBy = filters.sortBy || 'id'
  if (sortBy === 'birthDate') {
    conditions.push(Prisma.sql`p.birth_year IS NOT NULL`)
  }
  if (sortBy === 'deathDate') {
    conditions.push(Prisma.sql`p.death_year IS NOT NULL`)
  }
  if (filters.search && filters.search.trim().length >= 2) {
    const searchTerm = `%${filters.search.trim()}%`
    conditions.push(Prisma.sql`(
      unaccent(p.first_name) ILIKE unaccent(${searchTerm}) OR
      unaccent(p.last_name) ILIKE unaccent(${searchTerm}) OR
      unaccent(p.real_name) ILIKE unaccent(${searchTerm})
    )`)
  }

  return Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
}

// ─── Featured movies & location paths ────────────────────────────

interface PersonRow {
  id: number
  slug: string
  firstName: string | null
  lastName: string | null
  realName: string | null
  photoUrl: string | null
  gender: string | null
  birthYear: number | null
  birthMonth: number | null
  birthDay: number | null
  deathYear: number | null
  deathMonth: number | null
  deathDay: number | null
}

async function enrichPeople(people: PersonRow[]): Promise<PersonListItem[]> {
  if (people.length === 0) return []

  const personIds = people.map((p) => p.id)

  const [locationPaths, castMovies, crewMovies, movieCounts] = await Promise.all([
    prisma.$queryRaw<Array<{
      person_id: number
      birth_location_path: string | null
      death_location_path: string | null
    }>>`
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
      WHERE p.id = ANY(${personIds})
    `,

    prisma.$queryRaw<Array<{
      person_id: number
      movie_id: number
      movie_slug: string
      movie_title: string
      movie_year: number | null
      popularity: number | null
    }>>`
      SELECT DISTINCT ON (mc.person_id)
        mc.person_id, m.id as movie_id, m.slug as movie_slug,
        m.title as movie_title, m.year as movie_year, m.popularity
      FROM movie_cast mc
      INNER JOIN movies m ON m.id = mc.movie_id
      WHERE mc.person_id = ANY(${personIds})
      ORDER BY mc.person_id, m.popularity DESC NULLS LAST, m.year DESC NULLS LAST, m.id DESC
    `,

    prisma.$queryRaw<Array<{
      person_id: number
      movie_id: number
      movie_slug: string
      movie_title: string
      movie_year: number | null
      role_name: string
      popularity: number | null
    }>>`
      SELECT DISTINCT ON (mcr.person_id)
        mcr.person_id, m.id as movie_id, m.slug as movie_slug,
        m.title as movie_title, m.year as movie_year,
        r.name as role_name, m.popularity
      FROM movie_crew mcr
      INNER JOIN movies m ON m.id = mcr.movie_id
      INNER JOIN roles r ON r.id = mcr.role_id
      WHERE mcr.person_id = ANY(${personIds})
      ORDER BY mcr.person_id, m.popularity DESC NULLS LAST, m.year DESC NULLS LAST, m.id DESC
    `,

    prisma.$queryRaw<Array<{ person_id: number; movie_count: number }>>`
      SELECT person_id, COUNT(DISTINCT movie_id)::int as movie_count
      FROM (
        SELECT person_id, movie_id FROM movie_cast WHERE person_id = ANY(${personIds})
        UNION ALL
        SELECT person_id, movie_id FROM movie_crew WHERE person_id = ANY(${personIds})
      ) all_roles
      GROUP BY person_id
    `,
  ])

  const locationPathMap = new Map(
    locationPaths.map((lp) => [lp.person_id, { birthPath: lp.birth_location_path, deathPath: lp.death_location_path }]),
  )
  const castMap = new Map(castMovies.map((c) => [c.person_id, c]))
  const crewMap = new Map(crewMovies.map((c) => [c.person_id, c]))
  const movieCountMap = new Map(movieCounts.map((c) => [c.person_id, c.movie_count]))

  return people.map((person) => {
    const cast = castMap.get(person.id)
    const crew = crewMap.get(person.id)
    const paths = locationPathMap.get(person.id)

    let featuredMovie: PersonListItem['featuredMovie'] = null
    if (cast && crew) {
      const castPop = Number(cast.popularity) || 0
      const crewPop = Number(crew.popularity) || 0
      featuredMovie =
        castPop >= crewPop
          ? { id: cast.movie_id, slug: cast.movie_slug, title: cast.movie_title, year: cast.movie_year, role: 'Actor' }
          : { id: crew.movie_id, slug: crew.movie_slug, title: crew.movie_title, year: crew.movie_year, role: crew.role_name }
    } else if (cast) {
      featuredMovie = { id: cast.movie_id, slug: cast.movie_slug, title: cast.movie_title, year: cast.movie_year, role: 'Actor' }
    } else if (crew) {
      featuredMovie = { id: crew.movie_id, slug: crew.movie_slug, title: crew.movie_title, year: crew.movie_year, role: crew.role_name }
    }

    return {
      id: person.id,
      slug: person.slug,
      firstName: person.firstName,
      lastName: person.lastName,
      realName: person.realName,
      name: `${person.firstName || ''} ${person.lastName || ''}`.trim() || person.realName || 'Sin nombre',
      photoUrl: person.photoUrl,
      gender: person.gender,
      birthYear: person.birthYear,
      birthMonth: person.birthMonth,
      birthDay: person.birthDay,
      deathYear: person.deathYear,
      deathMonth: person.deathMonth,
      deathDay: person.deathDay,
      birthLocationPath: paths?.birthPath || null,
      deathLocationPath: paths?.deathPath || null,
      featuredMovie,
      movieCount: movieCountMap.get(person.id) || 0,
    }
  })
}

// ─── Main Queries ────────────────────────────────────────────────

/**
 * Returns paginated people with filters and sorting.
 * Replicates the logic from /api/people/list.
 */
export async function getPeople(
  filters: PersonFilters,
  page = 1,
  limit = DEFAULT_LIMIT,
): Promise<PersonsPageData> {
  const skip = (page - 1) * limit
  const sortBy = filters.sortBy || 'id'
  const sortOrder = (filters.sortOrder || 'desc') as 'asc' | 'desc'

  // Resolve location descendants
  let birthLocationIds: number[] = []
  let deathLocationIds: number[] = []
  if (filters.birthLocationId) {
    birthLocationIds = await getLocationDescendantIds(filters.birthLocationId)
  }
  if (filters.deathLocationId) {
    deathLocationIds = await getLocationDescendantIds(filters.deathLocationId)
  }

  const where = buildWhereClause(filters, birthLocationIds, deathLocationIds)

  // Alphabetic sort: raw SQL with unaccent
  if (sortBy === 'lastName') {
    const whereClause = buildRawWhereClause(filters, birthLocationIds, deathLocationIds)
    const orderDirection = sortOrder === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`

    const peopleIds = await prisma.$queryRaw<Array<{ id: number }>>`
      SELECT p.id FROM people p
      ${whereClause}
      ORDER BY LOWER(unaccent(COALESCE(p.last_name, ''))) ${orderDirection},
               LOWER(unaccent(COALESCE(p.first_name, ''))) ${orderDirection},
               p.id DESC
      LIMIT ${limit} OFFSET ${skip}
    `

    const personIds = peopleIds.map((p) => p.id)
    if (personIds.length === 0) {
      return { data: [], totalCount: 0, page, totalPages: 0, hasMore: false }
    }

    const people = await prisma.person.findMany({
      where: { id: { in: personIds } },
      select: personSelectFields,
    })

    const ordered = personIds.map((id) => people.find((p) => p.id === id)!).filter(Boolean)
    const [enriched, totalCount] = await Promise.all([enrichPeople(ordered), prisma.person.count({ where })])
    const totalPages = Math.ceil(totalCount / limit)
    return { data: enriched, totalCount, page, totalPages, hasMore: page < totalPages }
  }

  // Movie count sort: raw SQL
  if (sortBy === 'movieCount') {
    const whereClause = buildRawWhereClause(filters, birthLocationIds, deathLocationIds)
    const orderDirection = sortOrder === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`

    const peopleIds = await prisma.$queryRaw<Array<{ id: number }>>`
      SELECT p.id,
        (SELECT COUNT(DISTINCT movie_id) FROM (
          SELECT movie_id FROM movie_cast WHERE person_id = p.id
          UNION
          SELECT movie_id FROM movie_crew WHERE person_id = p.id
        ) all_movies)::int as movie_count
      FROM people p
      ${whereClause}
      ORDER BY movie_count ${orderDirection}, p.id DESC
      LIMIT ${limit} OFFSET ${skip}
    `

    const personIds = peopleIds.map((p) => p.id)
    if (personIds.length === 0) {
      return { data: [], totalCount: 0, page, totalPages: 0, hasMore: false }
    }

    const people = await prisma.person.findMany({
      where: { id: { in: personIds } },
      select: personSelectFields,
    })

    const ordered = personIds.map((id) => people.find((p) => p.id === id)!).filter(Boolean)
    const [enriched, totalCount] = await Promise.all([enrichPeople(ordered), prisma.person.count({ where })])
    const totalPages = Math.ceil(totalCount / limit)
    return { data: enriched, totalCount, page, totalPages, hasMore: page < totalPages }
  }

  // Standard Prisma sorting (id, birthDate, deathDate)
  let orderBy: Prisma.PersonOrderByWithRelationInput | Prisma.PersonOrderByWithRelationInput[]
  switch (sortBy) {
    case 'birthDate':
      orderBy = [
        { birthYear: sortOrder },
        { birthMonth: sortOrder },
        { birthDay: sortOrder },
      ]
      break
    case 'deathDate':
      orderBy = [
        { deathYear: sortOrder },
        { deathMonth: sortOrder },
        { deathDay: sortOrder },
      ]
      break
    case 'id':
    default:
      orderBy = { id: sortOrder }
      break
  }

  const [people, totalCount] = await Promise.all([
    prisma.person.findMany({
      where,
      select: personSelectFields,
      orderBy,
      skip,
      take: limit,
    }),
    prisma.person.count({ where }),
  ])

  const enriched = await enrichPeople(people)
  const totalPages = Math.ceil(totalCount / limit)
  return { data: enriched, totalCount, page, totalPages, hasMore: page < totalPages }
}

const personSelectFields = {
  id: true,
  slug: true,
  firstName: true,
  lastName: true,
  realName: true,
  photoUrl: true,
  gender: true,
  birthYear: true,
  birthMonth: true,
  birthDay: true,
  deathYear: true,
  deathMonth: true,
  deathDay: true,
} satisfies Prisma.PersonSelect

/**
 * Returns filter option data (locations, nationalities, roles, etc. with counts).
 * Replicates the logic from /api/people/filters.
 */
export async function getPeopleFilters(): Promise<PersonFilterOptions> {
  const [birthLocations, deathLocations, nationalities, roles, yearRanges] = await Promise.all([
    // Birth locations with full path and count including descendants
    prisma.$queryRaw<Array<{ id: number; name: string; full_path: string; count: number }>>`
      WITH RECURSIVE
      location_path AS (
        SELECT l.id, l.name, l.parent_id, l.name::text as path
        FROM locations l
        UNION ALL
        SELECT lp.id, lp.name, l.parent_id, lp.path || ', ' || l.name
        FROM location_path lp
        INNER JOIN locations l ON lp.parent_id = l.id
      ),
      location_descendants AS (
        SELECT id as ancestor_id, id as descendant_id FROM locations
        UNION ALL
        SELECT ld.ancestor_id, l.id as descendant_id
        FROM location_descendants ld
        INNER JOIN locations l ON l.parent_id = ld.descendant_id
      ),
      location_counts AS (
        SELECT ld.ancestor_id as location_id, COUNT(DISTINCT p.id) as person_count
        FROM location_descendants ld
        INNER JOIN people p ON p.birth_location_id = ld.descendant_id AND p.is_active = true
        GROUP BY ld.ancestor_id
      ),
      full_paths AS (
        SELECT DISTINCT ON (id) id, path as full_path
        FROM location_path
        ORDER BY id, LENGTH(path) DESC
      )
      SELECT l.id, l.name, fp.full_path, COALESCE(lc.person_count, 0)::int as count
      FROM locations l
      INNER JOIN full_paths fp ON fp.id = l.id
      LEFT JOIN location_counts lc ON lc.location_id = l.id
      WHERE COALESCE(lc.person_count, 0) > 0
      ORDER BY LOWER(unaccent(l.name)) ASC
    `,

    // Death locations with full path and count including descendants
    prisma.$queryRaw<Array<{ id: number; name: string; full_path: string; count: number }>>`
      WITH RECURSIVE
      location_path AS (
        SELECT l.id, l.name, l.parent_id, l.name::text as path
        FROM locations l
        UNION ALL
        SELECT lp.id, lp.name, l.parent_id, lp.path || ', ' || l.name
        FROM location_path lp
        INNER JOIN locations l ON lp.parent_id = l.id
      ),
      location_descendants AS (
        SELECT id as ancestor_id, id as descendant_id FROM locations
        UNION ALL
        SELECT ld.ancestor_id, l.id as descendant_id
        FROM location_descendants ld
        INNER JOIN locations l ON l.parent_id = ld.descendant_id
      ),
      location_counts AS (
        SELECT ld.ancestor_id as location_id, COUNT(DISTINCT p.id) as person_count
        FROM location_descendants ld
        INNER JOIN people p ON p.death_location_id = ld.descendant_id AND p.is_active = true
        GROUP BY ld.ancestor_id
      ),
      full_paths AS (
        SELECT DISTINCT ON (id) id, path as full_path
        FROM location_path
        ORDER BY id, LENGTH(path) DESC
      )
      SELECT l.id, l.name, fp.full_path, COALESCE(lc.person_count, 0)::int as count
      FROM locations l
      INNER JOIN full_paths fp ON fp.id = l.id
      LEFT JOIN location_counts lc ON lc.location_id = l.id
      WHERE COALESCE(lc.person_count, 0) > 0
      ORDER BY LOWER(unaccent(l.name)) ASC
    `,

    // Nationalities
    prisma.$queryRaw<Array<{ id: number; name: string; gentilicio: string | null; count: number }>>`
      SELECT l.id, l.name, l.gentilicio, COUNT(DISTINCT pn.person_id)::int as count
      FROM locations l
      INNER JOIN person_nationalities pn ON pn.location_id = l.id
      GROUP BY l.id, l.name, l.gentilicio
      ORDER BY LOWER(unaccent(l.name)) ASC
    `,

    // Technical roles
    prisma.$queryRaw<Array<{ id: number; name: string; department: string; count: number }>>`
      SELECT r.id, r.name, r.department, COUNT(DISTINCT mc.person_id)::int as count
      FROM roles r
      INNER JOIN movie_crew mc ON mc.role_id = r.id
      WHERE r.is_active = true
      GROUP BY r.id, r.name, r.department
      HAVING COUNT(DISTINCT mc.person_id) > 0
      ORDER BY count DESC
    `,

    // Year ranges
    prisma.$queryRaw<Array<{
      birth_year_min: number | null
      birth_year_max: number | null
      death_year_min: number | null
      death_year_max: number | null
    }>>`
      SELECT
        MIN(birth_year) as birth_year_min, MAX(birth_year) as birth_year_max,
        MIN(death_year) as death_year_min, MAX(death_year) as death_year_max
      FROM people WHERE is_active = true
    `,
  ])

  // Actor and self counts
  const [actorCount, selfCount] = await Promise.all([
    prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(DISTINCT person_id)::int as count FROM movie_cast WHERE is_actor = true
    `,
    prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(DISTINCT person_id)::int as count FROM movie_cast WHERE is_actor = false
    `,
  ])

  return {
    birthLocations: birthLocations.map((loc) => ({
      id: loc.id,
      name: loc.name,
      fullPath: loc.full_path,
      count: loc.count,
    })),
    deathLocations: deathLocations.map((loc) => ({
      id: loc.id,
      name: loc.name,
      fullPath: loc.full_path,
      count: loc.count,
    })),
    nationalities: nationalities.map((nat) => ({
      id: nat.id,
      name: nat.name,
      gentilicio: nat.gentilicio || undefined,
      count: nat.count,
    })),
    roles: [
      { id: 'ACTOR', name: 'Actor / Actriz', department: 'ACTUACION', isActor: true, count: actorCount[0]?.count || 0 },
      { id: 'SELF', name: 'Como sí mismo/a', department: 'ACTUACION', isActor: false, count: selfCount[0]?.count || 0 },
      ...roles.map((role) => ({
        id: role.id,
        name: role.name,
        department: role.department,
        isActor: false,
        count: role.count,
      })),
    ],
    years: {
      birthYearMin: yearRanges[0]?.birth_year_min || null,
      birthYearMax: yearRanges[0]?.birth_year_max || null,
      deathYearMin: yearRanges[0]?.death_year_min || null,
      deathYearMax: yearRanges[0]?.death_year_max || null,
    },
  }
}
