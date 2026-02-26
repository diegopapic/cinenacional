// src/lib/api/crud-factory.ts
// Factory para generar handlers CRUD de API routes con patrón común.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSlug } from '@/lib/utils'
import { requireAuth } from '@/lib/auth'
import { ZodError, type ZodSchema } from 'zod'

// ---------------------------------------------------------------------------
// Helpers (exportados para uso independiente fuera del factory)
// ---------------------------------------------------------------------------

/**
 * Parsea y valida un ID numérico desde params de ruta.
 * Retorna el número o null si es inválido.
 */
export function parseId(idStr: string): number | null {
  const id = parseInt(idStr)
  return isNaN(id) ? null : id
}

/**
 * Genera un slug único para un modelo, verificando colisiones en la DB.
 * Opcionalmente excluye un ID (para updates).
 */
export async function makeUniqueSlug(
  name: string,
  modelDelegate: PrismaModelDelegate,
  excludeId?: number
): Promise<string> {
  const baseSlug = createSlug(name)
  let slug = baseSlug
  let counter = 1

  while (true) {
    const where: Record<string, unknown> = { slug }
    if (excludeId) where.NOT = { id: excludeId }
    const exists = await modelDelegate.findFirst({ where })
    if (!exists) return slug
    slug = `${baseSlug}-${counter}`
    counter++
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PrismaModelDelegate = {
  findMany: (args?: any) => Promise<any[]>
  findUnique: (args: any) => Promise<any>
  findFirst: (args: any) => Promise<any>
  create: (args: any) => Promise<any>
  update: (args: any) => Promise<any>
  delete: (args: any) => Promise<any>
  count: (args?: any) => Promise<number>
}

interface SearchConfig {
  /** Campos sobre los que buscar (insensitive contains) */
  fields: string[]
}

interface SortConfig {
  defaultField: string
  defaultOrder: 'asc' | 'desc'
}

export interface ListCreateConfig {
  /** Nombre del modelo Prisma (e.g., 'genre', 'rating', 'theme') */
  model: string
  /** Nombre de la entidad para mensajes de error (e.g., 'el género', 'la calificación') */
  entityName: string
  /** Ordenamiento por defecto para GET list */
  orderBy?: any
  /** Include de Prisma para las queries */
  include?: any
  /** Soporte de búsqueda en GET list (vía ?search=) */
  search?: SearchConfig
  /** Soporte de sort dinámico en GET list (vía ?sortBy= y ?sortOrder=) */
  sort?: SortConfig
  /** Transforma el body del POST en los datos para prisma.create() */
  buildCreateData: (body: any) => Record<string, any>
  /** Include específico para la respuesta del create (default: usa `include`) */
  includeOnCreate?: any
  /** Transforma la lista antes de retornarla como JSON */
  formatResponse?: (items: any[]) => any
  /** Schema Zod para validar POST body. Cuando se provee, reemplaza validateName. */
  zodSchema?: ZodSchema
}

export interface ItemConfig {
  /** Nombre del modelo Prisma */
  model: string
  /** Nombre de la entidad para mensajes de error */
  entityName: string
  /** Include de Prisma para GET/PUT */
  include?: any
  /** Include específico para GET by ID (si difiere del general) */
  includeOnDetail?: any
  /** Transforma el body del PUT en datos para prisma.update() */
  buildUpdateData: (body: any, existing: any) => Record<string, any>
  /** Si true, regenera el slug cuando el nombre cambia en PUT */
  regenerateSlugOnUpdate?: boolean
  /** Include específico para la respuesta del update */
  includeOnUpdate?: any
  /** Configuración de protección contra borrado */
  deleteCheck?: {
    /** Nombre de la relación a contar (e.g., 'movies', 'screenings') */
    relation: string
    /** Función que genera el mensaje de error dado el count */
    message: (count: number) => string
    /** Status code del error (default: 400) */
    statusCode?: number
  }
  /** Transforma el item antes de retornarlo como JSON en GET */
  formatResponse?: (item: any) => any
  /** Schema Zod para validar PUT body. Cuando se provee, reemplaza validateName. */
  zodSchema?: ZodSchema
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getModel(modelName: string): PrismaModelDelegate {
  return (prisma as any)[modelName]
}

function validateName(body: any): NextResponse | null {
  if (!body.name || (typeof body.name === 'string' && !body.name.trim())) {
    return NextResponse.json(
      { error: 'El nombre es requerido' },
      { status: 400 }
    )
  }
  return null
}

function formatZodError(error: ZodError): string {
  return error.errors.map(e => e.message).join(', ')
}

// ---------------------------------------------------------------------------
// Factory: List + Create handlers (para route.ts)
// ---------------------------------------------------------------------------

export function createListAndCreateHandlers(config: ListCreateConfig) {
  const model = getModel(config.model)

  async function GET(request: NextRequest) {
    try {
      // Build where clause (search)
      let where: any = undefined
      if (config.search) {
        const searchParams = request.nextUrl.searchParams
        const search = searchParams.get('search') || ''
        if (search) {
          where = {
            OR: config.search.fields.map(field => ({
              [field]: { contains: search, mode: 'insensitive' as const }
            }))
          }
        }
      }

      // Build orderBy (sort)
      let orderBy = config.orderBy
      if (config.sort) {
        const searchParams = request.nextUrl.searchParams
        const sortBy = searchParams.get('sortBy') || config.sort.defaultField
        const sortOrder = searchParams.get('sortOrder') || config.sort.defaultOrder
        orderBy = { [sortBy]: sortOrder }
      }

      const items = await model.findMany({
        ...(where && { where }),
        ...(orderBy && { orderBy }),
        ...(config.include && { include: config.include })
      })

      if (config.formatResponse) {
        return NextResponse.json(config.formatResponse(items))
      }

      return NextResponse.json(items)
    } catch (error) {
      console.error(`Error fetching ${config.model}s:`, error)
      return NextResponse.json(
        { error: `Error al obtener ${config.entityName}` },
        { status: 500 }
      )
    }
  }

  async function POST(request: NextRequest) {
    const auth = await requireAuth()
    if (auth.error) return auth.error

    try {
      const body = await request.json()

      let data: any = body
      if (config.zodSchema) {
        data = config.zodSchema.parse(body)
      } else {
        const nameError = validateName(body)
        if (nameError) return nameError
      }

      const slug = await makeUniqueSlug(data.name, model)
      const includeForCreate = config.includeOnCreate ?? config.include

      const item = await model.create({
        data: {
          ...config.buildCreateData(data),
          slug
        },
        ...(includeForCreate && { include: includeForCreate })
      })

      return NextResponse.json(item, { status: 201 })
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: formatZodError(error) },
          { status: 400 }
        )
      }
      console.error(`Error creating ${config.model}:`, error)
      return NextResponse.json(
        { error: `Error al crear ${config.entityName}` },
        { status: 500 }
      )
    }
  }

  return { GET, POST }
}

