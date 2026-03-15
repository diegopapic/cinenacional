/**
 * Script para detectar y eliminar imágenes huérfanas en Cloudinary.
 *
 * Compara los recursos existentes en Cloudinary (bajo el prefijo "cinenacional/")
 * contra los public IDs registrados en la base de datos (Image.cloudinaryPublicId,
 * Movie.posterPublicId/posterUrl, Person.photoPublicId/photoUrl).
 *
 * IMPORTANTE: Chequea AMBOS campos (publicId y URL) para evitar falsos positivos
 * cuando hay mismatch entre el campo publicId y el ID real en la URL.
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

  console.log(`Obteniendo recursos de Cloudinary con prefijo "${CLOUDINARY_PREFIX}"...`)

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

  console.log(`\n  Total recursos en Cloudinary: ${publicIds.length}`)
  return publicIds
}

/**
 * Extrae el public ID de una URL de Cloudinary.
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
  console.log('Obteniendo public IDs de la base de datos...')

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
  let movieMismatches = 0
  for (const movie of movies) {
    // Agregar AMBOS public IDs (campo y URL) para evitar borrar imágenes en uso
    if (movie.posterPublicId) {
      ids.add(movie.posterPublicId)
      moviesFromPublicId++
    }
    if (movie.posterUrl) {
      const extracted = extractPublicIdFromUrl(movie.posterUrl)
      if (extracted) {
        ids.add(extracted)
        moviesFromUrl++
        if (movie.posterPublicId && extracted !== movie.posterPublicId) {
          movieMismatches++
        }
      }
    }
  }

  let peopleFromPublicId = 0
  let peopleFromUrl = 0
  let peopleMismatches = 0
  for (const person of people) {
    if (person.photoPublicId) {
      ids.add(person.photoPublicId)
      peopleFromPublicId++
    }
    if (person.photoUrl) {
      const extracted = extractPublicIdFromUrl(person.photoUrl)
      if (extracted) {
        ids.add(extracted)
        peopleFromUrl++
        if (person.photoPublicId && extracted !== person.photoPublicId) {
          peopleMismatches++
        }
      }
    }
  }

  console.log(`  Public IDs en DB: ${ids.size}`)
  console.log(`   - ${images.length} imagenes (galeria)`)
  console.log(`   - ${moviesFromPublicId + moviesFromUrl} posters (${moviesFromPublicId} con publicId, ${moviesFromUrl} extraidos de URL, ${movieMismatches} mismatches)`)
  console.log(`   - ${peopleFromPublicId + peopleFromUrl} fotos (${peopleFromPublicId} con publicId, ${peopleFromUrl} extraidas de URL, ${peopleMismatches} mismatches)`)
  return ids
}

/**
 * Para cada huérfana, busca en la DB si hay un registro relacionado
 * y muestra su estado actual para verificación manual.
 */
