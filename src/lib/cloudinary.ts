// src/lib/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

/**
 * Elimina una imagen de Cloudinary por su public ID.
 * No lanza error si la imagen no existe (idempotente).
 */
export async function deleteCloudinaryImage(publicId: string): Promise<boolean> {
  if (!publicId) return false

  try {
    const result = await cloudinary.uploader.destroy(publicId)
    const success = result.result === 'ok' || result.result === 'not found'
    if (result.result === 'ok') {
      console.log(`🗑️ Cloudinary: eliminada imagen ${publicId}`)
    } else if (result.result === 'not found') {
      console.log(`⚠️ Cloudinary: imagen ${publicId} no encontrada (ya eliminada)`)
    } else {
      console.error(`❌ Cloudinary: error eliminando ${publicId}:`, result)
    }
    return success
  } catch (error) {
    console.error(`❌ Cloudinary: error eliminando ${publicId}:`, error)
    return false
  }
}

/**
 * Elimina múltiples imágenes de Cloudinary.
 * Usa la API de delete_resources para batch.
 */
export async function deleteCloudinaryImages(publicIds: string[]): Promise<{ deleted: string[]; failed: string[] }> {
  const validIds = publicIds.filter(Boolean)
  if (validIds.length === 0) return { deleted: [], failed: [] }

  try {
    const result = await cloudinary.api.delete_resources(validIds)
    const deleted: string[] = []
    const failed: string[] = []

    for (const [id, status] of Object.entries(result.deleted)) {
      if (status === 'deleted' || status === 'not_found') {
        deleted.push(id)
      } else {
        failed.push(id)
      }
    }

    console.log(`🗑️ Cloudinary batch: ${deleted.length} eliminadas, ${failed.length} fallaron`)
    return { deleted, failed }
  } catch (error) {
    console.error('❌ Cloudinary batch delete error:', error)
    return { deleted: [], failed: validIds }
  }
}

/**
 * Lista todos los recursos de Cloudinary en un prefijo (carpeta).
 */
export async function listCloudinaryResources(prefix: string, maxResults = 500): Promise<Array<{ public_id: string; created_at: string }>> {
  const resources: Array<{ public_id: string; created_at: string }> = []
  let nextCursor: string | undefined

  try {
    do {
      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix,
        max_results: Math.min(maxResults - resources.length, 500),
        ...(nextCursor && { next_cursor: nextCursor }),
      })

      resources.push(...result.resources.map((r: any) => ({
        public_id: r.public_id,
        created_at: r.created_at,
      })))

      nextCursor = result.next_cursor
    } while (nextCursor && resources.length < maxResults)

    return resources
  } catch (error) {
    console.error(`❌ Cloudinary: error listando recursos con prefijo ${prefix}:`, error)
    return resources
  }
}

export { cloudinary }
