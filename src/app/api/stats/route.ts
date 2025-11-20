import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const totalPeliculas = await prisma.movie.count()
    const totalPersonas = await prisma.person.count()

    const efemeridesResult = await prisma.$queryRaw<[{
      total_efemerides: bigint
    }]>`
      WITH counts AS (
        SELECT 
          COUNT(*) FILTER (WHERE release_year IS NOT NULL 
                            AND release_month IS NOT NULL 
                            AND release_day IS NOT NULL) as peliculas_estreno,
          COUNT(*) FILTER (WHERE filming_start_year IS NOT NULL 
                            AND filming_start_month IS NOT NULL 
                            AND filming_start_day IS NOT NULL) as peliculas_inicio_rodaje,
          COUNT(*) FILTER (WHERE filming_end_year IS NOT NULL 
                            AND filming_end_month IS NOT NULL 
                            AND filming_end_day IS NOT NULL) as peliculas_fin_rodaje
        FROM movies
      ),
      people_counts AS (
        SELECT 
          COUNT(*) FILTER (WHERE birth_year IS NOT NULL 
                            AND birth_month IS NOT NULL 
                            AND birth_day IS NOT NULL) as personas_nacimiento,
          COUNT(*) FILTER (WHERE death_year IS NOT NULL 
                            AND death_month IS NOT NULL 
                            AND death_day IS NOT NULL) as personas_muerte
        FROM people
      )
      SELECT 
        (c.peliculas_estreno + c.peliculas_inicio_rodaje + c.peliculas_fin_rodaje + 
         p.personas_nacimiento + p.personas_muerte) as total_efemerides
      FROM counts c, people_counts p
    `
    const totalEfemerides = Number(efemeridesResult[0]?.total_efemerides || 0)

    const totalAfiches = await prisma.movie.count({
      where: {
        posterUrl: { not: null },
        NOT: { posterUrl: '' }
      }
    })

    const totalFotos = await prisma.person.count({
      where: {
        photoUrl: { not: null },
        NOT: { photoUrl: '' }
      }
    })

    return NextResponse.json({
      peliculas: totalPeliculas,
      personas: totalPersonas,
      efemerides: totalEfemerides,
      afiches: totalAfiches,
      fotos: totalFotos,
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({
      peliculas: 0,
      personas: 0,
      efemerides: 0,
      afiches: 0,
      fotos: 0,
    })
  }
}