// src/app/api/countries/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/countries/[id] - Obtener país por ID
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
    
    const country = await prisma.country.findUnique({
      where: { id },
      include: {
        _count: {
          select: { movies: true }
        }
      }
    })
    
    if (!country) {
      return NextResponse.json(
        { error: 'País no encontrado' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(country)
  } catch (error) {
    console.error('Error fetching country:', error)
    return NextResponse.json(
      { error: 'Error al obtener el país' },
      { status: 500 }
    )
  }
}

// PUT /api/countries/[id] - Actualizar país
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    if (!body.code || body.code.trim() === '') {
      return NextResponse.json(
        { error: 'El código del país es requerido' },
        { status: 400 }
      )
    }
    
    if (!body.name || body.name.trim() === '') {
      return NextResponse.json(
        { error: 'El nombre del país es requerido' },
        { status: 400 }
      )
    }
    
    // Validar formato del código
    const code = body.code.trim().toUpperCase()
    if (!/^[A-Z]{2}$/.test(code)) {
      return NextResponse.json(
        { error: 'El código debe ser de 2 letras mayúsculas (ISO 3166-1 alpha-2)' },
        { status: 400 }
      )
    }
    
    // Verificar que el país existe
    const existingCountry = await prisma.country.findUnique({
      where: { id }
    })
    
    if (!existingCountry) {
      return NextResponse.json(
        { error: 'País no encontrado' },
        { status: 404 }
      )
    }
    
    // Verificar si el nuevo código ya existe en otro país
    if (code !== existingCountry.code) {
      const codeExists = await prisma.country.findFirst({
        where: {
          code,
          NOT: { id }
        }
      })
      
      if (codeExists) {
        return NextResponse.json(
          { error: 'Ya existe otro país con ese código' },
          { status: 400 }
        )
      }
    }
    
    // Actualizar país
    const country = await prisma.country.update({
      where: { id },
      data: {
        code,
        name: body.name.trim()
      },
      include: {
        _count: {
          select: { movies: true }
        }
      }
    })
    
    return NextResponse.json(country)
  } catch (error) {
    console.error('Error updating country:', error)
    return NextResponse.json(
      { error: 'Error al actualizar el país' },
      { status: 500 }
    )
  }
}

// DELETE /api/countries/[id] - Eliminar país
export async function DELETE(
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
    
    // Verificar que el país existe
    const country = await prisma.country.findUnique({
      where: { id },
      include: {
        _count: {
          select: { movies: true }
        }
      }
    })
    
    if (!country) {
      return NextResponse.json(
        { error: 'País no encontrado' },
        { status: 404 }
      )
    }
    
    // Verificar si tiene películas asociadas
    if (country._count.movies > 0) {
      return NextResponse.json(
        { 
          error: `No se puede eliminar el país porque tiene ${country._count.movies} película(s) asociada(s)` 
        },
        { status: 400 }
      )
    }
    
    // Eliminar país
    await prisma.country.delete({
      where: { id }
    })
    
    return NextResponse.json(
      { message: 'País eliminado exitosamente' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting country:', error)
    return NextResponse.json(
      { error: 'Error al eliminar el país' },
      { status: 500 }
    )
  }
}