// src/app/api/search/full/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
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

    // Búsqueda completa en paralelo
    const [movies, people] = await Promise.all([
      // Buscar todas las películas que coincidan
      prisma.movie.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { originalTitle: { contains: query, mode: 'insensitive' } },
            { synopsis: { contains: query, mode: 'insensitive' } }
          ],
          isActive: true
        },
        include: {
          genres: {
            include: {
              genre: true
            },
            take: 3
          },
          crew: {
            where: {
              OR: [
                { role: 'Director' },
                { role: 'Dirección' },
                { roleId: 2 }
              ]
            },
            include: {
              person: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            },
            take: 1
          }
        },
        orderBy: [
          { releaseYear: 'desc' },
          { title: 'asc' }
        ],
        take: 50
      }),
      
      // Buscar todas las personas que coincidan
      prisma.person.findMany({
        where: {
          isActive: true,
          OR: [
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
            { realName: { contains: query, mode: 'insensitive' } }
          ]
        },
        include: {
          _count: {
            select: {
              castRoles: true,
              crewRoles: true
            }
          }
        },
        orderBy: [
          { lastName: 'asc' },
          { firstName: 'asc' }
        ],
        take: 50
      })
    ])

    // Formatear películas
    const formattedMovies = movies.map(movie => ({
      id: movie.id,
      slug: movie.slug,
      title: movie.title,
      originalTitle: movie.originalTitle,
      releaseYear: movie.releaseYear,
      releaseMonth: movie.releaseMonth,
      releaseDay: movie.releaseDay,
      posterUrl: movie.posterUrl,
      synopsis: movie.synopsis,
      directors: movie.crew.map(c => ({
        person: {
          firstName: c.person.firstName,
          lastName: c.person.lastName
        }
      })),
      genres: movie.genres.map(g => ({ 
        name: g.genre.name 
      }))
    }))

    // Formatear personas
    const formattedPeople = people.map(person => ({
      id: person.id,
      slug: person.slug,
      firstName: person.firstName,
      lastName: person.lastName,
      photoUrl: person.photoUrl,
      birthYear: person.birthYear,
      birthMonth: person.birthMonth,
      birthDay: person.birthDay,
      biography: person.biography,
      _count: person._count
    }))

    return NextResponse.json({
      movies: formattedMovies,
      people: formattedPeople,
      totalMovies: formattedMovies.length,
      totalPeople: formattedPeople.length
    })

  } catch (error) {
    console.error('Full search error:', error)
    return NextResponse.json(
      { error: 'Error searching', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}