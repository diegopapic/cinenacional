// scripts/check-posthumous-work.js
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function checkPosthumousWork() {
  console.log('🔍 Buscando personas que trabajaron en películas 2+ años después de su muerte...\n')

  // Obtener todas las personas con fecha de muerte
  const deceasedPeople = await prisma.person.findMany({
    where: {
      deathYear: { not: null }
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      deathYear: true,
      deathMonth: true,
      deathDay: true,
      // Incluir sus trabajos en películas
      crewRoles: {
        include: {
          movie: {
            select: {
              id: true,
              title: true,
              year: true,
              releaseYear: true,
              releaseMonth: true,
              releaseDay: true
            }
          }
        }
      },
      castRoles: {
        include: {
          movie: {
            select: {
              id: true,
              title: true,
              year: true,
              releaseYear: true,
              releaseMonth: true,
              releaseDay: true
            }
          }
        }
      }
    }
  })

  const inconsistencies = []

  // Revisar cada persona fallecida
  for (const person of deceasedPeople) {
    const personName = `${person.firstName || ''} ${person.lastName || ''}`.trim()
    
    // Revisar trabajos como crew
    for (const crewRole of person.crewRoles) {
      const movieYear = crewRole.movie.releaseYear || crewRole.movie.year
      
      if (movieYear && person.deathYear) {
        // Verificar si la película es 2+ años después de la muerte
        if (movieYear >= person.deathYear + 2) {
          inconsistencies.push({
            movieId: crewRole.movie.id,
            movieTitle: crewRole.movie.title,
            movieYear: movieYear,
            personId: person.id,
            personFirstName: person.firstName || '',
            personLastName: person.lastName || '',
            deathYear: person.deathYear,
            yearsDifference: movieYear - person.deathYear,
            workType: 'crew'
          })
        }
      }
    }

    // Revisar trabajos como cast
    for (const castRole of person.castRoles) {
      const movieYear = castRole.movie.releaseYear || castRole.movie.year
      
      if (movieYear && person.deathYear) {
        // Verificar si la película es 2+ años después de la muerte
        if (movieYear >= person.deathYear + 2) {
          inconsistencies.push({
            movieId: castRole.movie.id,
            movieTitle: castRole.movie.title,
            movieYear: movieYear,
            personId: person.id,
            personFirstName: person.firstName || '',
            personLastName: person.lastName || '',
            deathYear: person.deathYear,
            yearsDifference: movieYear - person.deathYear,
            workType: 'cast'
          })
        }
      }
    }
  }

  // Ordenar por diferencia de años (casos más graves primero)
  inconsistencies.sort((a, b) => b.yearsDifference - a.yearsDifference)

  console.log(`\n📊 Total de inconsistencias encontradas: ${inconsistencies.length}\n`)

  // Mostrar resumen en consola
  if (inconsistencies.length > 0) {
    console.log('Top 10 casos más graves:')
    inconsistencies.slice(0, 10).forEach((inc, idx) => {
      console.log(`${idx + 1}. ${inc.personFirstName} ${inc.personLastName} (†${inc.deathYear}) - ` +
                  `"${inc.movieTitle}" (${inc.movieYear}) - ${inc.yearsDifference} años de diferencia`)
    })
  }

  // Generar CSV
  const csvLines = [
    'movie_id,movie_title,movie_year,person_id,person_first_name,person_last_name,death_year,years_difference,work_type'
  ]

  inconsistencies.forEach(inc => {
    csvLines.push(
      `${inc.movieId},"${inc.movieTitle.replace(/"/g, '""')}",${inc.movieYear},${inc.personId},` +
      `"${inc.personFirstName.replace(/"/g, '""')}","${inc.personLastName.replace(/"/g, '""')}",` +
      `${inc.deathYear},${inc.yearsDifference},${inc.workType}`
    )
  })

  // Guardar CSV
  const csvPath = path.join(process.cwd(), 'posthumous-work-report.csv')
  fs.writeFileSync(csvPath, csvLines.join('\n'), 'utf8')
  
  console.log(`\n✅ Reporte guardado en: ${csvPath}`)
  console.log(`📄 Total de registros en CSV: ${inconsistencies.length}`)

  return inconsistencies
}

// Ejecutar script
checkPosthumousWork()
  .then(() => {
    console.log('\n✨ Análisis completado exitosamente')
    prisma.$disconnect()
  })
  .catch(error => {
    console.error('❌ Error durante el análisis:', error)
    prisma.$disconnect()
    process.exit(1)
  })