// src/app/api/movies/home-sections/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const section = searchParams.get('section')
    const limit = parseInt(searchParams.get('limit') || '6')
    
    if (!section || (section !== 'ultimos' && section !== 'proximos')) {
      return NextResponse.json(
        { error: 'Section parameter must be "ultimos" or "proximos"' },
        { status: 400 }
      )
    }

    const today = new Date()
    
    if (section === 'ultimos') {
      // Últimos estrenos - películas con fecha pasada
      const movies = await prisma.movie.findMany({
        where: {
          releaseYear: { not: null },
          releaseMonth: { not: null },
          releaseDay: { not: null },
          // Solo películas ya estrenadas
          OR: [
            { releaseYear: { lt: today.getFullYear() } },
            {
              releaseYear: today.getFullYear(),
              releaseMonth: { lt: today.getMonth() + 1 }
            },
            {
              releaseYear: today.getFullYear(),
              releaseMonth: today.getMonth() + 1,
              releaseDay: { lte: today.getDate() }
            }
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
          duration: true,
          genres: {
            select: {
              genre: {
                select: {
                  id: true,
                  name: true
                }
              }
            },
            orderBy: {
              isPrimary: 'desc'
            }
          },
          crew: {
            where: {
              role: {
                department: 'DIRECCION' // Usando el enum de tu schema
              }
            },
            select: {
              person: {
                select: {
                  id: true,
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
          { releaseMonth: 'desc' },
          { releaseDay: 'desc' }
        ],
        take: limit
      })

      // Formatear respuesta
      const formattedMovies = movies.map(movie => ({
        id: movie.id,
        slug: movie.slug,
        title: movie.title,
        releaseYear: movie.releaseYear,
        releaseMonth: movie.releaseMonth,
        releaseDay: movie.releaseDay,
        posterUrl: movie.posterUrl,
        duration: movie.duration,
        genres: movie.genres.map(g => ({
          id: g.genre.id,
          name: g.genre.name
        })),
        director: movie.crew[0]?.person ? 
          `${movie.crew[0].person.firstName || ''} ${movie.crew[0].person.lastName || ''}`.trim() : 
          null
      }))

      return NextResponse.json({ movies: formattedMovies })
      
    } else { // section === 'proximos'
      // Próximos estrenos - películas con fecha futura
      const movies = await prisma.movie.findMany({
        where: {
          releaseYear: { not: null },
          OR: [
            { releaseYear: { gt: today.getFullYear() } },
            {
              releaseYear: today.getFullYear(),
              releaseMonth: { gt: today.getMonth() + 1 }
            },
            {
              releaseYear: today.getFullYear(),
              releaseMonth: today.getMonth() + 1,
              releaseDay: { gt: today.getDate() }
            },
            // Incluir películas con solo año futuro
            {
              releaseYear: { gt: today.getFullYear() },
              releaseMonth: null
            }
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
          duration: true,
          genres: {
            select: {
              genre: {
                select: {
                  id: true,
                  name: true
                }
              }
            },
            orderBy: {
              isPrimary: 'desc'
            }
          },
          crew: {
            where: {
              role: {
                department: 'DIRECCION'
              }
            },
            select: {
              person: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true
                }
              }
            },
            take: 1
          }
        },
        orderBy: [
          { releaseYear: 'asc' },
          { releaseMonth: 'asc' },
          { releaseDay: 'asc' }
        ],
        take: limit
      })

      // Formatear respuesta
      const formattedMovies = movies.map(movie => ({
        id: movie.id,
        slug: movie.slug,
        title: movie.title,
        releaseYear: movie.releaseYear,
        releaseMonth: movie.releaseMonth,
        releaseDay: movie.releaseDay,
        posterUrl: movie.posterUrl,
        duration: movie.duration,
        genres: movie.genres.map(g => ({
          id: g.genre.id,
          name: g.genre.name
        })),
        director: movie.crew[0]?.person ? 
          `${movie.crew[0].person.firstName || ''} ${movie.crew[0].person.lastName || ''}`.trim() : 
          null
      }))

      return NextResponse.json({ movies: formattedMovies })
    }

  } catch (error) {
    console.error('Error in home-sections:', error)
    return NextResponse.json(
      { error: 'Error al obtener las secciones', details: error.message },
      { status: 500 }
    )
  }
}