// src/app/api/festival-sections/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { festivalSectionFormSchema } from '@/lib/festivals/festivalTypes'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const sectionId = parseInt(id)

    if (isNaN(sectionId)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    const section = await prisma.festivalSection.findUnique({
      where: { id: sectionId },
      include: {
        template: {
          select: { id: true, name: true }
        },
        edition: {
          select: {
            id: true,
            editionNumber: true,
            year: true,
            festival: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          }
        },
        juryMembers: {
          include: {
            person: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                photoUrl: true
              }
            }
          },
          orderBy: { billingOrder: 'asc' }
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
            }
          },
          orderBy: [
            { screeningDate: 'asc' },
            { screeningTime: 'asc' }
          ]
        }
      }
    })

    if (!section) {
      return NextResponse.json(
        { error: 'Sección no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(section)
  } catch (error) {
    console.error('Error fetching section:', error)
    return NextResponse.json(
      { error: 'Error al obtener sección' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const sectionId = parseInt(id)

    if (isNaN(sectionId)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    const existing = await prisma.festivalSection.findUnique({
      where: { id: sectionId }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Sección no encontrada' },
        { status: 404 }
      )
    }

    const body = await request.json()

    // Agregar editionId para validación
    const dataToValidate = {
      ...body,
      editionId: existing.editionId,
      slug: body.slug ?? existing.slug,
      name: body.name ?? existing.name
    }

    const validation = festivalSectionFormSchema.partial().safeParse(dataToValidate)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const data = validation.data

    // Si se cambia el slug, verificar que no exista en la edición
    if (data.slug && data.slug !== existing.slug) {
      const slugExists = await prisma.festivalSection.findFirst({
        where: {
          editionId: existing.editionId,
          slug: data.slug,
          id: { not: sectionId }
        }
      })

      if (slugExists) {
        return NextResponse.json(
          { error: 'Ya existe una sección con ese slug en esta edición' },
          { status: 400 }
        )
      }
    }

    const section = await prisma.festivalSection.update({
      where: { id: sectionId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.slug && { slug: data.slug }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.isCompetitive !== undefined && { isCompetitive: data.isCompetitive }),
        ...(data.displayOrder !== undefined && { displayOrder: data.displayOrder }),
        ...(data.templateId !== undefined && { templateId: data.templateId || null }),
      },
      include: {
        template: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json(section)
  } catch (error) {
    console.error('Error updating section:', error)
    return NextResponse.json(
      { error: 'Error al actualizar sección' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const sectionId = parseInt(id)

    if (isNaN(sectionId)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    const existing = await prisma.festivalSection.findUnique({
      where: { id: sectionId },
      include: {
        _count: {
          select: { screenings: true }
        }
      }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Sección no encontrada' },
        { status: 404 }
      )
    }

    // Advertir si tiene proyecciones
    if (existing._count.screenings > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar: la sección tiene ${existing._count.screenings} proyección(es)` },
        { status: 400 }
      )
    }

    await prisma.festivalSection.delete({
      where: { id: sectionId }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting section:', error)
    return NextResponse.json(
      { error: 'Error al eliminar sección' },
      { status: 500 }
    )
  }
}
