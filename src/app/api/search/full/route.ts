// src/app/api/search/full/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api/api-handler'

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

    // Intentar búsqueda con unaccent primero
    try {
      // Búsqueda de películas con normalización
      // Multi-term: cada palabra del query debe aparecer en el título
      let movies: any[]
      if (searchTerms.length <= 1) {
        movies = await prisma.$queryRaw<any[]>`
          SELECT
            id,
            slug,
            title,
            year,
            release_year as "releaseYear",
            release_month as "releaseMonth",
            release_day as "releaseDay",
            poster_url as "posterUrl",
            synopsis
          FROM movies
          WHERE
            unaccent(LOWER(title)) LIKE unaccent(${searchPattern})
          ORDER BY
            COALESCE(year, release_year) DESC NULLS LAST,
            title ASC
          LIMIT 50
        `
      } else {
        const termConditions = searchTerms.map(t =>
          Prisma.sql`unaccent(LOWER(title)) LIKE unaccent(${`%${t}%`})`
        )
        const whereClause = Prisma.join(termConditions, ' AND ')
        movies = await prisma.$queryRaw<any[]>`
          SELECT
            id,
            slug,
            title,
            year,
            release_year as "releaseYear",
            release_month as "releaseMonth",
            release_day as "releaseDay",
            poster_url as "posterUrl",
            synopsis
          FROM movies
          WHERE ${whereClause}
          ORDER BY
            CASE
              WHEN unaccent(LOWER(title)) LIKE unaccent(${searchPattern}) THEN 1
              ELSE 2
            END,
            COALESCE(year, release_year) DESC NULLS LAST,
            title ASC
          LIMIT 50
        `
      }

      // Búsqueda de personas con normalización
      const people = await prisma.$queryRaw<any[]>`
        SELECT 
          p.id,
          p.slug,
          p.first_name as "firstName",
          p.last_name as "lastName",
          p.photo_url as "photoUrl",
          p.birth_year as "birthYear",
          p.birth_month as "birthMonth",
          p.birth_day as "birthDay",
          p.death_year as "deathYear",
          p.death_month as "deathMonth",
          p.death_day as "deathDay",
          p.biography,
          (SELECT COUNT(*)::int FROM movie_cast WHERE person_id = p.id) as cast_roles,
          (SELECT COUNT(*)::int FROM movie_crew WHERE person_id = p.id) as crew_roles
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

      // Formatear personas con _count
      const formattedPeople = people.map(person => ({
        ...person,
        _count: {
          castRoles: person.cast_roles || 0,
          crewRoles: person.crew_roles || 0
        }
      }))

      return NextResponse.json({
        movies: movies,
        people: formattedPeople,
        totalMovies: movies.length,
        totalPeople: formattedPeople.length
      })

    } catch (err) {
      console.log('Unaccent not available, using fallback search')
      
      // Fallback: búsqueda estándar sin normalización
      const [movies, people] = await Promise.all([
        prisma.movie.findMany({
          where: {
            AND: searchTerms.map(term => ({
              title: { contains: term, mode: 'insensitive' as const }
            }))
          },
          select: {
            id: true,
            slug: true,
            title: true,
            year: true,
            releaseYear: true,
            releaseMonth: true,
            releaseDay: true,
            posterUrl: true,
            synopsis: true
          },
          orderBy: [
            { year: 'desc' },
            { releaseYear: 'desc' },
            { title: 'asc' }
          ],
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
            biography: true,
            _count: {
              select: {
                castRoles: true,
                crewRoles: true
              }
            }
          },
          take: 50
        })
      ])

      // Ordenar personas por total de participaciones
      const sortedPeople = people.sort((a, b) => {
        const totalA = (a._count?.castRoles || 0) + (a._count?.crewRoles || 0)
        const totalB = (b._count?.castRoles || 0) + (b._count?.crewRoles || 0)
        return totalB - totalA
      })

      return NextResponse.json({
        movies: movies,
        people: sortedPeople,
        totalMovies: movies.length,
        totalPeople: sortedPeople.length
      })
    }
}, 'buscar')