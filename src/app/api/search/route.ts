// src/app/api/search/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api/api-handler'

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
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!query || query.length < 2) {
      return NextResponse.json({ 
        movies: [], 
        people: [], 
        total: 0 
      })
    }

    const searchQuery = query.toLowerCase().trim()
    const searchPattern = `%${searchQuery}%`
    const searchTerms = searchQuery.split(/\s+/).filter(term => term.length > 0)

    // Búsqueda de películas con normalización de acentos
    // Cada palabra del query debe aparecer en el título (en cualquier orden)
    let movies: any[] = []
    try {
      if (searchTerms.length <= 1) {
        movies = await prisma.$queryRaw`
          SELECT
            id,
            slug,
            title,
            year,
            release_year as "releaseYear",
            poster_url as "posterUrl"
          FROM movies
          WHERE
            unaccent(LOWER(title)) LIKE unaccent(${searchPattern})
          ORDER BY
            CASE
              WHEN unaccent(LOWER(title)) = unaccent(${searchQuery}) THEN 1
              WHEN unaccent(LOWER(title)) LIKE unaccent(${searchQuery + '%'}) THEN 2
              ELSE 3
            END,
            popularity DESC NULLS LAST,
            title ASC
          LIMIT ${limit}
        `
      } else {
        // Multi-term: cada palabra debe aparecer en el título
        const termConditions = searchTerms.map(t =>
          Prisma.sql`unaccent(LOWER(title)) LIKE unaccent(${`%${t}%`})`
        )
        const whereClause = Prisma.join(termConditions, ' AND ')
        movies = await prisma.$queryRaw`
          SELECT
            id,
            slug,
            title,
            year,
            release_year as "releaseYear",
            poster_url as "posterUrl"
          FROM movies
          WHERE ${whereClause}
          ORDER BY
            CASE
              WHEN unaccent(LOWER(title)) = unaccent(${searchQuery}) THEN 1
              WHEN unaccent(LOWER(title)) LIKE unaccent(${searchQuery + '%'}) THEN 2
              WHEN unaccent(LOWER(title)) LIKE unaccent(${searchPattern}) THEN 3
              ELSE 4
            END,
            popularity DESC NULLS LAST,
            title ASC
          LIMIT ${limit}
        `
      }
    } catch (err) {
      console.log('Falling back to standard search for movies')
      // Fallback si unaccent no está instalado
      const movieResults = await prisma.movie.findMany({
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
          posterUrl: true
        },
        take: limit,
        orderBy: [
          { popularity: 'desc' },
          { title: 'asc' }
        ]
      })
      movies = movieResults
    }

    // Búsqueda de personas con normalización de acentos
    let people: any[] = []
    
    try {
      if (searchTerms.length === 1) {
        // Búsqueda simple con un término
        people = await prisma.$queryRaw`
          SELECT 
            id,
            slug,
            first_name,
            last_name,
            real_name,
            photo_url,
            birth_year,
            death_year
          FROM people
          WHERE is_active = true
          AND (
            unaccent(LOWER(COALESCE(first_name, ''))) LIKE unaccent(${searchPattern})
            OR unaccent(LOWER(COALESCE(last_name, ''))) LIKE unaccent(${searchPattern})
            OR unaccent(LOWER(COALESCE(real_name, ''))) LIKE unaccent(${searchPattern})
            OR unaccent(LOWER(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))) LIKE unaccent(${searchPattern})
          )
          ORDER BY 
            CASE 
              WHEN unaccent(LOWER(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))) = unaccent(${searchQuery}) THEN 1
              WHEN unaccent(LOWER(COALESCE(first_name, ''))) = unaccent(${searchQuery}) OR unaccent(LOWER(COALESCE(last_name, ''))) = unaccent(${searchQuery}) THEN 2
              WHEN unaccent(LOWER(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))) LIKE unaccent(${searchQuery + '%'}) THEN 3
              ELSE 4
            END,
            last_name ASC NULLS LAST,
            first_name ASC NULLS LAST
          LIMIT ${limit}
        `
      } else {
        // Búsqueda con múltiples términos
        const firstTerm = `%${searchTerms[0]}%`
        const secondTerm = `%${searchTerms[1]}%`
        
        people = await prisma.$queryRaw`
          SELECT 
            id,
            slug,
            first_name,
            last_name,
            real_name,
            photo_url,
            birth_year,
            death_year
          FROM people
          WHERE is_active = true
          AND (
            unaccent(LOWER(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))) LIKE unaccent(${searchPattern})
            OR unaccent(LOWER(COALESCE(last_name, '') || ' ' || COALESCE(first_name, ''))) LIKE unaccent(${searchPattern})
            OR unaccent(LOWER(COALESCE(real_name, ''))) LIKE unaccent(${searchPattern})
            OR (
              (unaccent(LOWER(COALESCE(first_name, ''))) LIKE unaccent(${firstTerm}) OR unaccent(LOWER(COALESCE(last_name, ''))) LIKE unaccent(${firstTerm}))
              AND
              (unaccent(LOWER(COALESCE(first_name, ''))) LIKE unaccent(${secondTerm}) OR unaccent(LOWER(COALESCE(last_name, ''))) LIKE unaccent(${secondTerm}))
            )
          )
          ORDER BY 
            CASE 
              WHEN unaccent(LOWER(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))) = unaccent(${searchQuery}) THEN 1
              WHEN unaccent(LOWER(COALESCE(last_name, '') || ' ' || COALESCE(first_name, ''))) = unaccent(${searchQuery}) THEN 2
              WHEN unaccent(LOWER(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))) LIKE unaccent(${searchQuery + '%'}) THEN 3
              ELSE 4
            END,
            last_name ASC NULLS LAST,
            first_name ASC NULLS LAST
          LIMIT ${limit}
        `
      }
    } catch (err) {
      console.log('Falling back to standard search for people')
      // Fallback si unaccent no está instalado
      const peopleResults = await prisma.person.findMany({
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
          deathYear: true
        },
        take: limit,
        orderBy: [
          { lastName: 'asc' },
          { firstName: 'asc' }
        ]
      })
      
      people = peopleResults.map(p => ({
        id: p.id,
        slug: p.slug,
        first_name: p.firstName,
        last_name: p.lastName,
        photo_url: p.photoUrl,
        birth_year: p.birthYear,
        death_year: p.deathYear
      }))
    }

    // Formatear resultados
    const formattedMovies = movies.map((movie: any) => ({
      id: movie.id,
      slug: movie.slug,
      title: movie.title,
      // Usar lógica de prioridad: año de producción > año de estreno
      year: getDisplayYear(movie.year, movie.releaseYear),
      posterUrl: movie.posterUrl,
      type: 'movie' as const
    }))

    const formattedPeople = people.map(person => ({
      id: person.id,
      slug: person.slug,
      name: `${person.first_name || ''} ${person.last_name || ''}`.trim() || person.real_name || 'Sin nombre',
      photoUrl: person.photo_url,
      birthYear: person.birth_year,
      deathYear: person.death_year,
      type: 'person' as const
    }))

    return NextResponse.json({
      movies: formattedMovies,
      people: formattedPeople,
      total: formattedMovies.length + formattedPeople.length
    })
}, 'buscar')