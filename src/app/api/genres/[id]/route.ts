// src/app/api/genres/[id]/route.ts
import { createItemHandlers } from '@/lib/api/crud-factory'

const INCLUDE = { _count: { select: { movies: true } } }

export const { GET, PUT, DELETE } = createItemHandlers({
  model: 'genre',
  entityName: 'Género',
  include: INCLUDE,
  buildUpdateData: (body) => ({
    name: body.name.trim(),
    description: body.description?.trim() || null
  }),
  deleteCheck: {
    relation: 'movies',
    message: (count) =>
      `No se puede eliminar el género porque tiene ${count} película(s) asociada(s)`
  }
})
