// src/app/api/calificaciones/[id]/route.ts
import { createItemHandlers } from '@/lib/api/crud-factory'

const INCLUDE = { _count: { select: { movies: true } } }

export const { GET, PUT, DELETE } = createItemHandlers({
  model: 'rating',
  entityName: 'Calificación',
  include: INCLUDE,
  buildUpdateData: (body) => ({
    name: body.name.trim(),
    abbreviation: body.abbreviation?.trim() || null,
    description: body.description?.trim() || null
  }),
  deleteCheck: {
    relation: 'movies',
    message: () =>
      'No se puede eliminar una calificación que tiene películas asociadas'
  }
})
