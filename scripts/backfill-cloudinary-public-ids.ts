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

const BATCH_SIZE = 500

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

    const movieUpdates: Array<{ id: number; publicId: string }> = []
    let movieSkipped = 0

    for (const movie of moviesWithoutPublicId) {
      const publicId = extractPublicIdFromUrl(movie.posterUrl!)
      if (publicId) {
        movieUpdates.push({ id: movie.id, publicId })
        if (movieUpdates.length <= 5) {
          console.log(`   ✅ [${movie.id}] ${movie.title}`)
          console.log(`      URL: ${movie.posterUrl}`)
          console.log(`      Public ID: ${publicId}`)
        }
      } else {
        movieSkipped++
        console.log(`   ⚠️  [${movie.id}] ${movie.title} - No se pudo extraer public ID de: ${movie.posterUrl}`)
      }
    }

    if (movieUpdates.length > 5) {
      console.log(`   ... y ${movieUpdates.length - 5} más`)
    }
    console.log(`   Total: ${movieUpdates.length} para actualizar, ${movieSkipped} sin URL de Cloudinary`)

    if (APPLY && movieUpdates.length > 0) {
      console.log(`   Aplicando en batches de ${BATCH_SIZE}...`)
      for (let i = 0; i < movieUpdates.length; i += BATCH_SIZE) {
        const batch = movieUpdates.slice(i, i + BATCH_SIZE)
        // Construir CASE WHEN para batch update
        const cases = batch.map(u => `WHEN ${u.id} THEN '${u.publicId.replace(/'/g, "''")}'`).join(' ')
        const ids = batch.map(u => u.id).join(',')
        await prisma.$executeRawUnsafe(
          `UPDATE movies SET poster_public_id = CASE id ${cases} END WHERE id IN (${ids})`
        )
        process.stdout.write(`\r   Progreso: ${Math.min(i + BATCH_SIZE, movieUpdates.length)}/${movieUpdates.length}`)
      }
      console.log(`\n   ✅ ${movieUpdates.length} películas actualizadas`)
    }

    // --- Personas ---
    console.log('')
    const peopleWithoutPublicId = await prisma.person.findMany({
      where: {
        photoUrl: { not: null },
        photoPublicId: null,
      },
      select: { id: true, firstName: true, lastName: true, photoUrl: true },
    })

    console.log(`👤 Personas con photoUrl pero sin photoPublicId: ${peopleWithoutPublicId.length}`)

    const personUpdates: Array<{ id: number; publicId: string }> = []
    let personSkipped = 0

    for (const person of peopleWithoutPublicId) {
      const publicId = extractPublicIdFromUrl(person.photoUrl!)
      if (publicId) {
        personUpdates.push({ id: person.id, publicId })
        if (personUpdates.length <= 5) {
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

    if (personUpdates.length > 5) {
      console.log(`   ... y ${personUpdates.length - 5} más`)
    }
    console.log(`   Total: ${personUpdates.length} para actualizar, ${personSkipped} sin URL de Cloudinary`)

    if (APPLY && personUpdates.length > 0) {
      console.log(`   Aplicando en batches de ${BATCH_SIZE}...`)
      for (let i = 0; i < personUpdates.length; i += BATCH_SIZE) {
        const batch = personUpdates.slice(i, i + BATCH_SIZE)
        const cases = batch.map(u => `WHEN ${u.id} THEN '${u.publicId.replace(/'/g, "''")}'`).join(' ')
        const ids = batch.map(u => u.id).join(',')
        await prisma.$executeRawUnsafe(
          `UPDATE people SET photo_public_id = CASE id ${cases} END WHERE id IN (${ids})`
        )
        process.stdout.write(`\r   Progreso: ${Math.min(i + BATCH_SIZE, personUpdates.length)}/${personUpdates.length}`)
      }
      console.log(`\n   ✅ ${personUpdates.length} personas actualizadas`)
    }

    // --- Resumen ---
    const total = movieUpdates.length + personUpdates.length
    console.log('\n═══════════════════════════════════════════════════')
    console.log(`  Resumen: ${total} registros ${APPLY ? 'actualizados' : 'por actualizar'}`)
    console.log('═══════════════════════════════════════════════════')

    if (!APPLY && total > 0) {
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
