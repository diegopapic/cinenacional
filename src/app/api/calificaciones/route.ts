import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSlug } from '@/lib/utils'
import { requireAuth } from '@/lib/auth'

// GET /api/calificaciones - Listar todas las calificaciones
export async function GET() {
  try {
    const ratings = await prisma.rating.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { movies: true }
        }
      }
    })

    return NextResponse.json(ratings)
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
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    
    // Validar datos requeridos
    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { error: 'El nombre es requerido' },
        { status: 400 }
      )
    }

    // Generar slug único
    let slug = createSlug(body.name)
    let slugExists = await prisma.rating.findUnique({ where: { slug } })
    let counter = 1
    
    while (slugExists) {
      slug = `${createSlug(body.name)}-${counter}`
      slugExists = await prisma.rating.findUnique({ where: { slug } })
      counter++
    }

    const rating = await prisma.rating.create({
      data: {
        name: body.name.trim(),
        abbreviation: body.abbreviation?.trim() || null,
        description: body.description?.trim() || null,
        slug
      }
    })

    return NextResponse.json(rating, { status: 201 })
  } catch (error) {
    console.error('Error creating rating:', error)
    return NextResponse.json(
      { error: 'Error al crear la calificación' },
      { status: 500 }
    )
  }
}