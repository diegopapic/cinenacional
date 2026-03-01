// src/app/api/calificaciones/[id]/route.ts
import { createItemHandlers } from '@/lib/api/crud-factory'
import { z } from 'zod'

const ratingSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100).transform(s => s.trim()),
  abbreviation: z.string().max(10).optional().transform(s => s?.trim() || null),
  description: z.string().optional().transform(s => s?.trim() || null)
})

const INCLUDE = { _count: { select: { movies: true } } }

export const { GET, PUT, DELETE } = createItemHandlers({
  model: 'rating',
  entityName: 'Calificación',
  include: INCLUDE,
  zodSchema: ratingSchema,
  regenerateSlugOnUpdate: true,
  buildUpdateData: (body) => ({
    name: body.name,
    abbreviation: body.abbreviation,
    description: body.description
  }),
  deleteCheck: {
    relation: 'movies',
    message: () =>
      'No se puede eliminar una calificación que tiene películas asociadas'
  },
  formatResponse: (item) => ({
    ...item,
    movieCount: item._count.movies
  })
})
