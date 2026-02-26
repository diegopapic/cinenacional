// src/app/api/genres/route.ts
import { createListAndCreateHandlers } from '@/lib/api/crud-factory'

const INCLUDE = { _count: { select: { movies: true } } }

export const { GET, POST } = createListAndCreateHandlers({
  model: 'genre',
  entityName: 'el género',
  orderBy: { name: 'asc' },
  include: INCLUDE,
  buildCreateData: (body) => ({
    name: body.name.trim(),
    description: body.description?.trim() || null
  })
})
