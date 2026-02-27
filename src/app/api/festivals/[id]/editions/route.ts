// src/app/api/festivals/[id]/editions/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { festivalEditionFormSchema } from '@/lib/festivals/festivalTypes'
import { requireAuth } from '@/lib/auth'
import { apiHandler } from '@/lib/api/api-handler'

interface RouteParams {
  params: Promise<{ id: string }>
}

export const GET = apiHandler(async (request: NextRequest, { params }: RouteParams) => {
  const { id } = await params
  const festivalId = parseInt(id)

  if (isNaN(festivalId)) {
    return NextResponse.json(
      { error: 'ID inválido' },
      { status: 400 }
    )
  }

  const searchParams = request.nextUrl.searchParams
  const year = searchParams.get('year')
  const isPublished = searchParams.get('isPublished')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  const where: any = { festivalId }

  if (year) {
    where.year = parseInt(year)
  }

  if (isPublished !== null && isPublished !== undefined) {
    where.isPublished = isPublished === 'true'
  }

  const [editions, total] = await Promise.all([
    prisma.festivalEdition.findMany({
      where,
      include: {
        _count: {
          select: { sections: true, screenings: true, awardWinners: true }
        }
      },
      orderBy: { year: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.festivalEdition.count({ where })
  ])

  const data = editions.map(e => ({
    id: e.id,
    editionNumber: e.editionNumber,
    year: e.year,
    startDate: e.startDate,
    endDate: e.endDate,
    isPublished: e.isPublished,
    sectionsCount: e._count.sections,
    screeningsCount: e._count.screenings
  }))

  return NextResponse.json({
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  })
}, 'obtener ediciones')

export const POST = apiHandler(async (request: NextRequest, { params }: RouteParams) => {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { id } = await params
  const festivalId = parseInt(id)

  if (isNaN(festivalId)) {
    return NextResponse.json(
      { error: 'ID inválido' },
      { status: 400 }
    )
  }

  // Verificar que el festival existe
  const festival = await prisma.festival.findUnique({
    where: { id: festivalId }
  })

  if (!festival) {
    return NextResponse.json(
      { error: 'Festival no encontrado' },
      { status: 404 }
    )
  }

  const body = await request.json()

  // Agregar festivalId al body para validación
  const dataToValidate = { ...body, festivalId }

  const validation = festivalEditionFormSchema.safeParse(dataToValidate)
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: validation.error.flatten() },
      { status: 400 }
    )
  }

  const data = validation.data

  // Verificar que no exista otra edición con el mismo número o año
  const existingEdition = await prisma.festivalEdition.findFirst({
    where: {
      festivalId,
      OR: [
        { editionNumber: data.editionNumber },
        { year: data.year }
      ]
    }
  })

  if (existingEdition) {
    return NextResponse.json(
      { error: 'Ya existe una edición con ese número o año' },
      { status: 400 }
    )
  }

  const edition = await prisma.festivalEdition.create({
    data: {
      festivalId,
      editionNumber: data.editionNumber,
      year: data.year,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      theme: data.theme || null,
      description: data.description || null,
      posterUrl: data.posterUrl || null,
      websiteUrl: data.websiteUrl || null,
      isPublished: data.isPublished ?? false,
    },
    include: {
      festival: {
        select: { id: true, name: true, slug: true }
      }
    }
  })

  return NextResponse.json(edition, { status: 201 })
}, 'crear edición')
