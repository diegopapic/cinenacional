// src/lib/movies/movieTypes.ts

import { z } from 'zod'
import { PartialDate } from '@/lib/shared/dateUtils'

// ============================================================================
// TIPOS REUTILIZABLES
// ============================================================================

// Usar el tipo compartido de PartialDate
export type PartialReleaseDate = PartialDate
export type PartialFilmingDate = PartialDate

// ============================================================================
// SCHEMAS DE VALIDACIÓN
// ============================================================================

// Schema para campos del formulario (solo campos que se manejan con register)
export const movieFormFieldsSchema = z.object({
  // Campos requeridos
  title: z.string().min(1, 'El título es requerido'),

  // Información básica
  originalTitle: z.string().optional(),
  synopsis: z.string().optional(),
  synopsisLocked: z.boolean().optional().default(false),
  notes: z.string().optional(),
  tagline: z.string().optional(),
  imdbId: z.string().optional(),
  tmdbId: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined) return null;
      const num = Number(val);
      return isNaN(num) ? null : num;
    },
    z.number().int().positive().nullable().optional()
  ),
  aspectRatio: z.string().optional(),
  soundType: z.preprocess(
    (val) => (val === '' ? null : val),
    z.string().nullable().optional()
  ),
  filmFormat: z.string().optional(),
  certificateNumber: z.string().optional(),
  tipoDuracion: z.string().optional(),

  // Campos numéricos
  year: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined || val === 0 || (typeof val === 'number' && isNaN(val))) {
        return null;
      }
      return Number(val);
    },
    z.number().positive().nullable().optional()
  ),
  duration: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined || val === 0|| isNaN(Number(val))) {
        return null;
      }
      return Number(val);
    },
    z.number().positive().nullable().optional()
  ),
  durationSeconds: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined || val === 0 || isNaN(Number(val))) {
        return null;
      }
      const num = Number(val);
      return num ===0 || num < 0 || num > 59 ? num : null;
    },
    z.number().min(1).max(59).nullable().optional()
  ),
  colorTypeId: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined || val === 0 || (typeof val === 'number' && isNaN(val))) {
        return null;
      }
      return Number(val);
    },
    z.number().positive().nullable().optional()
  ),
  ratingId: z.union([
    z.number().positive(),
    z.null(),
    z.literal(0).transform(() => null)
  ]).optional(),

  // Campos de fecha
  releaseDate: z.string().optional(),
  filmingStartDate: z.string().optional(),
  filmingEndDate: z.string().optional(),

  // Producción
  countries: z.array(z.string()).optional(),
  is_coproduction: z.boolean().optional(),
  production_type: z.string().optional(),

  // URLs
  posterUrl: z.string().optional(),
  posterPublicId: z.string().optional(),
  backdropUrl: z.string().optional(),
  backdropPublicId: z.string().optional(),
  trailerUrl: z.string().optional(),

  // Metadata - con transformaciones para evitar null
  metaDescription: z.union([
    z.string(),
    z.null(),
    z.undefined()
  ]).transform(val => val ?? '').optional(),

  metaKeywords: z.union([
    z.string(),
    z.array(z.string()),
    z.null(),
    z.undefined()
  ]).transform(val => val ?? []).optional(),

  // Enums
  dataCompleteness: z.enum([
    'BASIC_PRESS_KIT',
    'FULL_PRESS_KIT',
    'MAIN_CAST',
    'MAIN_CREW',
    'FULL_CAST',
    'FULL_CREW'
  ]).optional(),

  stage: z.enum([
    'COMPLETA',
    'EN_DESARROLLO',
    'EN_POSTPRODUCCION',
    'EN_PREPRODUCCION',
    'EN_PRODUCCION',
    'EN_RODAJE',
    'INCONCLUSA'
  ]).optional(),
})

