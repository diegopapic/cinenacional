// src/app/api/festival-editions/[id]/sections/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { festivalSectionFormSchema } from '@/lib/festivals/festivalTypes'
import { requireAuth } from '@/lib/auth'
import { apiHandler } from '@/lib/api/api-handler'

interface RouteParams {
  params: Promise<{ id: string }>
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export const GET = apiHandler(async (request: NextRequest, { params }: RouteParams) => {
  const { id } = await params
  const editionId = parseInt(id)

  if (isNaN(editionId)) {
    return NextResponse.json(
      { error: 'ID inválido' },
      { status: 400 }
    )
  }

  const sections = await prisma.festivalSection.findMany({
    where: { editionId },
    include: {
      template: {
        select: { id: true, name: true }
      },
      _count: {
        select: { screenings: true, juryMembers: true }
      }
    },
    orderBy: { displayOrder: 'asc' }
  })

  return NextResponse.json(sections)
}, 'obtener secciones')

export const POST = apiHandler(async (request: NextRequest, { params }: RouteParams) => {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { id } = await params
  const editionId = parseInt(id)

  if (isNaN(editionId)) {
    return NextResponse.json(
      { error: 'ID inválido' },
      { status: 400 }
    )
  }

  // Verificar que la edición existe
  const edition = await prisma.festivalEdition.findUnique({
    where: { id: editionId }
  })

  if (!edition) {
    return NextResponse.json(
      { error: 'Edición no encontrada' },
      { status: 404 }
    )
  }

  const body = await request.json()

  // Endpoint especial para crear desde templates
  if (body.templateIds && Array.isArray(body.templateIds)) {
    return createSectionsFromTemplates(editionId, body.templateIds)
  }

  // Agregar editionId al body
  const dataToValidate = { ...body, editionId }

  const validation = festivalSectionFormSchema.safeParse(dataToValidate)
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: validation.error.flatten() },
      { status: 400 }
    )
  }

  const data = validation.data
  const slug = data.slug || generateSlug(data.name)

  // Verificar que no exista otra sección con el mismo slug en esta edición
  const existingSection = await prisma.festivalSection.findFirst({
    where: {
      editionId,
      slug
    }
  })

  if (existingSection) {
    return NextResponse.json(
      { error: 'Ya existe una sección con ese slug en esta edición' },
      { status: 400 }
    )
  }

  // Obtener el máximo displayOrder actual
  const maxOrder = await prisma.festivalSection.aggregate({
    where: { editionId },
    _max: { displayOrder: true }
  })

  const section = await prisma.festivalSection.create({
    data: {
      editionId,
      templateId: data.templateId || null,
      slug,
      name: data.name,
      description: data.description || null,
      isCompetitive: data.isCompetitive ?? false,
      displayOrder: data.displayOrder ?? (maxOrder._max.displayOrder ?? 0) + 1,
    },
    include: {
      template: {
        select: { id: true, name: true }
      }
    }
  })

  return NextResponse.json(section, { status: 201 })
}, 'crear sección')

async function createSectionsFromTemplates(editionId: number, templateIds: number[]) {
  try {
    // Obtener los templates
    const templates = await prisma.festivalSectionTemplate.findMany({
      where: {
        id: { in: templateIds },
        isActive: true
      },
      orderBy: { displayOrder: 'asc' }
    })

    if (templates.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron templates válidos' },
        { status: 400 }
      )
    }

    // Obtener secciones existentes para evitar duplicados
    const existingSections = await prisma.festivalSection.findMany({
      where: { editionId },
      select: { slug: true }
    })
    const existingSlugs = new Set(existingSections.map(s => s.slug))

    // Filtrar templates que ya tienen sección
    const templatesToCreate = templates.filter(t => !existingSlugs.has(t.slug))

    if (templatesToCreate.length === 0) {
      return NextResponse.json(
        { error: 'Todas las secciones ya existen en esta edición' },
        { status: 400 }
      )
    }

    // Crear secciones
    const sections = await prisma.$transaction(
      templatesToCreate.map((template, index) =>
        prisma.festivalSection.create({
          data: {
            editionId,
            templateId: template.id,
            slug: template.slug,
            name: template.name,
            description: template.description,
            isCompetitive: template.isCompetitive,
            displayOrder: template.displayOrder,
          },
          include: {
            template: {
              select: { id: true, name: true }
            }
          }
        })
      )
    )

    return NextResponse.json(sections, { status: 201 })
  } catch (error) {
    console.error('Error creating sections from templates:', error)
    return NextResponse.json(
      { error: 'Error al crear secciones desde templates' },
      { status: 500 }
    )
  }
}
