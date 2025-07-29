// src/app/api/themes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSlug } from '@/lib/utils'

// GET /api/themes - Listar todos los themes/keywords
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const sortBy = searchParams.get('sortBy') || 'name'
    const sortOrder = searchParams.get('sortOrder') || 'asc'

    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } }
      ]
    } : {}

    const themes = await prisma.theme.findMany({
      where,
      orderBy: {
        [sortBy]: sortOrder
      },
      include: {
        _count: {
          select: { movies: true }
        }
      }
    })

    // Formatear respuesta con contador de películas
    const formattedThemes = themes.map(theme => ({
      ...theme,
      movieCount: theme._count.movies
    }))

    return NextResponse.json(formattedThemes)
  } catch (error) {
    console.error('Error fetching themes:', error)
    return NextResponse.json(
      { error: 'Error al obtener los themes' },
      { status: 500 }
    )
  }
}

// POST /api/themes - Crear nuevo theme/keyword
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validar datos requeridos
    if (!body.name) {
      return NextResponse.json(
        { error: 'El nombre es requerido' },
        { status: 400 }
      )
    }

    // Generar slug único
    let slug = createSlug(body.name)
    let slugExists = await prisma.theme.findUnique({ where: { slug } })
    let counter = 1
    
    while (slugExists) {
      slug = `${createSlug(body.name)}-${counter}`
      slugExists = await prisma.theme.findUnique({ where: { slug } })
      counter++
    }

    const theme = await prisma.theme.create({
      data: {
        name: body.name,
        slug,
        description: body.description
      }
    })

    return NextResponse.json(theme, { status: 201 })
  } catch (error) {
    console.error('Error creating theme:', error)
    return NextResponse.json(
      { error: 'Error al crear el theme' },
      { status: 500 }
    )
  }
}