// Schema para fechas parciales (estado interno del formulario)
export const moviePartialDatesSchema = z.object({
  isPartialReleaseDate: z.boolean().optional(),
  partialReleaseDate: z.object({
    year: z.number().nullable(),
    month: z.number().nullable(),
    day: z.number().nullable()
  }).optional(),

  isPartialFilmingStartDate: z.boolean().optional(),
  partialFilmingStartDate: z.object({
    year: z.number().nullable(),
    month: z.number().nullable(),
    day: z.number().nullable()
  }).optional(),

  isPartialFilmingEndDate: z.boolean().optional(),
  partialFilmingEndDate: z.object({
    year: z.number().nullable(),
    month: z.number().nullable(),
    day: z.number().nullable()
  }).optional(),
})

// Schema para relaciones (manejadas por callbacks, no validadas por React Hook Form)
export const movieRelationsSchema = z.object({
  genres: z.array(z.number()).optional(),
  cast: z.array(z.object({
    personId: z.number(),
    characterName: z.string().optional(),
    billingOrder: z.number().optional(),
    isPrincipal: z.boolean().optional(),
    notes: z.string().optional(),
  })).optional(),
  crew: z.array(z.object({
    personId: z.number(),
    role: z.string(),
    department: z.string().optional(),
    billingOrder: z.number().optional()
  })).optional(),
  productionCompanies: z.array(z.number()).optional(),
  distributionCompanies: z.array(z.number()).optional(),
  themes: z.array(z.number()).optional(),
  movieCountries: z.array(z.number()).optional(),
  links: z.array(z.object({
    type: z.string(),
    url: z.string(),
    isActive: z.boolean().optional()
  })).optional(),
  screeningVenues: z.array(z.union([
    z.number(),
    z.object({
      venueId: z.number(),
      screeningDate: z.string().optional(),
      isPremiere: z.boolean().optional(),
      isExclusive: z.boolean().optional()
    })
  ])).optional(),
  alternativeTitles: z.array(z.object({
    title: z.string(),
    description: z.string().optional()
  })).optional()
})

// Schema principal para React Hook Form (solo valida campos del formulario)
export const movieFormSchema = movieFormFieldsSchema.merge(moviePartialDatesSchema)

// Schema completo para la API (incluye todo)
export const movieCompleteSchema = movieFormFieldsSchema
  .merge(moviePartialDatesSchema)
  .merge(movieRelationsSchema)

// ============================================================================
// TIPOS TYPESCRIPT
// ============================================================================

// Tipo para React Hook Form (solo campos del formulario + fechas parciales)
export type MovieFormData = z.infer<typeof movieFormSchema>

// Tipo completo con relaciones (para enviar a la API)
export type MovieCompleteData = z.infer<typeof movieCompleteSchema>

// Tipos parciales para mejor organización
export type MovieFormFields = z.infer<typeof movieFormFieldsSchema>
export type MovieRelations = z.infer<typeof movieRelationsSchema>
export type MoviePartialDates = z.infer<typeof moviePartialDatesSchema>

// ============================================================================
// INTERFACES
// ============================================================================

export interface Movie {
  id: number
  slug: string
  title: string
  originalTitle?: string
  year: number
  releaseDate?: string
  duration?: number
  rating?: number
  posterUrl?: string
  status: string
  stage?: string
  filmingStartDate: string
  filmingEndDate: string
  dataCompleteness?: string
  tmdbId?: number | null
  imdbId?: string | null
  genres: Array<{ id: number; name: string }>
  directors: Array<{ id: number; name: string }>
  mainCast: Array<{
    person: { id: number; name: string }
    character?: string
  }>
  country: string
}

// ============================================================================
// MovieDetail — shape completo retornado por GET /api/movies/[id]
// ============================================================================

/** Persona dentro de una relación cast/crew del API */
export interface MovieDetailPerson {
  id: number
  firstName: string | null
  lastName: string | null
  slug: string
  photoUrl?: string | null
  alternativeNames?: Array<{ id: number; fullName: string }>
}

