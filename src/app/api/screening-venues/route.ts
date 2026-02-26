// src/app/api/screening-venues/route.ts
import { z } from 'zod'
import { createListAndCreateHandlers } from '@/lib/api/crud-factory'

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

export const { GET, POST } = createListAndCreateHandlers({
  model: 'screeningVenue',
  entityName: 'las pantallas de estreno',
  orderBy: [{ type: 'asc' }, { name: 'asc' }],
  include: INCLUDE,
  includeOnCreate: INCLUDE,
  search: { fields: ['name', 'description'] },
  pagination: { itemsKey: 'venues', defaultLimit: 20 },
  extraFilters: (params) => {
    const filters: Record<string, any> = {}
    const type = params.get('type')
    if (type) filters.type = type
    const isActive = params.get('isActive')
    if (isActive !== null && isActive !== '') filters.isActive = isActive === 'true'
    return filters
  },
  zodSchema: screeningVenueSchema,
  buildCreateData: (data) => ({
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
  })
})
