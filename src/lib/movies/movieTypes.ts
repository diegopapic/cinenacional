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
/**
 * movieFormFieldsSchema
 * @TODO Add documentation
 */
export const movieFormFieldsSchema = z.object({
  // Campos requeridos
  title: z.string().min(1, 'El título es requerido'),

  // Información básica
  originalTitle: z.string().optional(),
  synopsis: z.string().optional(),
  notes: z.string().optional(),
  tagline: z.string().optional(),
  imdbId: z.string().optional(),
  aspectRatio: z.string().optional(),
  soundType: z.string().optional(),
  filmFormat: z.string().optional(),
  certificateNumber: z.string().optional(),
  tipoDuracion: z.string().optional(),

  // Campos numéricos
  year: z.number().nullable().optional(),
  duration: z.preprocess(
  (val) => {
    if (val === '' || val === null || val === undefined || isNaN(Number(val))) {
      return null;
    }
    return Number(val);
  },
  z.number().positive().nullable().optional()
),
  durationSeconds: z.preprocess(
  (val) => {
    if (val === '' || val === null || val === undefined || isNaN(Number(val))) {
      return null;
    }
    const num = Number(val);
    return num >= 0 && num <= 59 ? num : null;
  },
  z.number().min(0).max(59).nullable().optional()
),
  colorTypeId: z.number().nullable().optional(),
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
    'EN_RODAJE',
    'INCONCLUSA',
    'INEDITA'
  ]).optional(),
})

// Schema para fechas parciales (estado interno del formulario)
/**
 * moviePartialDatesSchema
 * @TODO Add documentation
 */
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
/**
 * movieRelationsSchema
 * @TODO Add documentation
 */
export const movieRelationsSchema = z.object({
  genres: z.array(z.number()).optional(),
  cast: z.array(z.object({
    personId: z.number(),
    characterName: z.string().optional(),
    billingOrder: z.number().optional(),
    isPrincipal: z.boolean().optional()
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
    title: z.string().optional(),
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
/**
 * movieFormSchema
 * @TODO Add documentation
 */
export const movieFormSchema = movieFormFieldsSchema.merge(moviePartialDatesSchema)

// Schema completo para la API (incluye todo)
/**
 * movieCompleteSchema
 * @TODO Add documentation
 */
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
  genres: Array<{ id: number; name: string }>
  directors: Array<{ id: number; name: string }>
  mainCast: Array<{
    person: { id: number; name: string }
    character?: string
  }>
  country: string
}

export interface MovieLink {
  id?: number
  type: string
  url: string
  description?: string
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
  | 'EN_RODAJE'
  | 'INCONCLUSA'
  | 'INEDITA'

export type DataCompleteness =
  | 'BASIC_PRESS_KIT'
  | 'FULL_PRESS_KIT'
  | 'MAIN_CAST'
  | 'MAIN_CREW'
  | 'FULL_CAST'
  | 'FULL_CREW'

export type DurationType = 'largometraje' | 'mediometraje' | 'cortometraje'