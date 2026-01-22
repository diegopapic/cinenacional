// src/lib/festivals/festivalTypes.ts

import { z } from 'zod'

// ============================================================================
// ENUMS
// ============================================================================

export const PremiereType = {
  WORLD_PREMIERE: 'WORLD_PREMIERE',
  INTERNATIONAL_PREMIERE: 'INTERNATIONAL_PREMIERE',
  NATIONAL_PREMIERE: 'NATIONAL_PREMIERE',
  REGIONAL_PREMIERE: 'REGIONAL_PREMIERE',
  REGULAR: 'REGULAR',
} as const

export type PremiereType = (typeof PremiereType)[keyof typeof PremiereType]

export const PremiereTypeLabels: Record<PremiereType, string> = {
  WORLD_PREMIERE: 'Premiere mundial',
  INTERNATIONAL_PREMIERE: 'Premiere internacional',
  NATIONAL_PREMIERE: 'Premiere nacional',
  REGIONAL_PREMIERE: 'Premiere regional',
  REGULAR: 'Proyección',
}

export const FestivalAwardType = {
  FILM: 'FILM',
  PERSON: 'PERSON',
  TECHNICAL: 'TECHNICAL',
  HONORARY: 'HONORARY',
  AUDIENCE: 'AUDIENCE',
} as const

export type FestivalAwardType = (typeof FestivalAwardType)[keyof typeof FestivalAwardType]

export const FestivalAwardTypeLabels: Record<FestivalAwardType, string> = {
  FILM: 'Premio a película',
  PERSON: 'Premio a persona',
  TECHNICAL: 'Premio técnico',
  HONORARY: 'Premio honorario',
  AUDIENCE: 'Premio del público',
}

// ============================================================================
// SCHEMAS DE VALIDACIÓN - FESTIVAL
// ============================================================================

export const festivalFormSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  shortName: z.string().optional(),
  slug: z.string().min(1, 'El slug es requerido'),
  description: z.string().optional(),
  logoUrl: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  locationId: z.number({ required_error: 'La ciudad es requerida' }),
  foundedYear: z.preprocess(
    (val) => (val === '' || val === null ? null : Number(val)),
    z.number().min(1800).max(new Date().getFullYear()).nullable().optional()
  ),
  isActive: z.boolean().default(true),
})

export type FestivalFormData = z.infer<typeof festivalFormSchema>

// ============================================================================
// SCHEMAS DE VALIDACIÓN - EDICIÓN
// ============================================================================

export const festivalEditionFormSchema = z.object({
  festivalId: z.number(),
  editionNumber: z.number().min(1, 'El número de edición es requerido'),
  year: z.number().min(1900).max(2100),
  startDate: z.string().min(1, 'La fecha de inicio es requerida'),
  endDate: z.string().min(1, 'La fecha de fin es requerida'),
  theme: z.string().optional(),
  description: z.string().optional(),
  posterUrl: z.string().optional(),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  isPublished: z.boolean().default(false),
})

export type FestivalEditionFormData = z.infer<typeof festivalEditionFormSchema>

// ============================================================================
// SCHEMAS DE VALIDACIÓN - SECCIÓN TEMPLATE
// ============================================================================

export const festivalSectionTemplateFormSchema = z.object({
  festivalId: z.number(),
  name: z.string().min(1, 'El nombre es requerido'),
  slug: z.string().min(1, 'El slug es requerido'),
  description: z.string().optional(),
  isCompetitive: z.boolean().default(false),
  displayOrder: z.number().default(0),
  isActive: z.boolean().default(true),
})

export type FestivalSectionTemplateFormData = z.infer<typeof festivalSectionTemplateFormSchema>

// ============================================================================
// SCHEMAS DE VALIDACIÓN - SECCIÓN
// ============================================================================

export const festivalSectionFormSchema = z.object({
  editionId: z.number(),
  templateId: z.number().nullable().optional(),
  name: z.string().min(1, 'El nombre es requerido'),
  slug: z.string().min(1, 'El slug es requerido'),
  description: z.string().optional(),
  isCompetitive: z.boolean().default(false),
  displayOrder: z.number().default(0),
})

export type FestivalSectionFormData = z.infer<typeof festivalSectionFormSchema>

// ============================================================================
// SCHEMAS DE VALIDACIÓN - PROYECCIÓN
// ============================================================================