async function verifyOrphans(orphanIds: string[]): Promise<void> {
  console.log(`\nVerificando cada huerfana contra la DB...\n`)

  for (const orphanId of orphanIds) {
    const parts = orphanId.split('/')
    // Formato esperado: cinenacional/{type}/{entityId}/{filename}
    // type: posters, people, personas, gallery
    const type = parts[1] // posters, people, personas, gallery
    const entityId = parts[2] ? parseInt(parts[2]) : null

    console.log(`  ${orphanId}`)

    if (!entityId || isNaN(entityId)) {
      console.log(`    -> No se pudo extraer ID de entidad del path`)
      console.log(`    -> HUERFANA (path no estándar)`)
      continue
    }

    if (type === 'posters') {
      const movie = await prisma.movie.findUnique({
        where: { id: entityId },
        select: { id: true, title: true, posterPublicId: true, posterUrl: true },
      })

      if (!movie) {
        console.log(`    -> Pelicula #${entityId} NO EXISTE en la DB`)
        console.log(`    -> HUERFANA CONFIRMADA (pelicula eliminada)`)
      } else {
        const urlId = movie.posterUrl ? extractPublicIdFromUrl(movie.posterUrl) : null
        const referencedByField = movie.posterPublicId === orphanId
        const referencedByUrl = urlId === orphanId

        if (referencedByField || referencedByUrl) {
          console.log(`    -> FALSO POSITIVO! Pelicula "${movie.title}" SI referencia esta imagen`)
          console.log(`       posterPublicId: ${movie.posterPublicId}`)
          console.log(`       posterUrl ID:   ${urlId}`)
        } else {
          console.log(`    -> Pelicula "${movie.title}" existe pero usa OTRA imagen:`)
          console.log(`       posterPublicId: ${movie.posterPublicId || '(null)'}`)
          console.log(`       posterUrl ID:   ${urlId || '(null/no-cloudinary)'}`)
          console.log(`    -> HUERFANA CONFIRMADA (imagen vieja reemplazada)`)
        }
      }
    } else if (type === 'people' || type === 'personas') {
      const person = await prisma.person.findUnique({
        where: { id: entityId },
        select: { id: true, firstName: true, lastName: true, photoPublicId: true, photoUrl: true },
      })

      if (!person) {
        console.log(`    -> Persona #${entityId} NO EXISTE en la DB`)
        console.log(`    -> HUERFANA CONFIRMADA (persona eliminada/mergeada)`)
      } else {
        const urlId = person.photoUrl ? extractPublicIdFromUrl(person.photoUrl) : null
        const referencedByField = person.photoPublicId === orphanId
        const referencedByUrl = urlId === orphanId

        if (referencedByField || referencedByUrl) {
          console.log(`    -> FALSO POSITIVO! Persona "${person.firstName} ${person.lastName}" SI referencia esta imagen`)
          console.log(`       photoPublicId: ${person.photoPublicId}`)
          console.log(`       photoUrl ID:   ${urlId}`)
        } else {
          console.log(`    -> Persona "${person.firstName} ${person.lastName}" existe pero usa OTRA imagen:`)
          console.log(`       photoPublicId: ${person.photoPublicId || '(null)'}`)
          console.log(`       photoUrl ID:   ${urlId || '(null/no-cloudinary)'}`)
          console.log(`    -> HUERFANA CONFIRMADA (foto vieja reemplazada)`)
        }
      }
    } else if (type === 'gallery') {
      // Las imágenes de galería se buscan por cloudinaryPublicId directamente
      const image = await prisma.image.findUnique({
        where: { cloudinaryPublicId: orphanId },
      })

      if (!image) {
        console.log(`    -> No hay registro Image con este cloudinaryPublicId`)
        console.log(`    -> HUERFANA CONFIRMADA`)
      } else {
        console.log(`    -> FALSO POSITIVO! Image #${image.id} SI referencia esta imagen`)
      }
    } else {
      console.log(`    -> Tipo desconocido: "${type}"`)
      console.log(`    -> HUERFANA (carpeta no reconocida)`)
    }
  }
}

async function deleteOrphans(orphanIds: string[]): Promise<void> {
  console.log(`\nEliminando ${orphanIds.length} imagenes huerfanas de Cloudinary...`)

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
          console.error(`  No se pudo eliminar: ${id} (${status})`)
        }
      }

      process.stdout.write(`\r  Progreso: ${Math.min(i + BATCH_SIZE, orphanIds.length)}/${orphanIds.length}`)
    } catch (error) {
      console.error(`\n  Error en batch ${i}-${i + BATCH_SIZE}:`, error)
      failed += batch.length
    }
  }

  console.log(`\nEliminadas: ${deleted}, Fallaron: ${failed}`)
}

async function main() {
  console.log('='.repeat(55))
  console.log('  Limpieza de imagenes huerfanas en Cloudinary')
  console.log(`  Modo: ${DELETE_MODE ? 'ELIMINACION' : 'DRY-RUN (solo listar)'}`)
  console.log('='.repeat(55) + '\n')

  try {
    const [cloudinaryIds, dbIds] = await Promise.all([
      getCloudinaryResources(),
      getDbPublicIds(),
    ])

    // Encontrar huérfanas: están en Cloudinary pero no en la DB
    const orphans = cloudinaryIds.filter(id => !dbIds.has(id))

    console.log(`\nResultados:`)
    console.log(`   Recursos en Cloudinary: ${cloudinaryIds.length}`)
    console.log(`   Referenciados en DB:    ${dbIds.size}`)
    console.log(`   Huerfanas:              ${orphans.length}`)

    if (orphans.length === 0) {
      console.log('\nNo hay imagenes huerfanas. Todo limpio.')
      return
    }

    // Verificar cada huérfana contra la DB
    await verifyOrphans(orphans)

    // Contar falsos positivos (si los hay, no borrar)
    // La verificación es informativa; el borrado se basa en la detección original

    // Agrupar por carpeta para resumen
    const byFolder = new Map<string, string[]>()
    for (const id of orphans) {
      const parts = id.split('/')
      const folder = parts.slice(0, -1).join('/') || '(raiz)'
      if (!byFolder.has(folder)) byFolder.set(folder, [])
      byFolder.get(folder)!.push(id)
    }

    console.log(`\nResumen por carpeta:`)
    for (const [folder, ids] of [...byFolder.entries()].sort()) {
      console.log(`   ${folder}: ${ids.length}`)
    }

    if (DELETE_MODE) {
      await deleteOrphans(orphans)
    } else {
      console.log(`\nPara eliminar, ejecuta:`)
      console.log(`   npx tsx scripts/cleanup-cloudinary-orphans.ts --delete`)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error('Error fatal:', error)
  prisma.$disconnect()
  process.exit(1)
})
