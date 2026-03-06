// src/lib/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary'
import { createLogger } from '@/lib/logger'

const log = createLogger('cloudinary')

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
    const result = await cloudinary.uploader.destroy(publicId, { invalidate: true })
    const success = result.result === 'ok' || result.result === 'not found'
    if (result.result === 'ok') {
      log.debug('Image deleted', { publicId })
    } else if (result.result === 'not found') {
      log.debug('Image not found (already deleted)', { publicId })
    } else {
      log.error('Image deletion failed', undefined, { publicId, result: result.result })
    }
    return success
  } catch (error) {
    log.error('Image deletion error', error, { publicId })
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
    const result = await cloudinary.api.delete_resources(validIds, { invalidate: true })
    const deleted: string[] = []
    const failed: string[] = []

    for (const [id, status] of Object.entries(result.deleted)) {
      if (status === 'deleted' || status === 'not_found') {
        deleted.push(id)
      } else {
        failed.push(id)
      }
    }

    log.info('Batch delete completed', { deleted: deleted.length, failed: failed.length })
    return { deleted, failed }
  } catch (error) {
    log.error('Batch delete error', error)
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

      resources.push(...result.resources.map((r: { public_id: string; created_at: string }) => ({
        public_id: r.public_id,
        created_at: r.created_at,
      })))

      nextCursor = result.next_cursor
    } while (nextCursor && resources.length < maxResults)

    return resources
  } catch (error) {
    log.error('Failed to list resources', error, { prefix })
    return resources
  }
}

export { cloudinary }
