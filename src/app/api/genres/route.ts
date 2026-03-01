// src/app/api/genres/route.ts
import { createListAndCreateHandlers } from '@/lib/api/crud-factory'
import { z } from 'zod'

const genreSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100).transform(s => s.trim()),
  description: z.string().optional().transform(s => s?.trim() || null)
})

const INCLUDE = { _count: { select: { movies: true } } }

export const { GET, POST } = createListAndCreateHandlers({
  model: 'genre',
  entityName: 'el género',
  orderBy: { name: 'asc' },
  include: INCLUDE,
  zodSchema: genreSchema,
  buildCreateData: (body) => ({
    name: body.name,
    description: body.description
  }),
  formatResponse: (items) =>
    items.map((genre) => ({
      ...genre,
      movieCount: genre._count.movies
    }))
})
