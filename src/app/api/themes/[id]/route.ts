// src/app/api/themes/[id]/route.ts
import { createItemHandlers } from '@/lib/api/crud-factory'

const INCLUDE = { _count: { select: { movies: true } } }

const INCLUDE_DETAIL = {
  movies: {
    include: {
      movie: {
        select: {
          id: true,
          title: true,
          slug: true,
          year: true,
          posterUrl: true
        }
      }
    }
  },
  _count: { select: { movies: true } }
}

export const { GET, PUT, DELETE } = createItemHandlers({
  model: 'theme',
  entityName: 'Theme',
  include: INCLUDE,
  includeOnDetail: INCLUDE_DETAIL,
  regenerateSlugOnUpdate: true,
  buildUpdateData: (body) => ({
    name: body.name?.trim(),
    description: body.description || null
  }),
  deleteCheck: {
    relation: 'movies',
    message: (count) =>
      `No se puede eliminar el theme porque está asignado a ${count} película(s)`
  },
  formatResponse: (item) => ({
    ...item,
    movieCount: item._count.movies
  })
})
