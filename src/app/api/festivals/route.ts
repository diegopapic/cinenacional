// src/app/api/festivals/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { festivalFormSchema } from '@/lib/festivals/festivalTypes'
import { requireAuth } from '@/lib/auth'
import { apiHandler } from '@/lib/api/api-handler'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export const GET = apiHandler(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams
  const search = searchParams.get('search')
  const isActive = searchParams.get('isActive')
  const locationId = searchParams.get('locationId')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  const where: any = {}

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { shortName: { contains: search, mode: 'insensitive' } },
    ]
  }

  if (isActive !== null && isActive !== undefined) {
    where.isActive = isActive === 'true'
  }

  if (locationId) {
    where.locationId = parseInt(locationId)
  }

  const [festivals, total] = await Promise.all([
    prisma.festival.findMany({
      where,
      include: {
        location: {
          select: { id: true, name: true }
        },
        _count: {
          select: { editions: true, awards: true }
        }
      },
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.festival.count({ where })
  ])

  const data = festivals.map(f => ({
    id: f.id,
    slug: f.slug,
    name: f.name,
    shortName: f.shortName,
    locationName: f.location.name,
    foundedYear: f.foundedYear,
    isActive: f.isActive,
    editionsCount: f._count.editions
  }))

  return NextResponse.json({
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  })
}, 'obtener festivales')

export const POST = apiHandler(async (request: NextRequest) => {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const body = await request.json()

  // Validar datos
  const validation = festivalFormSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: validation.error.flatten() },
      { status: 400 }
    )
  }

  const data = validation.data

  // Generar slug si no se proporciona
  const slug = data.slug || generateSlug(data.name)

  // Verificar que el slug no exista
  const existing = await prisma.festival.findUnique({
    where: { slug }
  })

  if (existing) {
    return NextResponse.json(
      { error: 'Ya existe un festival con ese slug' },
      { status: 400 }
    )
  }

  const festival = await prisma.festival.create({
    data: {
      slug,
      name: data.name,
      shortName: data.shortName || null,
      description: data.description || null,
      logoUrl: data.logoUrl || null,
      website: data.website || null,
      locationId: data.locationId,
      foundedYear: data.foundedYear || null,
      isActive: data.isActive ?? true,
    },
    include: {
      location: {
        select: { id: true, name: true }
      }
    }
  })

  return NextResponse.json(festival, { status: 201 })
}, 'crear festival')
