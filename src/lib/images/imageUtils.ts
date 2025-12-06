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