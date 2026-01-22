// src/app/api/festival-screenings/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { festivalScreeningFormSchema } from '@/lib/festivals/festivalTypes'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const screeningId = parseInt(id)

    if (isNaN(screeningId)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    const screening = await prisma.festivalScreening.findUnique({
      where: { id: screeningId },
      include: {
        movie: {
          select: {
            id: true,
            title: true,
            slug: true,
            year: true,
            posterUrl: true,
            duration: true
          }
        },
        section: {
          select: {
            id: true,
            name: true,
            isCompetitive: true
          }
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
        venue: {
          select: { id: true, name: true, address: true }
        }
      }
    })

    if (!screening) {
      return NextResponse.json(
        { error: 'Proyección no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(screening)
  } catch (error) {
    console.error('Error fetching screening:', error)
    return NextResponse.json(
      { error: 'Error al obtener proyección' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const screeningId = parseInt(id)

    if (isNaN(screeningId)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    const existing = await prisma.festivalScreening.findUnique({
      where: { id: screeningId }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Proyección no encontrada' },
        { status: 404 }
      )
    }

    const body = await request.json()

    // Agregar IDs necesarios para validación
    const dataToValidate = {
      ...body,
      editionId: existing.editionId,
      sectionId: body.sectionId ?? existing.sectionId,
      movieId: body.movieId ?? existing.movieId,
      screeningDate: body.screeningDate ?? existing.screeningDate.toISOString().split('T')[0]
    }

    const validation = festivalScreeningFormSchema.partial().safeParse(dataToValidate)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const data = validation.data

    // Si se cambia la sección, verificar que pertenece a la misma edición
    if (data.sectionId && data.sectionId !== existing.sectionId) {
      const section = await prisma.festivalSection.findFirst({
        where: {
          id: data.sectionId,
          editionId: existing.editionId
        }
      })

      if (!section) {
        return NextResponse.json(
          { error: 'La sección no pertenece a esta edición' },
          { status: 400 }
        )
      }
    }

    // Si se cambia la película, verificar que existe
    if (data.movieId && data.movieId !== existing.movieId) {
      const movie = await prisma.movie.findUnique({
        where: { id: data.movieId }
      })

      if (!movie) {
        return NextResponse.json(
          { error: 'Película no encontrada' },
          { status: 404 }
        )
      }
    }

    const screening = await prisma.festivalScreening.update({
      where: { id: screeningId },
      data: {
        ...(data.sectionId && { sectionId: data.sectionId }),
        ...(data.movieId && { movieId: data.movieId }),
        ...(data.screeningDate && { screeningDate: new Date(data.screeningDate) }),
        ...(data.screeningTime !== undefined && {
          screeningTime: data.screeningTime ? new Date(`1970-01-01T${data.screeningTime}`) : null
        }),
        ...(data.venueId !== undefined && { venueId: data.venueId || null }),
        ...(data.premiereType && { premiereType: data.premiereType }),
        ...(data.isOfficial !== undefined && { isOfficial: data.isOfficial }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
      },
      include: {
        movie: {
          select: {
            id: true,
            title: true,
            slug: true,
            year: true
          }
        },
        section: {
          select: { id: true, name: true }
        },
        venue: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json(screening)
  } catch (error) {
    console.error('Error updating screening:', error)
    return NextResponse.json(
      { error: 'Error al actualizar proyección' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const screeningId = parseInt(id)

    if (isNaN(screeningId)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    const existing = await prisma.festivalScreening.findUnique({
      where: { id: screeningId }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Proyección no encontrada' },
        { status: 404 }
      )
    }

    await prisma.festivalScreening.delete({
      where: { id: screeningId }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting screening:', error)
    return NextResponse.json(
      { error: 'Error al eliminar proyección' },
      { status: 500 }
    )
  }
}
