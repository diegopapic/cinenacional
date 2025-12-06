// src/lib/images/imageTypes.ts
import { z } from 'zod'

// Enum que coincide con Prisma
export const ImageType = {
  STILL: 'STILL',
  BEHIND_THE_SCENES: 'BEHIND_THE_SCENES',
  PUBLICITY: 'PUBLICITY',
  EVENT: 'EVENT',
  PREMIERE: 'PREMIERE'
} as const

export type ImageType = typeof ImageType[keyof typeof ImageType]

// Labels para mostrar en UI
export const IMAGE_TYPE_LABELS: Record<ImageType, string> = {
  STILL: 'Fotograma',
  BEHIND_THE_SCENES: 'Detrás de escena',
  PUBLICITY: 'Foto promocional',
  EVENT: 'Evento',
  PREMIERE: 'Estreno'
}

// Tipos disponibles desde ABM de películas (sin EVENT que no tiene película asociada)
export const MOVIE_IMAGE_TYPES: ImageType[] = [
  'STILL',
  'BEHIND_THE_SCENES', 
  'PUBLICITY',
  'PREMIERE'
]

// Persona en una imagen
export interface ImagePerson {
  id?: number
  personId: number
  position: number
  person?: {
    id: number
    firstName?: string | null
    lastName?: string | null
  }
}

// Imagen completa con relaciones
export interface ImageWithRelations {
  id: number
  cloudinaryPublicId: string
  type: ImageType
  photoDate?: string | null
  photographerCredit?: string | null
  eventName?: string | null
  movieId?: number | null
  movie?: {
    id: number
    title: string
    releaseYear?: number | null
  } | null
  people: ImagePerson[]
  createdAt: string
  updatedAt: string
}

// Para crear/editar imagen
export interface ImageFormData {
  cloudinaryPublicId: string
  type: ImageType
  photoDate?: string | null
  photographerCredit?: string | null
  eventName?: string | null
  movieId?: number | null
  people?: Array<{
    personId: number
    position: number
  }>
}

// Schema de validación
export const imageFormSchema = z.object({
  cloudinaryPublicId: z.string().min(1, 'La imagen es requerida'),
  type: z.enum(['STILL', 'BEHIND_THE_SCENES', 'PUBLICITY', 'EVENT', 'PREMIERE']),
  photoDate: z.string().nullable().optional(),
  photographerCredit: z.string().nullable().optional(),
  eventName: z.string().nullable().optional(),
  movieId: z.number().nullable().optional(),
  people: z.array(z.object({
    personId: z.number(),
    position: z.number()
  })).optional()
})

// Respuesta paginada
export interface PaginatedImagesResponse {
  data: ImageWithRelations[]
  totalCount: number
  page: number
  totalPages: number
  hasMore: boolean
}