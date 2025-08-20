// src/app/api/movies/home-feed/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const maxDuration = 10

export async function GET(request: NextRequest) {
  try {
    console.log('🎬 Iniciando carga de home-feed...')
    
    // Query para traer películas con crew
    const peliculasConFecha = await prisma.movie.findMany({
      where: {
        releaseYear: { not: null }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 30,
      select: {
        id: true,
        slug: true,
        title: true,
        releaseYear: true,
        releaseMonth: true,
        releaseDay: true,
        posterUrl: true,
        genres: {
          take: 3,
          include: {
            genre: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        // Incluir TODOS los crew, no solo roleId: 2
        crew: {
          include: {
            person: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: {
            billingOrder: 'asc'
          }
        }
      }
    })

    console.log(`✅ Películas obtenidas: ${peliculasConFecha.length}`)
    
    // Log para debugging
    if (peliculasConFecha.length > 0) {
      console.log('Primera película crew:', peliculasConFecha[0].crew)
    }

    // Separar en cliente
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth() + 1
    const currentDay = today.getDate()

    const ultimosEstrenos: any[] = []
    const proximosEstrenos: any[] = []

    peliculasConFecha.forEach(movie => {
      const year = movie.releaseYear || 0
      const month = movie.releaseMonth || 12
      const day = movie.releaseDay || 31

      const isPast = 
        year < currentYear ||
        (year === currentYear && month < currentMonth) ||
        (year === currentYear && month === currentMonth && day <= currentDay)

      if (isPast && ultimosEstrenos.length < 6) {
        ultimosEstrenos.push(movie)
      } else if (!isPast && proximosEstrenos.length < 6) {
        proximosEstrenos.push(movie)
      }
    })

    console.log(`📊 Últimos: ${ultimosEstrenos.length}, Próximos: ${proximosEstrenos.length}`)

    return NextResponse.json({
      ultimosEstrenos,
      proximosEstrenos,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error en home-feed:', error)
    
    return NextResponse.json({
      ultimosEstrenos: [],
      proximosEstrenos: [],
      error: true,
      message: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
}