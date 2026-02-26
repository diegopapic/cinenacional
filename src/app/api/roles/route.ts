// src/app/api/roles/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { roleSchema, Department } from '@/lib/roles/rolesTypes'
import { makeUniqueSlug } from '@/lib/api/crud-factory'
import { requireAuth } from '@/lib/auth'
import { ZodError } from 'zod'

const INCLUDE = { _count: { select: { crewRoles: true } } }

// ---------------------------------------------------------------------------
// GET — Custom: unaccent search, filtros extra, sort-by-usage, CSV export
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const department = searchParams.get('department') as Department
    const isActive = searchParams.get('isActive')
    const isMainRole = searchParams.get('isMainRole')
    const exportFormat = searchParams.get('export')
    const sortBy = searchParams.get('sortBy') || 'usage'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const offset = (page - 1) * limit

    // Build extra filters (reutilizado en ambos paths)
    function buildExtraWhere(where: any) {
      if (department && Object.values(Department).includes(department)) {
        where.department = department
      }
      if (isActive !== null && isActive !== '') {
        where.isActive = isActive === 'true'
      }
      if (isMainRole !== null && isMainRole !== '') {
        where.isMainRole = isMainRole === 'true'
      }
      return where
    }

    // Intentar búsqueda con unaccent si hay search >= 2 chars
    if (search && search.trim().length >= 2) {
      try {
        const searchPattern = `%${search.toLowerCase().trim()}%`

        const rolesWithSearch = await prisma.$queryRaw<{ id: number }[]>`
          SELECT id
          FROM roles
          WHERE
            unaccent(LOWER(name)) LIKE unaccent(${searchPattern})
            OR unaccent(LOWER(COALESCE(description, ''))) LIKE unaccent(${searchPattern})
        `

        if (rolesWithSearch.length === 0) {
          return NextResponse.json({
            data: [],
            totalCount: 0,
            page,
            totalPages: 0,
            hasMore: false
          })
        }

        const where = buildExtraWhere({
          id: { in: rolesWithSearch.map(r => r.id) }
        })

        const roles = await prisma.role.findMany({ where, include: INCLUDE })

        return respondWithRoles(roles, { sortBy, sortOrder, offset, limit, page, exportFormat })
      } catch {
        // unaccent no disponible — continuar con búsqueda normal
      }
    }

    // Búsqueda normal sin unaccent
    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } }
      ]
    }

    buildExtraWhere(where)

    // Sort por usage requiere fetch completo + sort manual
    if (sortBy === 'usage') {
      const roles = await prisma.role.findMany({ where, include: INCLUDE })
      return respondWithRoles(roles, { sortBy, sortOrder, offset, limit, page, exportFormat })
    }

    // Sort por campo directo — podemos usar orderBy + skip/take de Prisma
    let orderBy: any
    if (sortBy === 'name') {
      orderBy = { name: sortOrder }
    } else if (sortBy === 'department') {
      orderBy = [{ department: sortOrder }, { name: 'asc' }]
    } else if (sortBy === 'createdAt') {
      orderBy = { createdAt: sortOrder }
    } else {
      orderBy = [{ department: 'asc' }, { name: 'asc' }]
    }

    // CSV export necesita todos los registros
    if (exportFormat === 'csv') {
      const roles = await prisma.role.findMany({ where, include: INCLUDE, orderBy })
      return buildCsvResponse(roles)
    }

    const [roles, totalCount] = await Promise.all([
      prisma.role.findMany({ where, include: INCLUDE, orderBy, skip: offset, take: limit }),
      prisma.role.count({ where })
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      data: roles,
      totalCount,
      page,
      totalPages,
      hasMore: page < totalPages
    })
  } catch (error) {
    console.error('Error fetching roles:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// POST — Usa factory helpers + Zod validation
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    const data = roleSchema.parse(body)

    const slug = await makeUniqueSlug(data.name, prisma.role as any)

    const role = await prisma.role.create({
      data: {
        ...data,
        slug,
        isActive: data.isActive ?? true,
        isMainRole: data.isMainRole ?? false
      },
      include: INCLUDE
    })

    return NextResponse.json(role, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.errors.map(e => e.message).join(', ') },
        { status: 400 }
      )
    }
    console.error('Error creating role:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

interface RespondOpts {
  sortBy: string
  sortOrder: string
  offset: number
  limit: number
  page: number
  exportFormat: string | null
}

function respondWithRoles(roles: any[], opts: RespondOpts) {
  // Sort in memory
  if (opts.sortBy === 'usage') {
    roles.sort((a, b) => {
      const countA = a._count?.crewRoles || 0
      const countB = b._count?.crewRoles || 0
      return opts.sortOrder === 'desc' ? countB - countA : countA - countB
    })
  } else if (opts.sortBy === 'name') {
    roles.sort((a, b) =>
      opts.sortOrder === 'desc'
        ? b.name.localeCompare(a.name)
        : a.name.localeCompare(b.name)
    )
  }

  if (opts.exportFormat === 'csv') {
    return buildCsvResponse(roles)
  }

  const paginatedRoles = roles.slice(opts.offset, opts.offset + opts.limit)
  const totalCount = roles.length
  const totalPages = Math.ceil(totalCount / opts.limit)

  return NextResponse.json({
    data: paginatedRoles,
    totalCount,
    page: opts.page,
    totalPages,
    hasMore: opts.page < totalPages
  })
}

function buildCsvResponse(roles: any[]) {
  const csv = [
    'ID,Nombre,Departamento,Descripción,Principal,Activo,Usos',
    ...roles.map(role =>
      `${role.id},"${role.name}","${role.department}","${role.description || ''}",${role.isMainRole ? 'Sí' : 'No'},${role.isActive ? 'Sí' : 'No'},${role._count.crewRoles}`
    )
  ].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="roles_${new Date().toISOString().split('T')[0]}.csv"`
    }
  })
}
