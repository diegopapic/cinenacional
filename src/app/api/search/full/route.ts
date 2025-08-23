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
          releaseMonth: true,
          releaseDay: true,
          posterUrl: true,
          synopsis: true
        },
        orderBy: [
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

    // Ordenar personas por total de participaciones (castRoles + crewRoles) de mayor a menor
    const sortedPeople = people.sort((a, b) => {
      const totalA = (a._count?.castRoles || 0) + (a._count?.crewRoles || 0)
      const totalB = (b._count?.castRoles || 0) + (b._count?.crewRoles || 0)
      return totalB - totalA // Orden descendente (mayor a menor)
    })

    return NextResponse.json({
      movies: movies,
      people: sortedPeople,
      totalMovies: movies.length,
      totalPeople: sortedPeople.length
    })

  } catch (error) {
    console.error('Full search error:', error)
    return NextResponse.json(
      { error: 'Error searching' },
      { status: 500 }
    )
  }
}