export const festivalScreeningFormSchema = z.object({
  editionId: z.number(),
  sectionId: z.number({ required_error: 'La sección es requerida' }),
  movieId: z.number({ required_error: 'La película es requerida' }),
  screeningDate: z.string().min(1, 'La fecha de proyección es requerida'),
  screeningTime: z.string().optional(),
  venueId: z.number().nullable().optional(),
  premiereType: z.enum([
    'WORLD_PREMIERE',
    'INTERNATIONAL_PREMIERE',
    'NATIONAL_PREMIERE',
    'REGIONAL_PREMIERE',
    'REGULAR',
  ]).default('REGULAR'),
  isOfficial: z.boolean().default(true),
  notes: z.string().optional(),
})

export type FestivalScreeningFormData = z.infer<typeof festivalScreeningFormSchema>

// ============================================================================
// INTERFACES
// ============================================================================

export interface Festival {
  id: number
  slug: string
  name: string
  shortName?: string | null
  description?: string | null
  logoUrl?: string | null
  website?: string | null
  locationId: number
  foundedYear?: number | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  location?: {
    id: number
    name: string
  }
  _count?: {
    editions: number
    awards: number
  }
}

export interface FestivalEdition {
  id: number
  festivalId: number
  editionNumber: number
  year: number
  startDate: Date
  endDate: Date
  theme?: string | null
  description?: string | null
  posterUrl?: string | null
  websiteUrl?: string | null
  isPublished: boolean
  createdAt: Date
  updatedAt: Date
  festival?: Festival
  _count?: {
    sections: number
    screenings: number
    awardWinners: number
  }
}

export interface FestivalSectionTemplate {
  id: number
  festivalId: number
  slug: string
  name: string
  description?: string | null
  isCompetitive: boolean
  displayOrder: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface FestivalSection {
  id: number
  editionId: number
  templateId?: number | null
  slug: string
  name: string
  description?: string | null
  isCompetitive: boolean
  displayOrder: number
  createdAt: Date
  updatedAt: Date
  template?: FestivalSectionTemplate | null
  _count?: {
    screenings: number
    juryMembers: number
  }
}

export interface FestivalScreening {
  id: number
  editionId: number
  sectionId: number
  movieId: number
  screeningDate: Date
  screeningTime?: Date | null
  venueId?: number | null
  premiereType: PremiereType
  isOfficial: boolean
  notes?: string | null
  createdAt: Date
  updatedAt: Date
  movie?: {
    id: number
    title: string
    slug: string
    year?: number | null
    posterUrl?: string | null
  }
  section?: FestivalSection
  venue?: {
    id: number
    name: string
  } | null
}

export interface FestivalJury {
  id: number
  sectionId: number
  personId: number
  role?: string | null
  billingOrder: number
  createdAt: Date
  person?: {
    id: number
    firstName?: string | null
    lastName?: string | null
    photoUrl?: string | null
  }
}

export interface FestivalAward {
  id: number
  festivalId: number
  slug: string
  name: string
  description?: string | null
  awardType: FestivalAwardType
  isActive: boolean
  displayOrder: number
  createdAt: Date
  updatedAt: Date
}

export interface FestivalAwardWinner {
  id: number
  awardId: number
  editionId: number
  movieId?: number | null
  personId?: number | null
  result: 'WON' | 'NOMINATED'
  citation?: string | null
  notes?: string | null
  createdAt: Date
  updatedAt: Date
  award?: FestivalAward
  movie?: {
    id: number
    title: string
    slug: string
  } | null
  person?: {
    id: number
    firstName?: string | null
    lastName?: string | null
  } | null
}

// ============================================================================
// TIPOS PARA LISTADOS
// ============================================================================

export interface FestivalListItem {
  id: number
  slug: string
  name: string
  shortName?: string | null
  locationName: string
  foundedYear?: number | null
  isActive: boolean
  editionsCount: number
}

export interface FestivalEditionListItem {
  id: number
  editionNumber: number
  year: number
  startDate: Date
  endDate: Date
  isPublished: boolean
  sectionsCount: number
  screeningsCount: number
}

export interface FestivalScreeningListItem {
  id: number
  movieTitle: string
  movieSlug: string
  movieYear?: number | null
  sectionName: string
  screeningDate: Date
  screeningTime?: Date | null
  venueName?: string | null
  premiereType: PremiereType
}

// ============================================================================
// TIPOS PARA FORMULARIOS
// ============================================================================

export interface FestivalWithRelations extends Festival {
  location: {
    id: number
    name: string
  }
  editions: FestivalEdition[]
  sectionTemplates: FestivalSectionTemplate[]
  awards: FestivalAward[]
}

export interface FestivalEditionWithRelations extends FestivalEdition {
  festival: Festival
  sections: FestivalSection[]
  screenings: FestivalScreening[]
}
