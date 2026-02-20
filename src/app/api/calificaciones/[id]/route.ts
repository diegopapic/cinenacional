import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

// GET /api/calificaciones/[id] - Obtener una calificación por ID
/**
 * GET
 * @TODO Add documentation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    
    const rating = await prisma.rating.findUnique({
      where: { id },
      include: {
        _count: {
          select: { movies: true }
        }
      }
    })
    
    if (!rating) {
      return NextResponse.json(
        { error: 'Calificación no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(rating)
  } catch (error) {
    console.error('Error fetching rating:', error)
    return NextResponse.json(
      { error: 'Error al obtener la calificación' },
      { status: 500 }
    )
  }
}

// PUT /api/calificaciones/[id] - Actualizar calificación
/**
 * PUT
 * @TODO Add documentation
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    const id = parseInt(params.id)
    const body = await request.json()
    
    // Validar datos requeridos
    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { error: 'El nombre es requerido' },
        { status: 400 }
      )
    }

    // Verificar que la calificación existe
    const existingRating = await prisma.rating.findUnique({
      where: { id }
    })
    
    if (!existingRating) {
      return NextResponse.json(
        { error: 'Calificación no encontrada' },
        { status: 404 }
      )
    }

    const rating = await prisma.rating.update({
      where: { id },
      data: {
        name: body.name.trim(),
        abbreviation: body.abbreviation?.trim() || null,
        description: body.description?.trim() || null
      }
    })

    return NextResponse.json(rating)
  } catch (error) {
    console.error('Error updating rating:', error)
    return NextResponse.json(
      { error: 'Error al actualizar la calificación' },
      { status: 500 }
    )
  }
}

// DELETE /api/calificaciones/[id] - Eliminar calificación
/**
 * DELETE
 * @TODO Add documentation
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    const id = parseInt(params.id)
    
    // Verificar que la calificación existe
    const rating = await prisma.rating.findUnique({
      where: { id },
      include: {
        _count: {
          select: { movies: true }
        }
      }
    })
    
    if (!rating) {
      return NextResponse.json(
        { error: 'Calificación no encontrada' },
        { status: 404 }
      )
    }

    // Verificar si tiene películas asociadas
    if (rating._count.movies > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar una calificación que tiene películas asociadas' },
        { status: 400 }
      )
    }

    // Eliminar calificación
    await prisma.rating.delete({
      where: { id }
    })

    return NextResponse.json(
      { message: 'Calificación eliminada exitosamente' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting rating:', error)
    return NextResponse.json(
      { error: 'Error al eliminar la calificación' },
      { status: 500 }
    )
  }
}