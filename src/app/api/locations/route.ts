// src/app/api/locations/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateUniqueSlug } from '@/lib/utils/slugs'
import { requireAuth } from '@/lib/auth'
import { apiHandler } from '@/lib/api/api-handler'

// Forzar que esta ruta sea dinámica
/**
 * dynamic
 * @TODO Add documentation
 */
export const dynamic = 'force-dynamic'
/**
 * revalidate
 * @TODO Add documentation
 */
export const revalidate = 0

// GET /api/locations - Listar lugares con filtros opcionales
/**
 * GET
 * @TODO Add documentation
 */
export const GET = apiHandler(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams
  const parentId = searchParams.get('parentId')
  const search = searchParams.get('search')
  const includeChildren = searchParams.get('includeChildren') === 'true'

  const where: any = {}

  if (parentId === 'null') {
    where.parentId = null
  } else if (parentId) {
    where.parentId = parseInt(parentId)
  }

  if (search) {
    where.name = {
      contains: search,
      mode: 'insensitive'
    }
  }

  const locations = await prisma.location.findMany({
    where,
    include: {
      parent: true,
      children: includeChildren ? {
        include: {
          children: true
        }
      } : false,
      _count: {
        select: {
          children: true,
          peopleBornHere: true,
          peopleDiedHere: true
        }
      }
    },
    orderBy: [
      { parentId: 'asc' },
      { name: 'asc' }
    ]
  })

  return NextResponse.json(locations, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  })
}, 'obtener los lugares')

// POST /api/locations - Crear nuevo lugar
/**
 * POST
 * @TODO Add documentation
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const body = await request.json()
  const { name, parentId, latitude, longitude } = body

  // Validaciones
  if (!name || name.trim() === '') {
    return NextResponse.json(
      { error: 'El nombre es requerido' },
      { status: 400 }
    )
  }

  // Generar slug único
  const slug = await generateUniqueSlug(name, 'location', prisma)

  const location = await prisma.location.create({
    data: {
      name,
      slug,
      parent: parentId ? { connect: { id: parseInt(parentId) } } : undefined,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null
    },
    include: {
      parent: true
    }
  })

  return NextResponse.json(location, { status: 201 })
}, 'crear el lugar')
