// src/app/api/media-outlets/[id]/route.ts
import { createItemHandlers } from '@/lib/api/crud-factory'

const INCLUDE = { _count: { select: { reviews: true } } }

export const { GET, PUT, DELETE } = createItemHandlers({
  model: 'mediaOutlet',
  entityName: 'Medio',
  include: INCLUDE,
  regenerateSlugOnUpdate: true,
  buildUpdateData: (body) => ({
    name: body.name?.trim(),
    url: body.url || null
  }),
  deleteCheck: {
    relation: 'reviews',
    message: (count) =>
      `No se puede eliminar el medio porque tiene ${count} crítica(s) asociada(s)`
  },
  formatResponse: (item) => ({
    ...item,
    reviewCount: item._count.reviews
  })
})
