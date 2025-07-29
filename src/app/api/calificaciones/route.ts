import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSlug } from '@/lib/utils'

// GET /api/calificaciones - Listar todas las calificaciones
export async function GET() {
  try {
    const calificaciones = await prisma.rating.findMany({
      include: {
        _count: {
          select: {
            movies: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(calificaciones)
  } catch (error) {
    console.error('Error fetching ratings:', error)
    return NextResponse.json(
      { error: 'Error al obtener las calificaciones' },
      { status: 500 }
    )
  }
}

// POST /api/calificaciones - Crear nueva calificación
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Generar slug único
    let slug = createSlug(body.name)
    let slugExists = await prisma.rating.findUnique({ where: { slug } })
    let counter = 1
    
    while (slugExists) {
      slug = `${createSlug(body.name)}-${counter}`
      slugExists = await prisma.rating.findUnique({ where: { slug } })
      counter++
    }

    const calificacion = await prisma.rating.create({
      data: {
        name: body.name,
        slug,
        description: body.description || null
      }
    })

    return NextResponse.json(calificacion, { status: 201 })
  } catch (error) {
    console.error('Error creating rating:', error)
    return NextResponse.json(
      { error: 'Error al crear la calificación' },
      { status: 500 }
    )
  }
}