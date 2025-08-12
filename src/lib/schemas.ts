// src/lib/schemas.ts
import { z } from 'zod'

export const movieSchema = z.object({
  // Información básica
  title: z.string().min(1, 'El título es requerido'),
  originalTitle: z.string().optional(),
  year: z.number().optional(),

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
  duration: z.number().optional(),
  durationSeconds: z.number().optional(),
  tipoDuracion: z.string().optional(),

  // Contenido
  synopsis: z.string().optional(),
  tagline: z.string().optional(),

  // Media
  posterUrl: z.string().optional(),
  posterPublicId: z.string().optional(),
  backdropUrl: z.string().optional(),
  backdropPublicId: z.string().optional(),
  trailerUrl: z.string().optional(),

  // IDs externos
  imdbId: z.string().optional(),

  // Información técnica
  aspectRatio: z.string().optional(),
  colorTypeId: z.number().optional(),
  soundType: z.string().optional(),
  filmFormat: z.string().optional(),

  // Clasificación
  ratingId: z.number().optional(),
  certificateNumber: z.string().optional(),

  // Estado
  stage: z.enum([
    'COMPLETA',
    'EN_DESARROLLO',
    'EN_POSTPRODUCCION',
    'EN_PREPRODUCCION',
    'EN_RODAJE',
    'INCONCLUSA',
    'INEDITA'
  ]).optional(),
  dataCompleteness: z.enum([
    'BASIC_PRESS_KIT',
    'FULL_PRESS_KIT',
    'MAIN_CAST',
    'MAIN_CREW',
    'FULL_CAST',
    'FULL_CREW'
  ]).optional(),

  // SEO
  metaDescription: z.string().optional(),
  metaKeywords: z.union([z.string(), z.array(z.string())]).optional(),

  // País y coproducción
  countries: z.array(z.number()).optional(),
  is_coproduction: z.boolean().optional(),
  production_type: z.string().optional(),

  // Relaciones (arrays de IDs)
  genres: z.array(z.number()).optional(),
  cast: z.array(z.any()).optional(),
  crew: z.array(z.any()).optional(),
  languages: z.array(z.number()).optional(),
  productionCompanies: z.array(z.number()).optional(),
  distributionCompanies: z.array(z.number()).optional(),
  themes: z.array(z.number()).optional(),
  alternativeTitles: z.array(z.any()).optional(),
  links: z.array(z.any()).optional()
})

export type MovieFormData = z.infer<typeof movieSchema>