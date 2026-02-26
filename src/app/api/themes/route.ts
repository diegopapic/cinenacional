// src/app/api/themes/route.ts
import { createListAndCreateHandlers } from '@/lib/api/crud-factory'

const INCLUDE = { _count: { select: { movies: true } } }

export const { GET, POST } = createListAndCreateHandlers({
  model: 'theme',
  entityName: 'el theme',
  include: INCLUDE,
  search: { fields: ['name', 'description'] },
  sort: { defaultField: 'name', defaultOrder: 'asc' },
  buildCreateData: (body) => ({
    name: body.name.trim(),
    description: body.description || null
  }),
  formatResponse: (items) =>
    items.map((theme) => ({
      ...theme,
      movieCount: theme._count.movies
    }))
})
