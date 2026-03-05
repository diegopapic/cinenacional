/**
 * Script para rellenar posterPublicId/photoPublicId faltantes.
 *
 * Muchas películas y personas tienen posterUrl/photoUrl pero no el campo
 * posterPublicId/photoPublicId. Este script extrae el public ID de la URL
 * y lo guarda en el campo correspondiente.
 *
 * Uso:
 *   npx tsx scripts/backfill-cloudinary-public-ids.ts          # Dry-run
 *   npx tsx scripts/backfill-cloudinary-public-ids.ts --apply   # Aplicar cambios
 */

import path from 'path'
import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'

// Cargar .env.local
config({ path: path.resolve(process.cwd(), '.env.local') })

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

/**
 * Extrae el public ID de una URL de Cloudinary.
 * Copia de src/lib/images/imageUtils.ts.
 */
function extractPublicIdFromUrl(url: string): string | null {
  if (!url || !url.includes('res.cloudinary.com')) return null
  try {
    const uploadIndex = url.indexOf('/image/upload/')
    if (uploadIndex === -1) return null
    let p = url.substring(uploadIndex + '/image/upload/'.length)
    p = p.replace(/\.\w{3,4}$/, '')
    const segments = p.split('/')
    let startIndex = 0
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]
      if (seg.includes(',') || /^[a-z]{1,2}_/.test(seg)) { startIndex = i + 1; continue }
      if (/^v\d+$/.test(seg)) { startIndex = i + 1; continue }
      break
    }
    const publicId = segments.slice(startIndex).join('/')
    return publicId || null
  } catch {
    return null
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════')
  console.log('  Backfill de posterPublicId / photoPublicId')
  console.log(`  Modo: ${APPLY ? '🔴 APLICAR CAMBIOS' : '🟢 DRY-RUN (solo mostrar)'}`)
  console.log('═══════════════════════════════════════════════════\n')

  try {
    // --- Películas ---
    const moviesWithoutPublicId = await prisma.movie.findMany({
      where: {
        posterUrl: { not: null },
        posterPublicId: null,
      },
      select: { id: true, title: true, posterUrl: true },
    })

    console.log(`🎬 Películas con posterUrl pero sin posterPublicId: ${moviesWithoutPublicId.length}`)

    let movieUpdated = 0
    let movieSkipped = 0

    for (const movie of moviesWithoutPublicId) {
      const publicId = extractPublicIdFromUrl(movie.posterUrl!)
      if (publicId) {
        if (APPLY) {
          await prisma.movie.update({
            where: { id: movie.id },
            data: { posterPublicId: publicId },
          })
        }
        movieUpdated++
        if (movieUpdated <= 5) {
          console.log(`   ✅ [${movie.id}] ${movie.title}`)
          console.log(`      URL: ${movie.posterUrl}`)
          console.log(`      Public ID: ${publicId}`)
        }
      } else {
        movieSkipped++
        console.log(`   ⚠️  [${movie.id}] ${movie.title} - No se pudo extraer public ID de: ${movie.posterUrl}`)
      }
    }

    if (movieUpdated > 5) {
      console.log(`   ... y ${movieUpdated - 5} más`)
    }
    console.log(`   Total: ${movieUpdated} para actualizar, ${movieSkipped} sin URL de Cloudinary\n`)

    // --- Personas ---
    const peopleWithoutPublicId = await prisma.person.findMany({
      where: {
        photoUrl: { not: null },
        photoPublicId: null,
      },
      select: { id: true, firstName: true, lastName: true, photoUrl: true },
    })

    console.log(`👤 Personas con photoUrl pero sin photoPublicId: ${peopleWithoutPublicId.length}`)

    let personUpdated = 0
    let personSkipped = 0

    for (const person of peopleWithoutPublicId) {
      const publicId = extractPublicIdFromUrl(person.photoUrl!)
      if (publicId) {
        if (APPLY) {
          await prisma.person.update({
            where: { id: person.id },
            data: { photoPublicId: publicId },
          })
        }
        personUpdated++
        if (personUpdated <= 5) {
          const name = [person.firstName, person.lastName].filter(Boolean).join(' ')
          console.log(`   ✅ [${person.id}] ${name}`)
          console.log(`      URL: ${person.photoUrl}`)
          console.log(`      Public ID: ${publicId}`)
        }
      } else {
        personSkipped++
        const name = [person.firstName, person.lastName].filter(Boolean).join(' ')
        console.log(`   ⚠️  [${person.id}] ${name} - No se pudo extraer public ID de: ${person.photoUrl}`)
      }
    }

    if (personUpdated > 5) {
      console.log(`   ... y ${personUpdated - 5} más`)
    }
    console.log(`   Total: ${personUpdated} para actualizar, ${personSkipped} sin URL de Cloudinary\n`)

    // --- Resumen ---
    console.log('═══════════════════════════════════════════════════')
    console.log(`  Resumen: ${movieUpdated + personUpdated} registros ${APPLY ? 'actualizados' : 'por actualizar'}`)
    console.log('═══════════════════════════════════════════════════')

    if (!APPLY && (movieUpdated + personUpdated) > 0) {
      console.log(`\n💡 Para aplicar los cambios, ejecutá:`)
      console.log(`   npx tsx scripts/backfill-cloudinary-public-ids.ts --apply`)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error('❌ Error fatal:', error)
  prisma.$disconnect()
  process.exit(1)
})
