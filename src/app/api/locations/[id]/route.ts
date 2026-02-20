// src/app/api/locations/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateUniqueSlug } from '@/lib/utils/slugs'
import { requireAuth } from '@/lib/auth'

// GET /api/locations/[id] - Obtener un lugar por ID con path completo
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const location = await prisma.location.findUnique({
      where: { id },
      include: {
        parent: {
          include: {
            parent: true
          }
        },
        children: {
          orderBy: { name: 'asc' }
        },
        _count: {
          select: {
            children: true,
            peopleBornHere: true,
            peopleDiedHere: true
          }
        }
      }
    })

    if (!location) {
      return NextResponse.json(
        { error: 'Lugar no encontrado' },
        { status: 404 }
      )
    }

    // Construir el path completo
    let path = location.name
    let current = location
    
    while (current.parent) {
      path = `${current.parent.name} > ${path}`
      
      if (current.parent.parentId) {
        const grandParent = await prisma.location.findUnique({
          where: { id: current.parent.parentId },
          include: { parent: true }
        })
        
        if (grandParent) {
          current = { ...current, parent: grandParent }
        } else {
          break
        }
      } else {
        break
      }
    }

    // Retornar la location con el path incluido
    return NextResponse.json({
      ...location,
      path
    })
  } catch (error) {
    console.error('Error fetching location:', error)
    return NextResponse.json(
      { error: 'Error al obtener el lugar' },
      { status: 500 }
    )
  }
}

// PUT /api/locations/[id] - Actualizar un lugar
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    const id = parseInt(params.id)
    const body = await request.json()
    const { name, parentId, latitude, longitude } = body

    // Validaciones
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'El nombre es requerido' },
        { status: 400 }
      )
    }

    // Verificar que no se está asignando como padre a sí mismo o a sus descendientes
    if (parentId === id) {
      return NextResponse.json(
        { error: 'Un lugar no puede ser su propio padre' },
        { status: 400 }
      )
    }

    if (parentId) {
      // Verificar que no se está creando un ciclo
      const isDescendant = await checkIfDescendant(id, parseInt(parentId))
      if (isDescendant) {
        return NextResponse.json(
          { error: 'No se puede asignar un descendiente como padre' },
          { status: 400 }
        )
      }
    }

    // Generar nuevo slug si cambió el nombre
    const currentLocation = await prisma.location.findUnique({
      where: { id }
    })

    if (!currentLocation) {
      return NextResponse.json(
        { error: 'Lugar no encontrado' },
        { status: 404 }
      )
    }

    let slug = currentLocation.slug
    if (currentLocation.name !== name) {
      slug = await generateUniqueSlug(name, 'location', prisma, id)
    }

    const location = await prisma.location.update({
      where: { id },
      data: {
        name,
        slug,
        parent: parentId ? { connect: { id: parseInt(parentId) } } : { disconnect: true },
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null
      },
      include: {
        parent: true
      }
    })

    return NextResponse.json(location)
  } catch (error) {
    console.error('Error updating location:', error)
    return NextResponse.json(
      { error: 'Error al actualizar el lugar' },
      { status: 500 }
    )
  }
}

// DELETE /api/locations/[id] - Eliminar un lugar
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    const id = parseInt(params.id)

    // Verificar si tiene hijos
    const location = await prisma.location.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            children: true,
            peopleBornHere: true,
            peopleDiedHere: true
          }
        }
      }
    })

    if (!location) {
      return NextResponse.json(
        { error: 'Lugar no encontrado' },
        { status: 404 }
      )
    }

    // Verificar si tiene relaciones
    const hasRelations = 
      location._count.children > 0 ||
      location._count.peopleBornHere > 0 ||
      location._count.peopleDiedHere > 0

    if (hasRelations) {
      const relations = []
      if (location._count.children > 0) relations.push(`${location._count.children} lugares hijos`)
      if (location._count.peopleBornHere > 0) relations.push(`${location._count.peopleBornHere} personas nacidas aquí`)
      if (location._count.peopleDiedHere > 0) relations.push(`${location._count.peopleDiedHere} personas fallecidas aquí`)

      return NextResponse.json(
        { error: `No se puede eliminar el lugar porque tiene: ${relations.join(', ')}` },
        { status: 400 }
      )
    }

    await prisma.location.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting location:', error)
    return NextResponse.json(
      { error: 'Error al eliminar el lugar' },
      { status: 500 }
    )
  }
}

// Función auxiliar para verificar si un lugar es descendiente de otro
async function checkIfDescendant(ancestorId: number, descendantId: number): Promise<boolean> {
  const descendant = await prisma.location.findUnique({
    where: { id: descendantId },
    select: { parentId: true }
  })

  if (!descendant || !descendant.parentId) {
    return false
  }

  if (descendant.parentId === ancestorId) {
    return true
  }

  return checkIfDescendant(ancestorId, descendant.parentId)
}