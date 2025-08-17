// src/lib/movies/movieTypes.ts

import { PartialDate } from '@/lib/shared/dateUtils'

// Usar el tipo compartido de PartialDate en lugar de tipos propios
export type PartialReleaseDate = PartialDate
export type PartialFilmingDate = PartialDate


import { z } from 'zod'

// Schema del formulario
export const movieFormSchema = z.object({
  // Campos requeridos
  title: z.string().min(1, 'El título es requerido'),

  // Todos los demás campos como strings opcionales o any
  originalTitle: z.any().optional(),
  synopsis: z.any().optional(),
  notes: z.string().optional(),
  tagline: z.any().optional(),
  imdbId: z.any().optional(),
  aspectRatio: z.any().optional(),
  colorType: z.any().optional(),
  soundType: z.any().optional(),
  filmFormat: z.any().optional(),
  certificateNumber: z.any().optional(),
  tipoDuracion: z.any().optional(),

  // Campos numéricos
  year: z.any().optional(),
  duration: z.any().optional(),
  durationSeconds: z.any().optional(),
  rating: z.any().optional(),
  colorTypeId: z.any().optional(),
  ratingId: z.union([z.number(), z.null()]).optional(),

  // Campos de fecha
  releaseDate: z.any().optional(),
  filmingStartDate: z.any().optional(),
  filmingEndDate: z.any().optional(),
  countries: z.array(z.string()).optional(),
  is_coproduction: z.boolean().optional(),
  production_type: z.string().optional(),

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

  // URLs
  posterUrl: z.any().optional(),
  posterPublicId: z.any().optional(),
  backdropUrl: z.any().optional(),
  backdropPublicId: z.any().optional(),
  trailerUrl: z.any().optional(),

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
  metaDescription: z.string().optional(),
  metaKeywords: z.union([
    z.string(),
    z.array(z.string())
  ]).optional(),
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

export type MovieFormData = z.infer<typeof movieFormSchema>

// Interfaces
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

  // Fechas de rodaje
  filmingStartDate: string;
  filmingEndDate: string;
  dataCompleteness?: string
  genres: Array<{ id: number; name: string }>
  directors: Array<{ id: number; name: string }>
  mainCast: Array<{
    person: { id: number; name: string }
    character?: string
  }>
  country: string
}

export interface MovieRelations {
  genres: number[]
  cast: any[]
  crew: any[]
  countries: number[]
  productionCompanies: number[]
  distributionCompanies: number[]
  themes: number[]
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

// Tipos de constantes
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