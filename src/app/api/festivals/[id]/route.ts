// src/app/api/festivals/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { festivalFormSchema } from '@/lib/festivals/festivalTypes'
import { requireAuth } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const festivalId = parseInt(id)

    if (isNaN(festivalId)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    const festival = await prisma.festival.findUnique({
      where: { id: festivalId },
      include: {
        location: {
          select: { id: true, name: true }
        },
        editions: {
          orderBy: { year: 'desc' },
          select: {
            id: true,
            editionNumber: true,
            year: true,
            startDate: true,
            endDate: true,
            isPublished: true,
            _count: {
              select: { sections: true, screenings: true }
            }
          }
        },
        sectionTemplates: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' }
        },
        awards: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' }
        }
      }
    })

    if (!festival) {
      return NextResponse.json(
        { error: 'Festival no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(festival)
  } catch (error) {
    console.error('Error fetching festival:', error)
    return NextResponse.json(
      { error: 'Error al obtener festival' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    const { id } = await params
    const festivalId = parseInt(id)

    if (isNaN(festivalId)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Validar datos parcialmente
    const validation = festivalFormSchema.partial().safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const data = validation.data

    // Verificar que el festival existe
    const existing = await prisma.festival.findUnique({
      where: { id: festivalId }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Festival no encontrado' },
        { status: 404 }
      )
    }

    // Si se cambia el slug, verificar que no exista
    if (data.slug && data.slug !== existing.slug) {
      const slugExists = await prisma.festival.findUnique({
        where: { slug: data.slug }
      })

      if (slugExists) {
        return NextResponse.json(
          { error: 'Ya existe un festival con ese slug' },
          { status: 400 }
        )
      }
    }

    const festival = await prisma.festival.update({
      where: { id: festivalId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.slug && { slug: data.slug }),
        ...(data.shortName !== undefined && { shortName: data.shortName || null }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl || null }),
        ...(data.website !== undefined && { website: data.website || null }),
        ...(data.locationId && { locationId: data.locationId }),
        ...(data.foundedYear !== undefined && { foundedYear: data.foundedYear || null }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: {
        location: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json(festival)
  } catch (error) {
    console.error('Error updating festival:', error)
    return NextResponse.json(
      { error: 'Error al actualizar festival' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    const { id } = await params
    const festivalId = parseInt(id)

    if (isNaN(festivalId)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    // Verificar que el festival existe
    const existing = await prisma.festival.findUnique({
      where: { id: festivalId },
      include: {
        _count: {
          select: { editions: true }
        }
      }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Festival no encontrado' },
        { status: 404 }
      )
    }

    // Advertir si tiene ediciones
    if (existing._count.editions > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar: el festival tiene ${existing._count.editions} edición(es)` },
        { status: 400 }
      )
    }

    await prisma.festival.delete({
      where: { id: festivalId }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting festival:', error)
    return NextResponse.json(
      { error: 'Error al eliminar festival' },
      { status: 500 }
    )
  }
}
