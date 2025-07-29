// Schema de validación para crear/actualizar películas

import { z } from 'zod'

// src/lib/schemas.ts
export const movieSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  year: z.number().min(1895).max(new Date().getFullYear() + 5),
  releaseDate: z.string().optional(),
  duration: z.number().optional(),
  durationSeconds: z.number().optional(),
  tipoDuracion: z.string().optional(),
  synopsis: z.string().optional(),
  tagline: z.string().optional(),
  posterUrl: z.string().url().optional().or(z.literal('')),
  trailerUrl: z.string().url().optional().or(z.literal('')),
  imdbId: z.string().optional(),
  colorType: z.string().optional(),
  soundType: z.string().optional(),
  ratingId: z.number().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  metaDescription: z.string().optional(),
  metaKeywords: z.array(z.string()).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  dataCompleteness: z.enum([
    'BASIC_PRESS_KIT',
    'FULL_PRESS_KIT', 
    'MAIN_CAST',
    'MAIN_CREW',
    'FULL_CAST',
    'FULL_CREW'
  ]).optional(),
  metaDescription: z.string().optional(),
  // Relaciones
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
    jobTitle: z.string().optional(),
    billingOrder: z.number().optional()
  })).optional(),
  countries: z.array(z.number()).optional(),
  languages: z.array(z.number()).optional(),
  productionCompanies: z.array(z.number()).optional(),
  distributionCompanies: z.array(z.number()).optional(),
  themes: z.array(z.number()).optional()
})