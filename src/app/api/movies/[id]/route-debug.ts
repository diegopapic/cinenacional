// src/app/api/movies/[id]/route-debug.ts

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const measurements: any = {}
  const id = parseInt(params.id)
  
  console.log('🔍 Starting performance debug for movie ID:', id)
  
  // 1. Medir query básica
  let start = Date.now()
  const movieBasic = await prisma.movie.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      year: true
    }
  })
  measurements.basicQuery = Date.now() - start
  console.log(`✓ Basic query: ${measurements.basicQuery}ms`)
  
  // 2. Medir query con géneros
  start = Date.now()
  const movieWithGenres = await prisma.movie.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      genres: {
        select: {
          genre: { select: { id: true, name: true }}
        }
      }
    }
  })
  measurements.withGenres = Date.now() - start
  console.log(`✓ With genres: ${measurements.withGenres}ms`)
  
  // 3. Medir query con cast (sin person)
  start = Date.now()
  const movieWithCastIds = await prisma.movie.findUnique({
    where: { id },
    select: {
      id: true,
      cast: {
        select: {
          id: true,
          personId: true,
          characterName: true
        },
        take: 5
      }
    }
  })
  measurements.withCastIds = Date.now() - start
  console.log(`✓ With cast IDs only: ${measurements.withCastIds}ms`)
  
  // 4. Medir query con cast + person
  start = Date.now()
  const movieWithCastFull = await prisma.movie.findUnique({
    where: { id },
    select: {
      id: true,
      cast: {
        select: {
          id: true,
          person: {
            select: { id: true, firstName: true, lastName: true }
          }
        },
        take: 5
      }
    }
  })
  measurements.withCastAndPerson = Date.now() - start
  console.log(`✓ With cast + person: ${measurements.withCastAndPerson}ms`)
  
  // 5. Medir query con crew
  start = Date.now()
  const movieWithCrew = await prisma.movie.findUnique({
    where: { id },
    select: {
      id: true,
      crew: {
        where: { roleId: 2 },
        select: {
          person: {
            select: { id: true, firstName: true, lastName: true }
          }
        },
        take: 1
      }
    }
  })
  measurements.withCrew = Date.now() - start
  console.log(`✓ With crew: ${measurements.withCrew}ms`)
  
  // 6. Medir la query completa optimizada
  start = Date.now()
  const movieComplete = await prisma.movie.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      title: true,
      year: true,
      releaseYear: true,
      releaseMonth: true,
      releaseDay: true,
      duration: true,
      synopsis: true,
      posterUrl: true,
      
      genres: {
        select: {
          genre: { select: { id: true, name: true }}
        }
      },
      
      cast: {
        where: { isPrincipal: true },
        take: 5,
        select: {
          characterName: true,
          person: {
            select: { id: true, firstName: true, lastName: true }
          }
        }
      },
      
      crew: {
        where: { roleId: 2 },
        take: 1,
        select: {
          person: {
            select: { id: true, firstName: true, lastName: true }
          }
        }
      }
    }
  })
  measurements.completeOptimized = Date.now() - start
  console.log(`✓ Complete optimized: ${measurements.completeOptimized}ms`)
  
  // 7. Probar con queries separadas
  start = Date.now()
  const movie = await prisma.movie.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      title: true,
      year: true,
      synopsis: true
    }
  })
  
  const genres = await prisma.movieGenre.findMany({
    where: { movieId: id },
    select: {
      genre: { select: { id: true, name: true }}
    }
  })
  
  const cast = await prisma.movieCast.findMany({
    where: { movieId: id, isPrincipal: true },
    take: 5,
    select: {
      characterName: true,
      person: { select: { id: true, firstName: true, lastName: true }}
    }
  })
  measurements.separateQueries = Date.now() - start
  console.log(`✓ Separate queries: ${measurements.separateQueries}ms`)
  
  // 8. Test de conexión a DB
  start = Date.now()
  await prisma.$queryRaw`SELECT 1`
  measurements.dbPing = Date.now() - start
  console.log(`✓ DB ping: ${measurements.dbPing}ms`)
  
  console.log('\n📊 RESUMEN:')
  console.log('================')
  Object.entries(measurements).forEach(([key, value]) => {
    console.log(`${key}: ${value}ms`)
  })
  
  return NextResponse.json({
    measurements,
    analysis: {
      dbLatency: measurements.dbPing,
      joinOverhead: measurements.withCastAndPerson - measurements.withCastIds,
      totalTime: measurements.completeOptimized,
      isSlow: measurements.completeOptimized > 200
    }
  })
}