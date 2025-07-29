
// ==================================================
// src/app/api/movies/[id]/route.ts
// ==================================================
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { movieSchema } from '@/lib/schemas'

// GET /api/movies/[id] - Obtener película por ID o slug
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const idOrSlug = params.id

    // Determinar si es ID o slug
    const isId = /^\d+$/.test(idOrSlug)

    const movie = await prisma.movie.findUnique({
      where: isId ? { id: parseInt(idOrSlug) } : { slug: idOrSlug },
      include: {
        genres: {
          include: {
            genre: true
          }
        },
        cast: {
          include: {
            person: true
          },
          orderBy: {
            billingOrder: 'asc'
          }
        },
        crew: {
          include: {
            person: true
          },
          orderBy: [
            { department: 'asc' },
            { billingOrder: 'asc' }
          ]
        },
        countries: {
          include: {
            country: true
          }
        },
        languages: {
          include: {
            language: true
          }
        },
        productionCompanies: {
          include: {
            company: true
          }
        },
        distributionCompanies: {
          include: {
            company: true
          }
        },
        images: {
          orderBy: {
            displayOrder: 'asc'
          }
        },
        videos: {
          orderBy: {
            isPrimary: 'desc'
          }
        },
        awards: {
          include: {
            award: true,
            recipient: true
          }
        },
        themes: {
          include: {
            theme: true
          }
        },
        filmingLocations: true
      }
    })

    if (!movie) {
      return NextResponse.json(
        { error: 'Película no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(movie)
  } catch (error) {
    console.error('Error fetching movie:', error)
    return NextResponse.json(
      { error: 'Error al obtener la película' },
      { status: 500 }
    )
  }
}

// PUT /api/movies/[id] - Actualizar película
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    const body = await request.json()
    
    // Validar datos
    const validatedData = movieSchema.parse(body)
    
    // Verificar que la película existe
    const existingMovie = await prisma.movie.findUnique({
      where: { id }
    })

    if (!existingMovie) {
      return NextResponse.json(
        { error: 'Película no encontrada' },
        { status: 404 }
      )
    }

    // Extraer relaciones
    const {
      genres,
      cast,
      crew,
      countries,
      languages,
      productionCompanies,
      distributionCompanies,
      themes,
      ...movieData
    } = validatedData
    
    
    // Actualizar película y relaciones
    const movie = await prisma.movie.update({
      where: { id },
      data: {
        ...movieData,
        releaseDate: movieData.releaseDate ? new Date(movieData.releaseDate) : null,
        // Actualizar relaciones (primero eliminar, luego crear)
        genres: genres ? {
          deleteMany: {},
          create: genres.map((genreId, index) => ({
            genreId,
            isPrimary: index === 0
          }))
        } : undefined,
        cast: cast ? {
          deleteMany: {},
          create: cast
        } : undefined,
        crew: crew ? {
          deleteMany: {},
          create: crew
        } : undefined,
        countries: countries ? {
          deleteMany: {},
          create: countries.map((countryId, index) => ({
            countryId,
            isPrimary: index === 0
          }))
        } : undefined,
        languages: languages ? {
          deleteMany: {},
          create: languages.map((languageId, index) => ({
            languageId,
            isPrimary: index === 0
          }))
        } : undefined,
        productionCompanies: productionCompanies ? {
          deleteMany: {},
          create: productionCompanies.map((companyId, index) => ({
            companyId,
            isPrimary: index === 0
          }))
        } : undefined,
        distributionCompanies: distributionCompanies ? {
          deleteMany: {},
          create: distributionCompanies.map(companyId => ({
            companyId,
            territory: 'Argentina'
          }))
        } : undefined,
        themes: themes ? {
          deleteMany: {},
          create: themes.map(themeId => ({
            themeId
          }))
        } : undefined
      },
      include: {
        genres: {
          include: {
            genre: true
          }
        },
        cast: {
          include: {
            person: true
          }
        },
        crew: {
          include: {
            person: true
          }
        },
        themes: {
          include: {
            theme: true
          }
        }
      }
    })

    return NextResponse.json(movie)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating movie:', error)
    return NextResponse.json(
      { error: 'Error al actualizar la película' },
      { status: 500 }
    )
  }
}

// DELETE /api/movies/[id] - Eliminar película
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)

    // Verificar que la película existe
    const movie = await prisma.movie.findUnique({
      where: { id }
    })

    if (!movie) {
      return NextResponse.json(
        { error: 'Película no encontrada' },
        { status: 404 }
      )
    }

    // Eliminar película (las relaciones se eliminan en cascada)
    await prisma.movie.delete({
      where: { id }
    })

    return NextResponse.json(
      { message: 'Película eliminada exitosamente' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting movie:', error)
    return NextResponse.json(
      { error: 'Error al eliminar la película' },
      { status: 500 }
    )
  }
}