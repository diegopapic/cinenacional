// src/app/api/genres/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSlug } from '@/lib/utils'
import { requireAuth } from '@/lib/auth'

// GET /api/genres - Listar todos los géneros con conteo de películas
export async function GET() {
  try {
    const genres = await prisma.genre.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { movies: true }
        }
      }
    })

    return NextResponse.json(genres)
  } catch (error) {
    console.error('Error fetching genres:', error)
    return NextResponse.json(
      { error: 'Error al obtener los géneros' },
      { status: 500 }
    )
  }
}

// POST /api/genres - Crear nuevo género
export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    
    // Validar datos requeridos
    if (!body.name || body.name.trim() === '') {
      return NextResponse.json(
        { error: 'El nombre del género es requerido' },
        { status: 400 }
      )
    }

    // Generar slug único
    let slug = createSlug(body.name)
    let slugExists = await prisma.genre.findUnique({ where: { slug } })
    let counter = 1
    
    while (slugExists) {
      slug = `${createSlug(body.name)}-${counter}`
      slugExists = await prisma.genre.findUnique({ where: { slug } })
      counter++
    }

    // Crear género
    const genre = await prisma.genre.create({
      data: {
        name: body.name.trim(),
        slug,
        description: body.description?.trim() || null
      },
      include: {
        _count: {
          select: { movies: true }
        }
      }
    })

    return NextResponse.json(genre, { status: 201 })
  } catch (error) {
    console.error('Error creating genre:', error)
    return NextResponse.json(
      { error: 'Error al crear el género' },
      { status: 500 }
    )
  }
}