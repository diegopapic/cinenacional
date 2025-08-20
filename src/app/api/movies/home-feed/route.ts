// src/app/api/movies/home-feed/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const maxDuration = 10

export async function GET(request: NextRequest) {
  try {
    console.log('🎬 Iniciando carga de home-feed...')

    // Fecha actual para comparación - usar una sola vez
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1 // getMonth() retorna 0-11
    const currentDay = now.getDate()
    
    console.log('📅 Fecha de referencia:', {
      fecha: now.toISOString(),
      year: currentYear,
      month: currentMonth,
      day: currentDay
    })
    
    // Query para traer películas con crew
    const peliculasConFecha = await prisma.movie.findMany({
      where: {
        releaseYear: { not: null }
      },
      orderBy: {
        createdAt: 'desc' // Ordenar por creación para tener las más recientes
      },
      take: 100, // Traer más para tener suficientes opciones
      select: {
        id: true,
        slug: true,
        title: true,
        releaseYear: true,
        releaseMonth: true,
        releaseDay: true,
        posterUrl: true,
        createdAt: true,
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
        // Incluir TODOS los crew
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
    
    // Separar películas pasadas y futuras
    const peliculasPasadas: any[] = []
    const peliculasFuturas: any[] = []

    peliculasConFecha.forEach(movie => {
      const year = movie.releaseYear || 0
      const month = movie.releaseMonth || 1
      const day = movie.releaseDay || 1

      // Comparación más explícita
      let isPast = false
      
      if (year < currentYear) {
        isPast = true
      } else if (year === currentYear) {
        if (month < currentMonth) {
          isPast = true
        } else if (month === currentMonth) {
          if (day <= currentDay) {
            isPast = true
          }
        }
      }
      
      // Log específico para películas de 2025 con fechas futuras
      if (year === 2025 && month >= currentMonth) {
        console.log(`📅 ${movie.title}: ${day}/${month}/${year} - ${isPast ? 'PASADA' : 'FUTURA'}`)
      }

      if (isPast) {
        peliculasPasadas.push(movie)
      } else {
        peliculasFuturas.push(movie)
      }
    })

    // Ordenar películas pasadas: más recientes primero (descendente)
    peliculasPasadas.sort((a, b) => {
      // Primero comparar por año
      if (b.releaseYear !== a.releaseYear) {
        return b.releaseYear - a.releaseYear
      }
      // Si el año es igual, comparar por mes
      if (b.releaseMonth !== a.releaseMonth) {
        return (b.releaseMonth || 0) - (a.releaseMonth || 0)
      }
      // Si año y mes son iguales, comparar por día
      return (b.releaseDay || 0) - (a.releaseDay || 0)
    })

    // Ordenar películas futuras: más próximas primero (ascendente)
    peliculasFuturas.sort((a, b) => {
      // Primero comparar por año
      if (a.releaseYear !== b.releaseYear) {
        return a.releaseYear - b.releaseYear
      }
      // Si el año es igual, comparar por mes
      if (a.releaseMonth !== b.releaseMonth) {
        return (a.releaseMonth || 0) - (b.releaseMonth || 0)
      }
      // Si año y mes son iguales, comparar por día
      return (a.releaseDay || 0) - (b.releaseDay || 0)
    })

    // Tomar solo las primeras 6 de cada categoría
    const ultimosEstrenos = peliculasPasadas.slice(0, 6)
    const proximosEstrenos = peliculasFuturas.slice(0, 6)

    console.log(`📊 Resultados finales:`)
    console.log(`   - Últimos estrenos: ${ultimosEstrenos.length}`)
    console.log(`   - Próximos estrenos: ${proximosEstrenos.length}`)
    
    if (proximosEstrenos.length > 0) {
      console.log('🎬 Próximos estrenos encontrados:', proximosEstrenos.map(m => ({
        title: m.title,
        fecha: `${m.releaseDay}/${m.releaseMonth}/${m.releaseYear}`
      })))
    }

    return NextResponse.json({
      ultimosEstrenos,
      proximosEstrenos,
      timestamp: now.toISOString(),
      debug: {
        totalPeliculas: peliculasConFecha.length,
        fechaReferencia: `${currentDay}/${currentMonth}/${currentYear}`,
        proximosCount: proximosEstrenos.length,
        ultimosCount: ultimosEstrenos.length
      }
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