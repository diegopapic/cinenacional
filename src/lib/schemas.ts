// src/lib/schemas.ts
import { z } from 'zod'

export const movieSchema = z.object({
  // Información básica
  title: z.string().min(1, 'El título es requerido'),
  originalTitle: z.string().optional(),
  year: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined || val === 0 || (typeof val === 'number' && isNaN(val))) {
        return null;
      }
      return Number(val);
    },
    z.number().positive().nullable().optional()
  ),

  // Fechas como campos separados Y fechas completas para el formulario
  releaseDate: z.string().optional(),
  releaseYear: z.number().nullable().optional(),
  releaseMonth: z.number().nullable().optional(),
  releaseDay: z.number().nullable().optional(),

  filmingStartDate: z.string().optional(),
  filmingStartYear: z.number().nullable().optional(),
  filmingStartMonth: z.number().nullable().optional(),
  filmingStartDay: z.number().nullable().optional(),

  filmingEndDate: z.string().optional(),
  filmingEndYear: z.number().nullable().optional(),
  filmingEndMonth: z.number().nullable().optional(),
  filmingEndDay: z.number().nullable().optional(),

  // Duración
  duration: z.number().optional().transform(val => val === 0 ? null : val),
  durationSeconds: z.number().optional().transform(val => val === 0 ? null : val),
  tipoDuracion: z.string().optional(),

  // Contenido
  synopsis: z.string().optional(),
  synopsisLocked: z.boolean().optional(),
  notes: z.string().optional(),
  tagline: z.string().optional(),

  // Media
  posterUrl: z.string().nullable().optional(),
  posterPublicId: z.string().nullable().optional(),
  backdropUrl: z.string().nullable().optional(),
  backdropPublicId: z.string().nullable().optional(),
  trailerUrl: z.string().nullable().optional(),

  // IDs externos
  imdbId: z.string().optional(),
  tmdbId: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined) return null;
      const num = Number(val);
      return isNaN(num) ? null : num;
    },
    z.number().int().positive().nullable().optional()
  ),

  // Información técnica
  aspectRatio: z.string().optional(),
  colorTypeId: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined || val === 0 || (typeof val === 'number' && isNaN(val))) {
        return null;
      }
      return Number(val);
    },
    z.number().positive().nullable().optional()
  ),
  soundType: z.preprocess(
    (val) => (val === '' ? null : val),
    z.string().nullable().optional()
  ),
  filmFormat: z.string().optional(),

  // AGREGAR ESTOS CAMPOS DE METADATA
  metaDescription: z.string().optional(),
  metaKeywords: z.union([
    z.string(),
    z.array(z.string())
  ]).optional(),

  // Clasificación
  ratingId: z.union([
    z.number().positive(),  // Solo números positivos
    z.null(),               // O null
    z.literal(0).transform(() => null)  // Transforma 0 a null
  ]).optional(),
  certificateNumber: z.string().optional(),

  // Estado
  stage: z.enum([
    'COMPLETA',
    'EN_DESARROLLO',
    'EN_POSTPRODUCCION',
    'EN_PREPRODUCCION',
    'EN_PRODUCCION',
    'EN_RODAJE',
    'INCONCLUSA'
  ]).optional(),
  dataCompleteness: z.enum([
    'BASIC_PRESS_KIT',
    'FULL_PRESS_KIT',
    'MAIN_CAST',
    'MAIN_CREW',
    'FULL_CAST',
    'FULL_CREW'
  ]).optional(),

  // País y coproducción
  countries: z.array(z.number()).optional(),
  is_coproduction: z.boolean().optional(),
  production_type: z.string().optional(),

  // Relaciones (arrays de IDs)
  genres: z.array(z.number().positive())
    .optional()
    .default([])
    .transform(val => val.filter(v => v > 0 && !isNaN(v))),
  cast: z.array(z.any()).optional(),
  crew: z.array(z.any()).optional(),
  productionCompanies: z.array(z.number()).optional(),
  distributionCompanies: z.array(z.number()).optional(),
  themes: z.array(z.number()).optional(),
  alternativeTitles: z.array(z.any()).optional(),
  trivia: z.array(z.any()).optional(),
  links: z.array(z.any()).optional(),
  screeningVenues: z.array(z.object({
    venueId: z.number(),
    screeningDate: z.string().optional().nullable(),
    isPremiere: z.boolean().optional(),
    isExclusive: z.boolean().optional()
  })).optional()
})

export type MovieFormData = z.infer<typeof movieSchema>

export const movieReviewSchema = z.object({
  title: z.string().max(500).optional().nullable(),
  summary: z.string().optional().nullable(),
  url: z.string().max(1000).optional().nullable(),
  content: z.string().optional().nullable(),
  language: z.string().max(10).optional().default('es'),
  hasPaywall: z.boolean().optional().default(false),
  score: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined) return null
      const num = Number(val)
      return isNaN(num) ? null : num
    },
    z.number().int().min(1).max(10).nullable().optional()
  ),
  authorId: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined || val === 0) return null
      return Number(val)
    },
    z.number().int().positive().nullable().optional()
  ),
  mediaOutletId: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined || val === 0) return null
      return Number(val)
    },
    z.number().int().positive().nullable().optional()
  ),
  publishYear: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined) return null
      return Number(val)
    },
    z.number().int().positive().nullable().optional()
  ),
  publishMonth: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined) return null
      return Number(val)
    },
    z.number().int().min(1).max(12).nullable().optional()
  ),
  publishDay: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined) return null
      return Number(val)
    },
    z.number().int().min(1).max(31).nullable().optional()
  ),
  sortOrder: z.number().int().optional().default(0)
})

export type MovieReviewFormData = z.infer<typeof movieReviewSchema>