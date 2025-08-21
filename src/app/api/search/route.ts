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

    const [movies, people] = await Promise.all([
      prisma.movie.findMany({
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
          birthYear: true
        },
        take: limit,
        orderBy: [
          { lastName: 'asc' },
          { firstName: 'asc' }
        ]
      })
    ])

    const formattedMovies = movies.map(movie => ({
      id: movie.id,
      slug: movie.slug,
      title: movie.title,
      originalTitle: movie.originalTitle,
      year: movie.releaseYear,
      posterUrl: movie.posterUrl,
      type: 'movie' as const
    }))

    const formattedPeople = people.map(person => ({
      id: person.id,
      slug: person.slug,
      name: `${person.firstName || ''} ${person.lastName || ''}`.trim() || 'Sin nombre',
      photoUrl: person.photoUrl,
      birthYear: person.birthYear,
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