// src/lib/images/imageUtils.ts
import { ImageWithRelations, IMAGE_TYPE_LABELS } from './imageTypes'

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

/**
 * Genera el caption automático para una imagen
 */
export function generateImageCaption(image: ImageWithRelations): string {
  const parts: string[] = []
  
  // 1. Personas ordenadas por posición
  if (image.people && image.people.length > 0) {
    const sortedPeople = [...image.people].sort((a, b) => a.position - b.position)
    const names = sortedPeople
      .map(ip => {
        if (!ip.person) return null
        const { firstName, lastName } = ip.person
        return [firstName, lastName].filter(Boolean).join(' ')
      })
      .filter(Boolean) as string[]
    
    if (names.length === 1) {
      parts.push(names[0])
    } else if (names.length === 2) {
      parts.push(`${names[0]} y ${names[1]}`)
    } else if (names.length > 2) {
      const lastPerson = names.pop()
      parts.push(`${names.join(', ')} y ${lastPerson}`)
    }
  }
  
  // 2. Contexto según tipo y película
  const movieYear = image.movie?.releaseYear
  const movieRef = image.movie 
    ? `${image.movie.title}${movieYear ? ` (${movieYear})` : ''}`
    : null
  
  const hasNames = parts.length > 0
  
  switch (image.type) {
    case 'STILL':
      if (movieRef) {
        parts.push(hasNames ? `en ${movieRef}` : `Fotograma de ${movieRef}`)
      }
      break
      
    case 'BEHIND_THE_SCENES':
      if (movieRef) {
        parts.push(hasNames ? `en el rodaje de ${movieRef}` : `Detrás de escena de ${movieRef}`)
      }
      break
      
    case 'PUBLICITY':
      if (movieRef) {
        parts.push(hasNames ? `en foto promocional de ${movieRef}` : `Foto promocional de ${movieRef}`)
      }
      break
      
    case 'PREMIERE':
      if (movieRef) {
        parts.push(hasNames ? `en el estreno de ${movieRef}` : `Estreno de ${movieRef}`)
      }
      if (image.eventName) {
        parts.push(`(${image.eventName})`)
      }
      break
      
    case 'EVENT':
      if (image.eventName) {
        parts.push(hasNames ? `en ${image.eventName}` : image.eventName)
      }
      break
  }
  
  return parts.join(' ') || 'Sin descripción'
}

/**
 * Genera URL de Cloudinary con transformaciones
 */
interface CloudinaryTransformOptions {
  width?: number
  height?: number
  crop?: 'fill' | 'fit' | 'scale' | 'thumb' | 'limit'
  quality?: number | 'auto'
  format?: 'auto' | 'webp' | 'jpg' | 'png'
  gravity?: 'auto' | 'face' | 'center'
}

export function getCloudinaryUrl(
  publicId: string, 
  options: CloudinaryTransformOptions = {}
): string {
  const {
    width,
    height,
    crop = 'fill',
    quality = 'auto',
    format = 'auto',
    gravity = 'auto'
  } = options
  
  const transforms: string[] = []
  
  if (width) transforms.push(`w_${width}`)
  if (height) transforms.push(`h_${height}`)
  if (width || height) {
    transforms.push(`c_${crop}`)
    transforms.push(`g_${gravity}`)
  }
  transforms.push(`q_${quality}`)
  transforms.push(`f_${format}`)
  
  const transformString = transforms.join(',')
  
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${transformString}/${publicId}`
}

/**
 * Extrae el public ID de una URL de Cloudinary.
 * Soporta URLs con o sin transformaciones y con o sin versión.
 *
 * Ejemplos:
 *   ".../image/upload/v123/cinenacional/people/42/foto.jpg" → "cinenacional/people/42/foto"
 *   ".../image/upload/w_800,c_fill/v123/cinenacional/people/42/foto.jpg" → "cinenacional/people/42/foto"
 *   ".../image/upload/cinenacional/people/42/foto.jpg" → "cinenacional/people/42/foto"
 */
export function extractPublicIdFromUrl(url: string): string | null {
  if (!url || !url.includes('res.cloudinary.com')) return null

  try {
    // Obtener todo después de /image/upload/
    const uploadIndex = url.indexOf('/image/upload/')
    if (uploadIndex === -1) return null

    let path = url.substring(uploadIndex + '/image/upload/'.length)

    // Remover extensión final (.jpg, .png, .webp, etc.)
    path = path.replace(/\.\w{3,4}$/, '')

    // Separar en segmentos
    const segments = path.split('/')

    // Encontrar dónde empieza el publicId:
    // - Los segmentos de transformación contienen "_" (ej: w_800, c_fill, g_face)
    // - Los segmentos de versión empiezan con "v" seguido de dígitos (ej: v1234567890)
    // - El publicId es todo lo que viene después
    let startIndex = 0
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]
      // Segmento de transformación (contiene comas o underscore con formato clave_valor)
      if (seg.includes(',') || /^[a-z]{1,2}_/.test(seg)) {
        startIndex = i + 1
        continue
      }
      // Segmento de versión
      if (/^v\d+$/.test(seg)) {
        startIndex = i + 1
        continue
      }
      // Este segmento es parte del publicId
      break
    }

    const publicId = segments.slice(startIndex).join('/')
    return publicId || null
  } catch {
    return null
  }
}

/**
 * Genera URL optimizada para retratos de personas (ratio 3:4, gravity: face).
 * Intenta extraer el publicId de la URL y aplicar transformación on-the-fly.
 * Si no puede, devuelve la URL original como fallback.
 *
 * @param photoUrl - URL original de la foto
 * @param size - 'sm' (150x200), 'md' (300x400), 'lg' (600x800)
 */
export function getPersonPhotoUrl(
  photoUrl: string | null | undefined,
  size: 'sm' | 'md' | 'lg' = 'md'
): string | null {
  if (!photoUrl) return null

  const publicId = extractPublicIdFromUrl(photoUrl)
  if (!publicId) return photoUrl // No es Cloudinary, devolver tal cual

  const sizeMap = {
    sm: { width: 150, height: 200 },
    md: { width: 300, height: 400 },
    lg: { width: 600, height: 800 },
  }

  const { width, height } = sizeMap[size]

  return getCloudinaryUrl(publicId, {
    width,
    height,
    crop: 'fill',
    gravity: 'face',
    quality: 'auto',
    format: 'auto',
  })
}

// Presets comunes para imágenes de películas
export const imagePresets = {
  thumbnail: (publicId: string) => 
    getCloudinaryUrl(publicId, { width: 150, height: 100, crop: 'fill' }),
  
  card: (publicId: string) => 
    getCloudinaryUrl(publicId, { width: 400, height: 267, crop: 'fill' }),
  
  gallery: (publicId: string) => 
    getCloudinaryUrl(publicId, { width: 800, height: 533, crop: 'fill' }),
  
  full: (publicId: string) => 
    getCloudinaryUrl(publicId, { width: 1200, crop: 'limit' }),
}

/**
 * Obtiene el label del tipo de imagen
 */
export function getImageTypeLabel(type: string): string {
  return IMAGE_TYPE_LABELS[type as keyof typeof IMAGE_TYPE_LABELS] || type
}