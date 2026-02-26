// src/app/api/calificaciones/route.ts
import { createListAndCreateHandlers } from '@/lib/api/crud-factory'

const INCLUDE = { _count: { select: { movies: true } } }

export const { GET, POST } = createListAndCreateHandlers({
  model: 'rating',
  entityName: 'la calificación',
  orderBy: { name: 'asc' },
  include: INCLUDE,
  buildCreateData: (body) => ({
    name: body.name.trim(),
    abbreviation: body.abbreviation?.trim() || null,
    description: body.description?.trim() || null
  })
})
