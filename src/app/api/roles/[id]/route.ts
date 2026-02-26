// src/app/api/roles/[id]/route.ts

import { createItemHandlers } from '@/lib/api/crud-factory'
import { roleSchema } from '@/lib/roles/rolesTypes'

const INCLUDE = { _count: { select: { crewRoles: true } } }

export const { GET, PUT, DELETE } = createItemHandlers({
  model: 'role',
  entityName: 'Rol',
  include: INCLUDE,
  zodSchema: roleSchema,
  regenerateSlugOnUpdate: true,
  buildUpdateData: (data) => ({ ...data }),
  deleteCheck: {
    relation: 'crewRoles',
    message: (count) =>
      `No se puede eliminar el rol porque está asignado a ${count} película(s)`
  }
})
