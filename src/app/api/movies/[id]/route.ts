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
        colorType: true,
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
        movieCountries: {
          include: {
            country: true
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
        links: {
          where: {
            isActive: true
          },
          orderBy: {
            type: 'asc'
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

    // Limpiar datos antes de validar
    const cleanedData = {
      ...body,
      ratingId: body.ratingId === 0 ? null : body.ratingId
    };

    console.log('=== BODY RECIBIDO EN BACKEND ===')
    console.log(JSON.stringify(body, null, 2))
    console.log('================================')

    console.log('=== RATING ID RECIBIDO ===')
    console.log('ratingId:', body.ratingId)
    console.log('tipo:', typeof body.ratingId)
    console.log('es null?:', body.ratingId === null)
    console.log('========================')

    // Validar datos
    const validatedData = movieSchema.parse(cleanedData)

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

    // Extraer relaciones - EXACTAMENTE COMO EN EL POST
    const {
      genres,
      cast,
      crew,
      countries,
      productionCompanies,
      distributionCompanies,
      themes,
      alternativeTitles,
      links,
      ...movieData
    } = validatedData

    // Usar transacción para actualizar todo
    const movie = await prisma.$transaction(async (tx) => {
      const { colorTypeId, ratingId, ...movieDataClean } = movieData


      // 1. Actualizar datos básicos de la película - EXACTAMENTE COMO EN EL POST
      const updatedMovie = await tx.movie.update({
        where: { id },
        data: {
          ...movieDataClean,
          releaseYear: movieData.releaseYear || null,
          releaseMonth: movieData.releaseMonth || null,
          releaseDay: movieData.releaseDay || null,
          filmingStartYear: movieData.filmingStartYear || null,
          filmingStartMonth: movieData.filmingStartMonth || null,
          filmingStartDay: movieData.filmingStartDay || null,
          filmingEndYear: movieData.filmingEndYear || null,
          filmingEndMonth: movieData.filmingEndMonth || null,
          filmingEndDay: movieData.filmingEndDay || null,
          ...(ratingId !== undefined && {
            rating: (ratingId === null || ratingId === 0)  // Tratar 0 como null
              ? { disconnect: true }
              : { connect: { id: ratingId } }
          }),
          ...(colorTypeId && {
            colorType: { connect: { id: colorTypeId } }
          })
        }
      })

      // 2. Actualizar géneros
      if (genres) {
        await tx.movieGenre.deleteMany({ where: { movieId: id } })
        if (genres.length > 0) {
          await tx.movieGenre.createMany({
            data: genres.map((genreId, index) => ({
              movieId: id,
              genreId,
              isPrimary: index === 0
            }))
          })
        }
      }

      // 3. Actualizar cast
      if (cast) {
        await tx.movieCast.deleteMany({ where: { movieId: id } })
        if (cast.length > 0) {
          await tx.movieCast.createMany({
            data: cast.map(item => ({
              movieId: id,
              ...item
            }))
          })
        }
      }

      // 4. Actualizar crew
      if (crew) {
        await tx.movieCrew.deleteMany({ where: { movieId: id } })
        if (crew.length > 0) {
          await tx.movieCrew.createMany({
            data: crew.map(item => ({
              movieId: id,
              ...item
            }))
          })
        }
      }

      // 5. Actualizar países
      if (countries) {
        await tx.movieCountry.deleteMany({ where: { movieId: id } })
        if (countries.length > 0) {
          await tx.movieCountry.createMany({
            data: countries.map((countryId, index) => ({
              movieId: id,
              countryId,
              isPrimary: index === 0
            }))
          })
        }
      }

      // 7. Actualizar productoras
      if (productionCompanies) {
        await tx.movieProductionCompany.deleteMany({ where: { movieId: id } })
        if (productionCompanies.length > 0) {
          await tx.movieProductionCompany.createMany({
            data: productionCompanies.map((companyId, index) => ({
              movieId: id,
              companyId,
              isPrimary: index === 0
            }))
          })
        }
      }

      // 8. Actualizar distribuidoras
      if (distributionCompanies) {
        await tx.movieDistributionCompany.deleteMany({ where: { movieId: id } })
        if (distributionCompanies.length > 0) {
          await tx.movieDistributionCompany.createMany({
            data: distributionCompanies.map(companyId => ({
              movieId: id,
              companyId,
              territory: 'Argentina'
            }))
          })
        }
      }

      // 9. Actualizar temas
      if (themes) {
        await tx.movieTheme.deleteMany({ where: { movieId: id } })
        if (themes.length > 0) {
          await tx.movieTheme.createMany({
            data: themes.map(themeId => ({
              movieId: id,
              themeId
            }))
          })
        }
      }

      // 10. Actualizar títulos alternativos
      if (alternativeTitles !== undefined) {
        await tx.movieAlternativeTitle.deleteMany({ where: { movieId: id } })
        if (alternativeTitles && alternativeTitles.length > 0) {
          await tx.movieAlternativeTitle.createMany({
            data: alternativeTitles.map(title => ({
              movieId: id,
              title: title.title,
              description: title.description || null
            }))
          })
        }
      }

      // 11. Actualizar links oficiales
      if (links !== undefined) {
        await tx.movieLink.deleteMany({ where: { movieId: id } })
        if (links && links.length > 0) {
          await tx.movieLink.createMany({
            data: links.map((link: any) => ({
              movieId: id,
              type: link.type,
              url: link.url,
              title: link.title || null,
              isActive: link.isActive !== false
            }))
          })
        }
      }

      // 12. Retornar la película actualizada con todas las relaciones
      return await tx.movie.findUnique({
        where: { id },
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
          },
          movieCountries: {
            include: {
              country: true
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
          links: true,
          colorType: true,
        }
      })
    }, {
      maxWait: 10000, // Esperar máximo 10 segundos para iniciar
      timeout: 30000, // Timeout de 30 segundos para la transacción
    })

    return NextResponse.json(movie)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.log('=== ERRORES DE VALIDACIÓN ZOD ===')
      console.log(JSON.stringify(error.errors, null, 2))
      console.log('=================================')
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