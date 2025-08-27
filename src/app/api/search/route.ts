// src/app/api/search/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
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
    
    // Búsqueda de películas con normalización de acentos
    let movies: any[] = []
    try {
      movies = await prisma.$queryRaw`
        SELECT 
          id,
          slug,
          title,
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
          title ASC
        LIMIT ${limit}
      `
    } catch (err) {
      console.log('Falling back to standard search for movies')
      // Fallback si unaccent no está instalado
      const movieResults = await prisma.movie.findMany({
        where: {
          title: { contains: query, mode: 'insensitive' }
        },
        select: {
          id: true,
          slug: true,
          title: true,
          releaseYear: true,
          posterUrl: true
        },
        take: limit,
        orderBy: { title: 'asc' }
      })
      movies = movieResults.map(m => ({
        ...m,
        releaseYear: m.releaseYear
      }))
    }

    // Búsqueda de personas con normalización de acentos
    const searchTerms = searchQuery.split(/\s+/).filter(term => term.length > 0)
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
            birth_year
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
            birth_year
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
          birthYear: true
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
        birth_year: p.birthYear
      }))
    }

    // Formatear resultados
    const formattedMovies = movies.map((movie: any) => ({
      id: movie.id,
      slug: movie.slug,
      title: movie.title,
      year: movie.releaseYear,
      posterUrl: movie.posterUrl,
      type: 'movie' as const
    }))

    const formattedPeople = people.map(person => ({
      id: person.id,
      slug: person.slug,
      name: `${person.first_name || ''} ${person.last_name || ''}`.trim() || person.real_name || 'Sin nombre',
      photoUrl: person.photo_url,
      birthYear: person.birth_year,
      type: 'person' as const
    }))

    return NextResponse.json({
      movies: formattedMovies,
      people: formattedPeople,
      total: formattedMovies.length + formattedPeople.length
    })

  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Error searching' },
      { status: 500 }
    )
  }
}