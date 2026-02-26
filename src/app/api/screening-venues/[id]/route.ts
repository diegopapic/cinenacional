// src/app/api/screening-venues/[id]/route.ts
import { z } from 'zod'
import { createItemHandlers } from '@/lib/api/crud-factory'

const screeningVenueSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  type: z.enum(['CINEMA', 'STREAMING', 'TV_CHANNEL', 'OTHER']),
  description: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  country: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  isActive: z.boolean().optional()
})

const INCLUDE = { _count: { select: { screenings: true } } }

export const { GET, PUT, DELETE } = createItemHandlers({
  model: 'screeningVenue',
  entityName: 'Pantalla de estreno',
  include: INCLUDE,
  zodSchema: screeningVenueSchema,
  buildUpdateData: (data) => ({
    name: data.name,
    type: data.type,
    description: data.description || undefined,
    logoUrl: data.logoUrl || undefined,
    website: data.website || undefined,
    address: data.address || undefined,
    city: data.city || undefined,
    province: data.province || undefined,
    country: data.country || undefined,
    latitude: data.latitude,
    longitude: data.longitude,
    isActive: data.isActive
  }),
  deleteCheck: {
    relation: 'screenings',
    message: (count) =>
      `No se puede eliminar la pantalla de estreno porque tiene ${count} película${count > 1 ? 's' : ''} asociada${count > 1 ? 's' : ''}`,
    statusCode: 409,
    extraResponse: (count) => ({ moviesCount: count })
  }
})