// ---------------------------------------------------------------------------
// Factory: Item handlers (para [id]/route.ts)
// ---------------------------------------------------------------------------

export function createItemHandlers(config: ItemConfig) {
  const model = getModel(config.model)

  async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
  ) {
    try {
      const id = parseId(params.id)
      if (id === null) {
        return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
      }

      const includeForDetail = config.includeOnDetail ?? config.include

      const item = await model.findUnique({
        where: { id },
        ...(includeForDetail && { include: includeForDetail })
      })

      if (!item) {
        return NextResponse.json(
          { error: `${config.entityName} no encontrado/a` },
          { status: 404 }
        )
      }

      if (config.formatResponse) {
        return NextResponse.json(config.formatResponse(item))
      }

      return NextResponse.json(item)
    } catch (error) {
      console.error(`Error fetching ${config.model}:`, error)
      return NextResponse.json(
        { error: `Error al obtener ${config.entityName}` },
        { status: 500 }
      )
    }
  }

  async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
  ) {
    const auth = await requireAuth()
    if (auth.error) return auth.error

    try {
      const id = parseId(params.id)
      if (id === null) {
        return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
      }

      const body = await request.json()

      let data: any = body
      if (config.zodSchema) {
        data = config.zodSchema.parse(body)
      } else {
        const nameError = validateName(body)
        if (nameError) return nameError
      }

      const existing = await model.findUnique({ where: { id } })
      if (!existing) {
        return NextResponse.json(
          { error: `${config.entityName} no encontrado/a` },
          { status: 404 }
        )
      }

      let updateData = config.buildUpdateData(data, existing)

      if (config.regenerateSlugOnUpdate && data.name && data.name !== existing.name) {
        const slug = await makeUniqueSlug(data.name, model, id)
        updateData = { ...updateData, slug }
      }

      const includeForUpdate = config.includeOnUpdate ?? config.include

      const item = await model.update({
        where: { id },
        data: updateData,
        ...(includeForUpdate && { include: includeForUpdate })
      })

      return NextResponse.json(item)
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: formatZodError(error) },
          { status: 400 }
        )
      }
      console.error(`Error updating ${config.model}:`, error)
      return NextResponse.json(
        { error: `Error al actualizar ${config.entityName}` },
        { status: 500 }
      )
    }
  }

  async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
  ) {
    const auth = await requireAuth()
    if (auth.error) return auth.error

    try {
      const id = parseId(params.id)
      if (id === null) {
        return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
      }

      const includeForCheck = config.deleteCheck
        ? { _count: { select: { [config.deleteCheck.relation]: true } } }
        : undefined

      const item = await model.findUnique({
        where: { id },
        ...(includeForCheck && { include: includeForCheck })
      })

      if (!item) {
        return NextResponse.json(
          { error: `${config.entityName} no encontrado/a` },
          { status: 404 }
        )
      }

      if (config.deleteCheck) {
        const count = item._count?.[config.deleteCheck.relation] ?? 0
        if (count > 0) {
          return NextResponse.json(
            { error: config.deleteCheck.message(count) },
            { status: config.deleteCheck.statusCode ?? 400 }
          )
        }
      }

      await model.delete({ where: { id } })

      return new NextResponse(null, { status: 204 })
    } catch (error) {
      console.error(`Error deleting ${config.model}:`, error)
      return NextResponse.json(
        { error: `Error al eliminar ${config.entityName}` },
        { status: 500 }
      )
    }
  }

  return { GET, PUT, DELETE }
}
