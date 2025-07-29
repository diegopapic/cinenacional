import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSlug } from '@/lib/utils'

// GET /api/calificaciones/[id] - Obtener calificación por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    
    const calificacion = await prisma.rating.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            movies: true
          }
        }
      }
    })

    if (!calificacion) {
      return NextResponse.json(
        { error: 'Calificación no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(calificacion)
  } catch (error) {
    console.error('Error fetching rating:', error)
    return NextResponse.json(
      { error: 'Error al obtener la calificación' },
      { status: 500 }
    )
  }
}

// PUT /api/calificaciones/[id] - Actualizar calificación
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    const body = await request.json()
    
    // Verificar que la calificación existe
    const existingCalif = await prisma.rating.findUnique({
      where: { id }
    })
    
    if (!existingCalif) {
      return NextResponse.json(
        { error: 'Calificación no encontrada' },
        { status: 404 }
      )
    }

    // Generar nuevo slug si cambió el nombre
    let slug = existingCalif.slug
    if (body.name && body.name !== existingCalif.name) {
      slug = createSlug(body.name)
      let slugExists = await prisma.rating.findFirst({
        where: { 
          slug,
          NOT: { id }
        }
      })
      let counter = 1
      
      while (slugExists) {
        slug = `${createSlug(body.name)}-${counter}`
        slugExists = await prisma.rating.findFirst({
          where: { 
            slug,
            NOT: { id }
          }
        })
        counter++
      }
    }

    const calificacion = await prisma.rating.update({
      where: { id },
      data: {
        name: body.name,
        slug,
        description: body.description || null
      }
    })

    return NextResponse.json(calificacion)
  } catch (error) {
    console.error('Error updating rating:', error)
    return NextResponse.json(
      { error: 'Error al actualizar la calificación' },
      { status: 500 }
    )
  }
}

// DELETE /api/calificaciones/[id] - Eliminar calificación
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    
    // Verificar que la calificación existe
    const calificacion = await prisma.rating.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            movies: true
          }
        }
      }
    })
    
    if (!calificacion) {
      return NextResponse.json(
        { error: 'Calificación no encontrada' },
        { status: 404 }
      )
    }

    // Verificar si tiene películas asociadas
    if (calificacion._count.movies > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar la calificación porque tiene ${calificacion._count.movies} películas asociadas` },
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