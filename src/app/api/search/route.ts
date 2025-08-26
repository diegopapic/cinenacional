// src/app/api/search/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

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

    // Búsqueda de películas (sin cambios)
    const movies = await prisma.movie.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
        ]
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

    // BÚSQUEDA MEJORADA DE PERSONAS - Usando SQL raw para búsqueda concatenada
    const searchQuery = query.toLowerCase().trim()
    const searchPattern = `%${searchQuery}%`
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
            LOWER(first_name) LIKE ${searchPattern}
            OR LOWER(last_name) LIKE ${searchPattern}
            OR LOWER(real_name) LIKE ${searchPattern}
            OR LOWER(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) LIKE ${searchPattern}
          )
          ORDER BY 
            CASE 
              WHEN LOWER(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) = ${searchQuery} THEN 1
              WHEN LOWER(first_name) = ${searchQuery} OR LOWER(last_name) = ${searchQuery} THEN 2
              WHEN LOWER(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) LIKE ${searchQuery + '%'} THEN 3
              ELSE 4
            END,
            last_name ASC NULLS LAST,
            first_name ASC NULLS LAST
          LIMIT ${limit}
        `
      } else {
        // Búsqueda con múltiples términos (ej: "Juan Pérez")
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
            -- Búsqueda en nombre completo concatenado
            LOWER(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) LIKE ${searchPattern}
            OR LOWER(COALESCE(last_name, '') || ' ' || COALESCE(first_name, '')) LIKE ${searchPattern}
            OR LOWER(real_name) LIKE ${searchPattern}
            -- O búsqueda de ambos términos en cualquier orden
            OR (
              (LOWER(first_name) LIKE ${firstTerm} OR LOWER(last_name) LIKE ${firstTerm})
              AND
              (LOWER(first_name) LIKE ${secondTerm} OR LOWER(last_name) LIKE ${secondTerm})
            )
          )
          ORDER BY 
            CASE 
              -- Priorizar coincidencia exacta
              WHEN LOWER(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) = ${searchQuery} THEN 1
              WHEN LOWER(COALESCE(last_name, '') || ' ' || COALESCE(first_name, '')) = ${searchQuery} THEN 2
              -- Luego coincidencias que empiezan con la búsqueda
              WHEN LOWER(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) LIKE ${searchQuery + '%'} THEN 3
              ELSE 4
            END,
            last_name ASC NULLS LAST,
            first_name ASC NULLS LAST
          LIMIT ${limit}
        `
      }
    } catch (rawQueryError) {
      console.error('Error en búsqueda SQL raw, usando fallback:', rawQueryError)
      
      // Fallback con Prisma ORM si falla el SQL raw
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
    const formattedMovies = movies.map(movie => ({
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