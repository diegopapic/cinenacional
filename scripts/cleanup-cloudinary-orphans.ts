/**
 * Script para detectar y eliminar imágenes huérfanas en Cloudinary.
 *
 * Compara los recursos existentes en Cloudinary (bajo el prefijo "cinenacional/")
 * contra los public IDs registrados en la base de datos (Image.cloudinaryPublicId,
 * Movie.posterPublicId, Person.photoPublicId).
 *
 * Uso:
 *   npx tsx scripts/cleanup-cloudinary-orphans.ts          # Solo listar huérfanas (dry-run)
 *   npx tsx scripts/cleanup-cloudinary-orphans.ts --delete  # Eliminar huérfanas
 */

import path from 'path'
import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { v2 as cloudinary } from 'cloudinary'

// Cargar .env.local
config({ path: path.resolve(process.cwd(), '.env.local') })

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const prisma = new PrismaClient()

const DELETE_MODE = process.argv.includes('--delete')
const CLOUDINARY_PREFIX = 'cinenacional'
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const CLOUDINARY_BASE_URL = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload`
const BATCH_SIZE = 100 // Cloudinary permite hasta 100 por delete_resources

async function getCloudinaryResources(): Promise<string[]> {
  const publicIds: string[] = []
  let nextCursor: string | undefined

  console.log(`📡 Obteniendo recursos de Cloudinary con prefijo "${CLOUDINARY_PREFIX}"...`)

  do {
    const result: any = await cloudinary.api.resources({
      type: 'upload',
      prefix: CLOUDINARY_PREFIX,
      max_results: 500,
      ...(nextCursor && { next_cursor: nextCursor }),
    })

    for (const resource of result.resources) {
      publicIds.push(resource.public_id)
    }

    nextCursor = result.next_cursor
    process.stdout.write(`\r  Encontrados: ${publicIds.length} recursos`)
  } while (nextCursor)

  console.log(`\n✅ Total recursos en Cloudinary: ${publicIds.length}`)
  return publicIds
}

/**
 * Extrae el public ID de una URL de Cloudinary.
 * Copia de src/lib/images/imageUtils.ts (no se puede importar directamente en scripts standalone).
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

async function getDbPublicIds(): Promise<Set<string>> {
  console.log('🔍 Obteniendo public IDs de la base de datos...')

  const [images, movies, people] = await Promise.all([
    prisma.image.findMany({
      select: { cloudinaryPublicId: true },
    }),
    prisma.movie.findMany({
      where: { OR: [{ posterPublicId: { not: null } }, { posterUrl: { not: null } }] },
      select: { posterPublicId: true, posterUrl: true },
    }),
    prisma.person.findMany({
      where: { OR: [{ photoPublicId: { not: null } }, { photoUrl: { not: null } }] },
      select: { photoPublicId: true, photoUrl: true },
    }),
  ])

  const ids = new Set<string>()

  for (const img of images) {
    if (img.cloudinaryPublicId) ids.add(img.cloudinaryPublicId)
  }

  let moviesFromPublicId = 0
  let moviesFromUrl = 0
  for (const movie of movies) {
    if (movie.posterPublicId) {
      ids.add(movie.posterPublicId)
      moviesFromPublicId++
    } else if (movie.posterUrl) {
      const extracted = extractPublicIdFromUrl(movie.posterUrl)
      if (extracted) { ids.add(extracted); moviesFromUrl++ }
    }
  }

  let peopleFromPublicId = 0
  let peopleFromUrl = 0
  for (const person of people) {
    if (person.photoPublicId) {
      ids.add(person.photoPublicId)
      peopleFromPublicId++
    } else if (person.photoUrl) {
      const extracted = extractPublicIdFromUrl(person.photoUrl)
      if (extracted) { ids.add(extracted); peopleFromUrl++ }
    }
  }

  console.log(`✅ Public IDs en DB: ${ids.size}`)
  console.log(`   - ${images.length} imágenes (galería)`)
  console.log(`   - ${moviesFromPublicId + moviesFromUrl} posters (${moviesFromPublicId} con publicId, ${moviesFromUrl} extraídos de URL)`)
  console.log(`   - ${peopleFromPublicId + peopleFromUrl} fotos (${peopleFromPublicId} con publicId, ${peopleFromUrl} extraídas de URL)`)
  return ids
}

async function deleteOrphans(orphanIds: string[]): Promise<void> {
  console.log(`\n🗑️  Eliminando ${orphanIds.length} imágenes huérfanas de Cloudinary...`)

  let deleted = 0
  let failed = 0

  for (let i = 0; i < orphanIds.length; i += BATCH_SIZE) {
    const batch = orphanIds.slice(i, i + BATCH_SIZE)

    try {
      const result = await cloudinary.api.delete_resources(batch)

      for (const [id, status] of Object.entries(result.deleted)) {
        if (status === 'deleted' || status === 'not_found') {
          deleted++
        } else {
          failed++
          console.error(`  ❌ No se pudo eliminar: ${id} (${status})`)
        }
      }

      process.stdout.write(`\r  Progreso: ${Math.min(i + BATCH_SIZE, orphanIds.length)}/${orphanIds.length}`)
    } catch (error) {
      console.error(`\n  ❌ Error en batch ${i}-${i + BATCH_SIZE}:`, error)
      failed += batch.length
    }
  }

  console.log(`\n✅ Eliminadas: ${deleted}, Fallaron: ${failed}`)
}

async function main() {
  console.log('═══════════════════════════════════════════════')
  console.log('  Limpieza de imágenes huérfanas en Cloudinary')
  console.log(`  Modo: ${DELETE_MODE ? '🔴 ELIMINACIÓN' : '🟢 DRY-RUN (solo listar)'}`)
  console.log('═══════════════════════════════════════════════\n')

  try {
    const [cloudinaryIds, dbIds] = await Promise.all([
      getCloudinaryResources(),
      getDbPublicIds(),
    ])

    // Encontrar huérfanas: están en Cloudinary pero no en la DB
    const orphans = cloudinaryIds.filter(id => !dbIds.has(id))

    console.log(`\n📊 Resultados:`)
    console.log(`   Recursos en Cloudinary: ${cloudinaryIds.length}`)
    console.log(`   Referenciados en DB:    ${dbIds.size}`)
    console.log(`   Huérfanas:              ${orphans.length}`)

    if (orphans.length === 0) {
      console.log('\n✅ No hay imágenes huérfanas. Todo limpio.')
      return
    }

    // Agrupar por carpeta para mejor visualización
    const byFolder = new Map<string, string[]>()
    for (const id of orphans) {
      const parts = id.split('/')
      const folder = parts.slice(0, -1).join('/') || '(raíz)'
      if (!byFolder.has(folder)) byFolder.set(folder, [])
      byFolder.get(folder)!.push(id)
    }

    console.log(`\n📁 Huérfanas por carpeta:`)
    for (const [folder, ids] of [...byFolder.entries()].sort()) {
      console.log(`   ${folder}: ${ids.length}`)
      // Mostrar primeras 5 de cada carpeta
      for (const id of ids.slice(0, 5)) {
        console.log(`     - ${CLOUDINARY_BASE_URL}/${id}`)
      }
      if (ids.length > 5) {
        console.log(`     ... y ${ids.length - 5} más`)
      }
    }

    if (DELETE_MODE) {
      await deleteOrphans(orphans)
    } else {
      console.log(`\n💡 Para eliminar, ejecutá:`)
      console.log(`   npx tsx scripts/cleanup-cloudinary-orphans.ts --delete`)
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
