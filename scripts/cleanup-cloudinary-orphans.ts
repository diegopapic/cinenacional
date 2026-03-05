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

async function getDbPublicIds(): Promise<Set<string>> {
  console.log('🔍 Obteniendo public IDs de la base de datos...')

  const [images, moviePosters, personPhotos] = await Promise.all([
    prisma.image.findMany({
      select: { cloudinaryPublicId: true },
    }),
    prisma.movie.findMany({
      where: { posterPublicId: { not: null } },
      select: { posterPublicId: true },
    }),
    prisma.person.findMany({
      where: { photoPublicId: { not: null } },
      select: { photoPublicId: true },
    }),
  ])

  const ids = new Set<string>()

  for (const img of images) {
    if (img.cloudinaryPublicId) ids.add(img.cloudinaryPublicId)
  }
  for (const movie of moviePosters) {
    if (movie.posterPublicId) ids.add(movie.posterPublicId)
  }
  for (const person of personPhotos) {
    if (person.photoPublicId) ids.add(person.photoPublicId)
  }

  console.log(`✅ Public IDs en DB: ${ids.size} (${images.length} imágenes, ${moviePosters.length} posters, ${personPhotos.length} fotos)`)
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
        console.log(`     - ${id}`)
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
