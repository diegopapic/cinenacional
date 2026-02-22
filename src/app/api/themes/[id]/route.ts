// src/app/api/themes/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSlug } from '@/lib/utils'
import { requireAuth } from '@/lib/auth'

// GET /api/themes/[id] - Obtener theme específico
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

    const theme = await prisma.theme.findUnique({
      where: { id },
      include: {
        movies: {
          include: {
            movie: {
              select: {
                id: true,
                title: true,
                slug: true,
                year: true,
                posterUrl: true
              }
            }
          }
        },
        _count: {
          select: { movies: true }
        }
      }
    })

    if (!theme) {
      return NextResponse.json(
        { error: 'Theme no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ...theme,
      movieCount: theme._count.movies
    })
  } catch (error) {
    console.error('Error fetching theme:', error)
    return NextResponse.json(
      { error: 'Error al obtener el theme' },
      { status: 500 }
    )
  }
}

// PUT /api/themes/[id] - Actualizar theme
export async function PUT(
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

    const body = await request.json()

    // Verificar que existe
    const existingTheme = await prisma.theme.findUnique({
      where: { id }
    })
    
    if (!existingTheme) {
      return NextResponse.json(
        { error: 'Theme no encontrado' },
        { status: 404 }
      )
    }

    // Si se cambia el nombre, generar nuevo slug
    let updateData: any = {
      description: body.description
    }

    if (body.name && body.name !== existingTheme.name) {
      let slug = createSlug(body.name)
      let slugExists = await prisma.theme.findUnique({ 
        where: { 
          slug,
          NOT: { id }
        } 
      })
      let counter = 1
      
      while (slugExists) {
        slug = `${createSlug(body.name)}-${counter}`
        slugExists = await prisma.theme.findUnique({ 
          where: { 
            slug,
            NOT: { id }
          } 
        })
        counter++
      }

      updateData.name = body.name
      updateData.slug = slug
    }

    const theme = await prisma.theme.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json(theme)
  } catch (error) {
    console.error('Error updating theme:', error)
    return NextResponse.json(
      { error: 'Error al actualizar el theme' },
      { status: 500 }
    )
  }
}

// DELETE /api/themes/[id] - Eliminar theme
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

    // Verificar que no esté en uso
    const themeWithMovies = await prisma.theme.findUnique({
      where: { id },
      include: {
        _count: {
          select: { movies: true }
        }
      }
    })
    
    if (!themeWithMovies) {
      return NextResponse.json(
        { error: 'Theme no encontrado' },
        { status: 404 }
      )
    }

    if (themeWithMovies._count.movies > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar el theme porque está asignado a ${themeWithMovies._count.movies} película(s)` },
        { status: 400 }
      )
    }

    await prisma.theme.delete({
      where: { id }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting theme:', error)
    return NextResponse.json(
      { error: 'Error al eliminar el theme' },
      { status: 500 }
    )
  }
}