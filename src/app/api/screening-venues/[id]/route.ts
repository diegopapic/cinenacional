// src/app/api/screening-venues/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Schema de validación
const screeningVenueSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  type: z.enum(['CINEMA', 'STREAMING', 'TV_CHANNEL', 'OTHER']),
  description: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  country: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  isActive: z.boolean().optional()
})

// GET /api/screening-venues/[id] - Obtener pantalla por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    
    const venue = await prisma.screeningVenue.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            screenings: true  // Conteo real de películas asociadas
          }
        }
      }
    })

    if (!venue) {
      return NextResponse.json(
        { error: 'Pantalla de estreno no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(venue)
  } catch (error) {
    console.error('Error fetching screening venue:', error)
    return NextResponse.json(
      { error: 'Error al obtener la pantalla de estreno' },
      { status: 500 }
    )
  }
}

// PUT /api/screening-venues/[id] - Actualizar pantalla
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    const body = await request.json()
    
    // Validar datos
    const validatedData = screeningVenueSchema.parse(body)
    
    // Verificar que existe
    const existingVenue = await prisma.screeningVenue.findUnique({
      where: { id }
    })
    
    if (!existingVenue) {
      return NextResponse.json(
        { error: 'Pantalla de estreno no encontrada' },
        { status: 404 }
      )
    }

    const venue = await prisma.screeningVenue.update({
      where: { id },
      data: validatedData,
      include: {
        _count: {
          select: {
            screenings: true
          }
        }
      }
    })

    return NextResponse.json(venue)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error updating screening venue:', error)
    return NextResponse.json(
      { error: 'Error al actualizar la pantalla de estreno' },
      { status: 500 }
    )
  }
}

// DELETE /api/screening-venues/[id] - Eliminar pantalla
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    
    // Verificar que existe y obtener conteo de películas asociadas
    const venue = await prisma.screeningVenue.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            screenings: true
          }
        }
      }
    })
    
    if (!venue) {
      return NextResponse.json(
        { error: 'Pantalla de estreno no encontrada' },
        { status: 404 }
      )
    }

    // ✅ VERIFICAR SI HAY PELÍCULAS ASOCIADAS
    if (venue._count.screenings > 0) {
      return NextResponse.json(
        { 
          error: `No se puede eliminar la pantalla de estreno "${venue.name}" porque tiene ${venue._count.screenings} película${venue._count.screenings > 1 ? 's' : ''} asociada${venue._count.screenings > 1 ? 's' : ''}`,
          moviesCount: venue._count.screenings
        },
        { status: 409 }  // 409 Conflict
      )
    }

    // Si no hay películas asociadas, proceder con la eliminación
    await prisma.screeningVenue.delete({
      where: { id }
    })

    return NextResponse.json(
      { message: 'Pantalla de estreno eliminada exitosamente' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting screening venue:', error)
    return NextResponse.json(
      { error: 'Error al eliminar la pantalla de estreno' },
      { status: 500 }
    )
  }
}