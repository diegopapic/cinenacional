// src/app/api/festival-editions/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { festivalEditionFormSchema } from '@/lib/festivals/festivalTypes'
import { requireAuth } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const editionId = parseInt(id)

    if (isNaN(editionId)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    const edition = await prisma.festivalEdition.findUnique({
      where: { id: editionId },
      include: {
        festival: {
          select: {
            id: true,
            name: true,
            slug: true,
            shortName: true,
            location: {
              select: { id: true, name: true }
            }
          }
        },
        sections: {
          orderBy: { displayOrder: 'asc' },
          include: {
            template: {
              select: { id: true, name: true }
            },
            _count: {
              select: { screenings: true, juryMembers: true }
            }
          }
        },
        screenings: {
          include: {
            movie: {
              select: {
                id: true,
                title: true,
                slug: true,
                year: true,
                posterUrl: true
              }
            },
            section: {
              select: { id: true, name: true }
            },
            venue: {
              select: { id: true, name: true }
            }
          },
          orderBy: [
            { screeningDate: 'asc' },
            { screeningTime: 'asc' }
          ]
        }
      }
    })

    if (!edition) {
      return NextResponse.json(
        { error: 'Edición no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(edition)
  } catch (error) {
    console.error('Error fetching edition:', error)
    return NextResponse.json(
      { error: 'Error al obtener edición' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    const { id } = await params
    const editionId = parseInt(id)

    if (isNaN(editionId)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Obtener la edición existente
    const existing = await prisma.festivalEdition.findUnique({
      where: { id: editionId }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Edición no encontrada' },
        { status: 404 }
      )
    }

    // Validar datos parcialmente
    const dataToValidate = { ...body, festivalId: existing.festivalId }
    const validation = festivalEditionFormSchema.partial().safeParse(dataToValidate)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const data = validation.data

    // Verificar conflictos si se cambia número de edición o año
    if (data.editionNumber !== undefined || data.year !== undefined) {
      const conflicting = await prisma.festivalEdition.findFirst({
        where: {
          festivalId: existing.festivalId,
          id: { not: editionId },
          OR: [
            ...(data.editionNumber !== undefined ? [{ editionNumber: data.editionNumber }] : []),
            ...(data.year !== undefined ? [{ year: data.year }] : [])
          ]
        }
      })

      if (conflicting) {
        return NextResponse.json(
          { error: 'Ya existe una edición con ese número o año' },
          { status: 400 }
        )
      }
    }

    const edition = await prisma.festivalEdition.update({
      where: { id: editionId },
      data: {
        ...(data.editionNumber !== undefined && { editionNumber: data.editionNumber }),
        ...(data.year !== undefined && { year: data.year }),
        ...(data.startDate && { startDate: new Date(data.startDate) }),
        ...(data.endDate && { endDate: new Date(data.endDate) }),
        ...(data.theme !== undefined && { theme: data.theme || null }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.posterUrl !== undefined && { posterUrl: data.posterUrl || null }),
        ...(data.websiteUrl !== undefined && { websiteUrl: data.websiteUrl || null }),
        ...(data.isPublished !== undefined && { isPublished: data.isPublished }),
      },
      include: {
        festival: {
          select: { id: true, name: true, slug: true }
        }
      }
    })

    return NextResponse.json(edition)
  } catch (error) {
    console.error('Error updating edition:', error)
    return NextResponse.json(
      { error: 'Error al actualizar edición' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    const { id } = await params
    const editionId = parseInt(id)

    if (isNaN(editionId)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    const existing = await prisma.festivalEdition.findUnique({
      where: { id: editionId },
      include: {
        _count: {
          select: { screenings: true }
        }
      }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Edición no encontrada' },
        { status: 404 }
      )
    }

    // Las secciones y proyecciones se eliminarán en cascada
    await prisma.festivalEdition.delete({
      where: { id: editionId }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting edition:', error)
    return NextResponse.json(
      { error: 'Error al eliminar edición' },
      { status: 500 }
    )
  }
}