/** Raw cast entry del API */
export interface RawCastEntry {
  personId?: number
  person?: MovieDetailPerson & { name?: string }
  alternativeNameId?: number | null
  alternativeName?: { id?: number; fullName: string } | string | null
  characterName?: string
  billingOrder?: number
  isPrincipal?: boolean
  isActor?: boolean
  notes?: string | null
}

/** Raw crew entry del API */
export interface RawCrewEntry {
  personId?: number
  person?: Omit<MovieDetailPerson, 'photoUrl'>
  alternativeNameId?: number | null
  alternativeName?: { id?: number; fullName: string } | string | null
  roleId?: number
  role?: string | { id: number; name: string; department?: string }
  department?: string
  billingOrder?: number
  notes?: string | null
}

/** Respuesta completa de GET /api/movies/[id] — incluye todos los campos y relaciones */
export interface MovieDetail {
  // Campos básicos
  id: number
  slug: string
  title: string
  year: number | null
  duration: number | null
  durationSeconds: number | null
  synopsis: string | null
  synopsisLocked: boolean
  tagline: string | null
  notes: string | null
  posterUrl: string | null
  posterPublicId: string | null
  trailerUrl: string | null
  imdbId: string | null
  tmdbId: number | null
  stage: string | null
  dataCompleteness: string | null
  tipoDuracion: string | null
  metaDescription: string | null
  metaKeywords: string[] | null
  soundType: string | null
  rating: number | null
  ratingId: number | null
  originalTitle?: string | null
  aspectRatio?: string | null
  filmFormat?: string | null
  certificateNumber?: string | null
  createdAt: string
  updatedAt: string

  // Fechas parciales
  releaseDate?: string | null
  releaseYear: number | null
  releaseMonth: number | null
  releaseDay: number | null
  filmingStartYear: number | null
  filmingStartMonth: number | null
  filmingStartDay: number | null
  filmingEndYear: number | null
  filmingEndMonth: number | null
  filmingEndDay: number | null

  // Relaciones
  colorType: { id: number; name: string } | null
  genres: Array<{ genre: { id: number; name: string; slug: string } }>
  cast: RawCastEntry[]
  crew: RawCrewEntry[]
  movieCountries: Array<{ location: { id: number; name: string; slug: string }; countryId: number; isPrimary: boolean }>
  productionCompanies: Array<{ company: { id: number; name: string } }>
  distributionCompanies: Array<{ company: { id: number; name: string } }>
  themes: Array<{ theme: { id: number; name: string; slug: string } }>
  images: Array<Record<string, unknown>>
  videos: Array<Record<string, unknown>>
  awards: Array<Record<string, unknown>>
  links: Array<{ id?: number; type: string; url: string; isActive?: boolean }>
  screenings: Array<{ venueId: number; venue?: Record<string, unknown> }>
  alternativeTitles: Array<{ id: number; title: string; description: string | null }>
  trivia: Array<{ id: number; content: string; sortOrder: number }>
}

export interface MovieLink {
  id?: number
  type: string
  url: string
}

export interface AlternativeTitle {
  id?: number
  title: string
  type?: string
  language?: string
}

export interface Rating {
  id: number
  name: string
  abbreviation?: string
  description?: string
}

export interface ColorType {
  id: number
  name: string
}

// ============================================================================
// TIPOS DE CONSTANTES
// ============================================================================

export type MovieStage =
  | 'COMPLETA'
  | 'EN_DESARROLLO'
  | 'EN_POSTPRODUCCION'
  | 'EN_PREPRODUCCION'
  | 'EN_PRODUCCION'
  | 'EN_RODAJE'
  | 'INCONCLUSA'

export type DataCompleteness =
  | 'BASIC_PRESS_KIT'
  | 'FULL_PRESS_KIT'
  | 'MAIN_CAST'
  | 'MAIN_CREW'
  | 'FULL_CAST'
  | 'FULL_CREW'

export type DurationType = 'largometraje' | 'mediometraje' | 'cortometraje'