// src/app/api/genres/[id]/route.ts
import { createItemHandlers } from '@/lib/api/crud-factory'
import { z } from 'zod'

const genreSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100).transform(s => s.trim()),
  description: z.string().optional().transform(s => s?.trim() || null)
})

const INCLUDE = { _count: { select: { movies: true } } }

export const { GET, PUT, DELETE } = createItemHandlers({
  model: 'genre',
  entityName: 'Género',
  include: INCLUDE,
  zodSchema: genreSchema,
  regenerateSlugOnUpdate: true,
  buildUpdateData: (body) => ({
    name: body.name,
    description: body.description
  }),
  deleteCheck: {
    relation: 'movies',
    message: (count) =>
      `No se puede eliminar el género porque tiene ${count} película(s) asociada(s)`
  },
  formatResponse: (item) => ({
    ...item,
    movieCount: item._count.movies
  })
})
