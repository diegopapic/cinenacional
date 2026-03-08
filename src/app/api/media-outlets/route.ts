// src/app/api/media-outlets/route.ts
import { createListAndCreateHandlers } from '@/lib/api/crud-factory'

const INCLUDE = { _count: { select: { reviews: true } } }

export const { GET, POST } = createListAndCreateHandlers({
  model: 'mediaOutlet',
  entityName: 'el medio',
  include: INCLUDE,
  search: { fields: ['name'] },
  sort: { defaultField: 'name', defaultOrder: 'asc' },
  buildCreateData: (body) => ({
    name: body.name.trim(),
    url: body.url || null
  }),
  formatResponse: (items) =>
    items.map((outlet) => ({
      ...outlet,
      reviewCount: outlet._count.reviews
    }))
})
