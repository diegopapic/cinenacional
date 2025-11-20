import { prisma } from '@/lib/prisma'

export const revalidate = 3600 // Revalidar cada hora

async function getHeaderStats() {
  try {
    // 1. Fichas técnicas (películas)
    const totalPeliculas = await prisma.movie.count()

    // 2. Filmografías (personas)
    const totalPersonas = await prisma.person.count()

    // 3. Efemérides - usando query raw para replicar el CTE
    const efemeridesResult = await prisma.$queryRaw<[{
      peliculas_estreno: bigint
      peliculas_inicio_rodaje: bigint
      peliculas_fin_rodaje: bigint
      personas_nacimiento: bigint
      personas_muerte: bigint
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
        c.peliculas_estreno,
        c.peliculas_inicio_rodaje,
        c.peliculas_fin_rodaje,
        p.personas_nacimiento,
        p.personas_muerte,
        (c.peliculas_estreno + c.peliculas_inicio_rodaje + c.peliculas_fin_rodaje + 
         p.personas_nacimiento + p.personas_muerte) as total_efemerides
      FROM counts c, people_counts p
    `
    const totalEfemerides = Number(efemeridesResult[0]?.total_efemerides || 0)

    // 4. Afiches (películas con poster)
    const totalAfiches = await prisma.movie.count({
      where: {
        posterUrl: {
          not: null,
        },
        NOT: {
          posterUrl: ''
        }
      }
    })

    // 5. Fotos (personas con foto)
    const totalFotos = await prisma.person.count({
      where: {
        photoUrl: {
          not: null,
        },
        NOT: {
          photoUrl: ''
        }
      }
    })

    return {
      peliculas: totalPeliculas,
      personas: totalPersonas,
      efemerides: totalEfemerides,
      afiches: totalAfiches,
      fotos: totalFotos,
    }
  } catch (error) {
    console.error('Error fetching header stats:', error)
    // Retornar valores por defecto en caso de error
    return {
      peliculas: 0,
      personas: 0,
      efemerides: 0,
      afiches: 0,
      fotos: 0,
    }
  }
}

// Función helper para formatear números con separadores de miles
function formatNumber(num: number): string {
  return num.toLocaleString('es-AR')
}

export default async function HeaderStats() {
  const stats = await getHeaderStats()

  const statsDisplay = [
    { label: 'fichas técnicas', value: formatNumber(stats.peliculas) },
    { label: 'filmografías', value: formatNumber(stats.personas) },
    { label: 'efemérides', value: formatNumber(stats.efemerides) },
    { label: 'afiches', value: formatNumber(stats.afiches) },
    { label: 'fotos', value: formatNumber(stats.fotos) },
  ]

  return (
    <div className="bg-zinc-800/50 border-b border-zinc-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm">
          {statsDisplay.map((stat, index) => (
            <div key={stat.label} className="flex items-baseline gap-1">
              <span className="font-semibold text-white">{stat.value}</span>
              <span className="text-zinc-400">{stat.label}</span>
              {index < statsDisplay.length - 1 && (
                <span className="hidden sm:inline ml-6 text-zinc-700">|</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}