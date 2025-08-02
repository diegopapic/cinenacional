// src/app/api/movies/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSlug } from '@/lib/utils'
import { z } from 'zod'
import { movieSchema } from '@/lib/schemas'


// GET /api/movies - Listar películas con filtros
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const genre = searchParams.get('genre') || ''
    const year = searchParams.get('year') || ''
    const status = searchParams.get('status') || ''
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const skip = (page - 1) * limit

    // Construir filtros
    const where: any = {}

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { synopsis: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (genre) {
      where.genres = {
        some: {
          genre: {
            slug: genre
          }
        }
      }
    }

    if (year) {
      where.year = parseInt(year)
    }

    if (status) {
      where.status = status
    }

    // Obtener total de registros
    const total = await prisma.movie.count({ where })

    // Obtener películas
    const movies = await prisma.movie.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder
      },
      include: {
        colorType: true,
        genres: {
          include: {
            genre: true
          }
        },
        cast: {
          where: {
            isPrincipal: true
          },
          include: {
            person: true
          },
          orderBy: {
            billingOrder: 'asc'
          },
          take: 3
        },
        crew: {
          where: {
            role: 'Director'
          },
          include: {
            person: true
          }
        },
        movieCountries: {  // CAMBIADO DE countries A movieCountries
          where: {
            isPrimary: true
          },
          include: {
            country: true
          }
        },
        themes: {
          include: {
            theme: true
          }
        },
        images: {
          where: {
            type: 'POSTER',
            isPrimary: true
          },
          take: 1
        }
      }
    })

    // Formatear respuesta
    const formattedMovies = movies.map(movie => ({
      id: movie.id,
      slug: movie.slug,
      title: movie.title,
      year: movie.year,
      releaseDate: movie.releaseDate,
      filmingStartDate: movie.filmingStartDate,
      filmingEndDate: movie.filmingEndDate,
      duration: movie.duration,
      posterUrl: movie.posterUrl || movie.images[0]?.url,
      status: movie.status,
      colorType: movie.colorType,
      genres: movie.genres.map(g => g.genre),
      directors: movie.crew.map(c => c.person),
      mainCast: movie.cast.map(c => ({
        person: c.person,
        character: c.characterName
      })),
      country: movie.movieCountries[0]?.country.name || 'Argentina',  // CAMBIADO DE countries A movieCountries
      countries: movie.countries || ['Argentina'],  // Campo array directo
      isCoProduction: movie.is_coproduction || false,
      productionType: movie.production_type || 'national',
      themes: movie.themes
    }))

    return NextResponse.json({
      movies: formattedMovies,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching movies:', error)
    return NextResponse.json(
      { error: 'Error al obtener las películas' },
      { status: 500 }
    )
  }
}

// POST /api/movies - Crear nueva película
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validar datos
    const validatedData = movieSchema.parse(body)

    // Generar slug único
    let slug = createSlug(validatedData.title)
    let slugExists = await prisma.movie.findUnique({ where: { slug } })
    let counter = 1

    while (slugExists) {
      slug = `${createSlug(validatedData.title)}-${counter}`
      slugExists = await prisma.movie.findUnique({ where: { slug } })
      counter++
    }

    // Extraer relaciones del body
    const {
      genres,
      cast,
      crew,
      countries,
      languages,
      productionCompanies,
      distributionCompanies,
      alternativeTitles,
      themes,
      links,
      ...movieData
    } = validatedData

    // Transformar cast y crew para quitar la propiedad 'person'
    const processedCast = cast?.map((item: any) => ({
      personId: item.personId,
      characterName: item.characterName,
      billingOrder: item.billingOrder,
      isPrincipal: item.isPrincipal
    }))

    const processedCrew = crew?.map((item: any) => ({
      personId: item.personId,
      role: item.role,
      department: item.department,
      billingOrder: item.billingOrder
    }))

    // Crear película con relaciones
    const movie = await prisma.movie.create({
      data: {
        ...movieData,
        slug,

        releaseDate: movieData.releaseDate ? new Date(movieData.releaseDate) : null,
        colorTypeId: movieData.colorTypeId || null,
        // Crear relaciones
        genres: genres ? {
          create: genres.map((genreId, index) => ({
            genreId,
            isPrimary: index === 0
          }))
        } : undefined,
        alternativeTitles: alternativeTitles ? {
          create: alternativeTitles
        } : undefined,
        cast: cast ? {
          create: cast
        } : undefined,
        crew: crew ? {
          create: crew
        } : undefined,
        movieCountries: countries ? {  // CAMBIADO DE countries A movieCountries
          create: countries.map((countryId, index) => ({
            countryId,
            isPrimary: index === 0
          }))
        } : undefined,
        languages: languages ? {
          create: languages.map((languageId, index) => ({
            languageId,
            isPrimary: index === 0
          }))
        } : undefined,
        productionCompanies: productionCompanies ? {
          create: productionCompanies.map((companyId, index) => ({
            companyId,
            isPrimary: index === 0
          }))
        } : undefined,
        distributionCompanies: distributionCompanies ? {
          create: distributionCompanies.map(companyId => ({
            companyId,
            territory: 'Argentina'
          }))
        } : undefined,
        themes: themes ? {
          create: themes.map(themeId => ({
            themeId
          }))
        } : undefined,
        links: links ? {
          create: links.map((link: any) => ({
            type: link.type,
            url: link.url,
            title: link.title,
            isActive: link.isActive !== false
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
        movieCountries: {  // CAMBIADO DE countries A movieCountries
          include: {
            country: true
          }
        },
        themes: {
          include: {
            theme: true
          }
        },
        languages: {
          include: {
            language: true
          }
        },
        alternativeTitles: true,
        links: true
      }
    })

    return NextResponse.json(movie, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating movie:', error)
    return NextResponse.json(
      { error: 'Error al crear la película' },
      { status: 500 }
    )
  }
}