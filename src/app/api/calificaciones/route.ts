// src/app/api/calificaciones/route.ts
import { createListAndCreateHandlers } from '@/lib/api/crud-factory'
import { z } from 'zod'

const ratingSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100).transform(s => s.trim()),
  abbreviation: z.string().max(10).optional().transform(s => s?.trim() || null),
  description: z.string().optional().transform(s => s?.trim() || null)
})

const INCLUDE = { _count: { select: { movies: true } } }

export const { GET, POST } = createListAndCreateHandlers({
  model: 'rating',
  entityName: 'la calificación',
  orderBy: { name: 'asc' },
  include: INCLUDE,
  zodSchema: ratingSchema,
  buildCreateData: (body) => ({
    name: body.name,
    abbreviation: body.abbreviation,
    description: body.description
  }),
  formatResponse: (items) =>
    items.map((rating) => ({
      ...rating,
      movieCount: rating._count.movies
    }))
})
