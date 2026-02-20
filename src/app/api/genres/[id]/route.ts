// src/app/api/genres/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

// GET /api/genres/[id] - Obtener género por ID
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
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }
    
    const genre = await prisma.genre.findUnique({
      where: { id },
      include: {
        _count: {
          select: { movies: true }
        }
      }
    })
    
    if (!genre) {
      return NextResponse.json(
        { error: 'Género no encontrado' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(genre)
  } catch (error) {
    console.error('Error fetching genre:', error)
    return NextResponse.json(
      { error: 'Error al obtener el género' },
      { status: 500 }
    )
  }
}

// PUT /api/genres/[id] - Actualizar género
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
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }
    
    // Validar datos requeridos
    if (!body.name || body.name.trim() === '') {
      return NextResponse.json(
        { error: 'El nombre del género es requerido' },
        { status: 400 }
      )
    }
    
    // Verificar que el género existe
    const existingGenre = await prisma.genre.findUnique({
      where: { id }
    })
    
    if (!existingGenre) {
      return NextResponse.json(
        { error: 'Género no encontrado' },
        { status: 404 }
      )
    }
    
    // Actualizar género
    const genre = await prisma.genre.update({
      where: { id },
      data: {
        name: body.name.trim(),
        description: body.description?.trim() || null
      },
      include: {
        _count: {
          select: { movies: true }
        }
      }
    })
    
    return NextResponse.json(genre)
  } catch (error) {
    console.error('Error updating genre:', error)
    return NextResponse.json(
      { error: 'Error al actualizar el género' },
      { status: 500 }
    )
  }
}

// DELETE /api/genres/[id] - Eliminar género
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
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }
    
    // Verificar que el género existe
    const genre = await prisma.genre.findUnique({
      where: { id },
      include: {
        _count: {
          select: { movies: true }
        }
      }
    })
    
    if (!genre) {
      return NextResponse.json(
        { error: 'Género no encontrado' },
        { status: 404 }
      )
    }
    
    // Verificar si tiene películas asociadas
    if (genre._count.movies > 0) {
      return NextResponse.json(
        { 
          error: `No se puede eliminar el género porque tiene ${genre._count.movies} película(s) asociada(s)` 
        },
        { status: 400 }
      )
    }
    
    // Eliminar género
    await prisma.genre.delete({
      where: { id }
    })
    
    return NextResponse.json(
      { message: 'Género eliminado exitosamente' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting genre:', error)
    return NextResponse.json(
      { error: 'Error al eliminar el género' },
      { status: 500 }
    )
  }
}