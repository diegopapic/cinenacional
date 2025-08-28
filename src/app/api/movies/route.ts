// src/app/api/movies/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { movieSchema } from '@/lib/schemas'
import { createSlug } from '@/lib/utils'

// GET /api/movies - Obtener lista de películas con filtros
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const genre = searchParams.get('genre') || ''
    const year = searchParams.get('year') || ''
    const stage = searchParams.get('stage') || ''
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Si hay búsqueda, usar query SQL con unaccent
    // Si hay búsqueda, usar query SQL con unaccent
if (search) {
  try {
    const searchQuery = search.toLowerCase().trim()
    const searchPattern = `%${searchQuery}%`
    const skip = (page - 1) * limit
    
    // Especificar el tipo de retorno
    const movies = await prisma.$queryRaw<any[]>`
      SELECT 
        id,
        slug,
        title,
        year,
        release_year as "releaseYear",
        release_month as "releaseMonth",
        release_day as "releaseDay",
        duration,
        poster_url as "posterUrl",
        stage
      FROM movies
      WHERE 
        unaccent(LOWER(title)) LIKE unaccent(${searchPattern})
      ORDER BY title ASC
      LIMIT ${limit}
      OFFSET ${skip}
    `

    // Especificar el tipo para el count
    const totalResult = await prisma.$queryRaw<{count: number}[]>`
      SELECT COUNT(*)::int as count
      FROM movies
      WHERE 
        unaccent(LOWER(title)) LIKE unaccent(${searchPattern})
    `
    
    const total = totalResult[0]?.count || 0

    // Obtener IDs para buscar géneros y países
    const movieIds = movies.map(m => m.id)
    
    if (movieIds.length > 0) {
      const [genres, countries] = await Promise.all([
        prisma.movieGenre.findMany({
          where: { movieId: { in: movieIds } },
          include: { genre: true }
        }),
        prisma.movieCountry.findMany({
          where: { movieId: { in: movieIds }, isPrimary: true },
          include: { country: true }
        })
      ])

      // Formatear respuesta
      const formattedMovies = movies.map((movie: any) => {
        const movieGenres = genres.filter(g => g.movieId === movie.id)
        const movieCountry = countries.find(c => c.movieId === movie.id)
        
        return {
          id: movie.id,
          slug: movie.slug,
          title: movie.title,
          year: movie.year,
          releaseYear: movie.releaseYear,
          releaseMonth: movie.releaseMonth,
          releaseDay: movie.releaseDay,
          duration: movie.duration,
          posterUrl: movie.posterUrl,
          stage: movie.stage,
          genres: movieGenres.map(g => ({
            id: g.genre.id,
            name: g.genre.name
          })),
          country: movieCountry?.country?.name || 'Argentina'
        }
      })

      return NextResponse.json({
        movies: formattedMovies,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          totalItems: total
        }
      })
    }
    
    // Si no hay resultados
    return NextResponse.json({
      movies: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
        currentPage: page,
        totalItems: 0
      }
    })

      } catch (err) {
        console.error('Error with unaccent search:', err)
        // Continuar con fallback
      }
    }

    // Búsqueda estándar sin unaccent (fallback o cuando no hay término de búsqueda)
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

    if (stage) {
      where.stage = stage
    }

    const skip = (page - 1) * limit

    const [movies, total] = await Promise.all([
      prisma.movie.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder
        },
        include: {
          genres: {
            include: {
              genre: true
            }
          },
          movieCountries: {
            where: {
              isPrimary: true
            },
            include: {
              country: true
            }
          }
        }
      }),
      prisma.movie.count({ where })
    ])

    const formattedMovies = movies.map(movie => ({
      id: movie.id,
      slug: movie.slug,
      title: movie.title,
      year: movie.year,
      releaseYear: movie.releaseYear,
      releaseMonth: movie.releaseMonth,
      releaseDay: movie.releaseDay,
      releaseDateFormatted: movie.releaseYear
        ? `${movie.releaseYear}${movie.releaseMonth ? `-${String(movie.releaseMonth).padStart(2, '0')}` : ''}${movie.releaseDay ? `-${String(movie.releaseDay).padStart(2, '0')}` : ''}`
        : null,
      duration: movie.duration,
      posterUrl: movie.posterUrl,
      stage: movie.stage,
      genres: movie.genres.map(g => ({
        id: g.genre.id,
        name: g.genre.name
      })),
      country: movie.movieCountries[0]?.country?.name || 'Argentina'
    }))

    return NextResponse.json({
      movies: formattedMovies,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        totalItems: total
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


// POST /api/movies - Crear nueva película (sin cambios)
export async function POST(request: NextRequest) {
  // ... resto del código sin cambios ...
  try {
    const body = await request.json()

    // Limpiar datos antes de validar
    const cleanedData = {
      ...body,
      ratingId: body.ratingId === 0 ? null : body.ratingId,
      // Asegurar que metaKeywords sea un array
      metaKeywords: body.metaKeywords
        ? Array.isArray(body.metaKeywords)
          ? body.metaKeywords
          : typeof body.metaKeywords === 'string'
            ? body.metaKeywords.split(',').map((k: string) => k.trim()).filter(Boolean)
            : []
        : []
    };

    // Validar datos
    const validatedData = movieSchema.parse(cleanedData)

    // Generar slug único
    let slug = createSlug(validatedData.title)
    let slugCounter = 0
    let uniqueSlug = slug

    while (await prisma.movie.findUnique({ where: { slug: uniqueSlug } })) {
      slugCounter++
      uniqueSlug = `${slug}-${slugCounter}`
    }
    slug = uniqueSlug

    // Extraer relaciones y campos especiales
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
      screeningVenues,
      colorTypeId,
      ratingId,
      metaKeywords,
      releaseYear,
      releaseMonth,
      releaseDay,
      filmingStartYear,
      filmingStartMonth,
      filmingStartDay,
      filmingEndYear,
      filmingEndMonth,
      filmingEndDay,
      ...movieDataClean
    } = validatedData

    // Asegurar que metaKeywords sea un array
    const processedMetaKeywords = metaKeywords
      ? Array.isArray(metaKeywords)
        ? metaKeywords
        : typeof metaKeywords === 'string'
          ? metaKeywords.split(',').map((k: string) => k.trim()).filter(Boolean)
          : []
      : []

    // Crear película con relaciones
    const movie = await prisma.movie.create({
      data: {
        ...movieDataClean,
        slug,
        metaKeywords: processedMetaKeywords,
        releaseYear: releaseYear ?? null,
        releaseMonth: releaseMonth ?? null,
        releaseDay: releaseDay ?? null,
        filmingStartYear: filmingStartYear ?? null,
        filmingStartMonth: filmingStartMonth ?? null,
        filmingStartDay: filmingStartDay ?? null,
        filmingEndYear: filmingEndYear ?? null,
        filmingEndMonth: filmingEndMonth ?? null,
        filmingEndDay: filmingEndDay ?? null,

        // Relaciones opcionales con connect
        ...(colorTypeId && {
          colorType: { connect: { id: colorTypeId } }
        }),
        ...(ratingId && {
          rating: { connect: { id: ratingId } }
        }),

        // Relaciones many-to-many
        ...(genres && genres.length > 0 && {
          genres: {
            create: genres.map((genreId: number, index: number) => ({
              genreId,
              isPrimary: index === 0
            }))
          }
        }),

        ...(cast && cast.length > 0 && {
          cast: {
            create: cast.map((item: any) => ({
              personId: item.personId,
              characterName: item.characterName || null,
              billingOrder: item.billingOrder || 0,
              isPrincipal: item.isPrincipal || false
            }))
          }
        }),

        ...(crew && crew.length > 0 && {
          crew: {
            create: crew.map((item: any) => ({
              personId: item.personId,
              roleId: item.roleId,
              billingOrder: item.billingOrder || 0
            }))
          }
        }),

        ...(countries && countries.length > 0 && {
          movieCountries: {
            create: countries.map((countryId: number, index: number) => ({
              countryId,
              isPrimary: index === 0
            }))
          }
        }),

        ...(productionCompanies && productionCompanies.length > 0 && {
          productionCompanies: {
            create: productionCompanies.map((companyId: number, index: number) => ({
              companyId,
              isPrimary: index === 0
            }))
          }
        }),

        ...(distributionCompanies && distributionCompanies.length > 0 && {
          distributionCompanies: {
            create: distributionCompanies.map((companyId: number) => ({
              companyId,
              territory: 'Argentina'
            }))
          }
        }),

        ...(themes && themes.length > 0 && {
          themes: {
            create: themes.map((themeId: number) => ({
              themeId
            }))
          }
        }),

        ...(alternativeTitles && alternativeTitles.length > 0 && {
          alternativeTitles: {
            create: alternativeTitles.map((title: any) => ({
              title: title.title,
              description: title.description || null
            }))
          }
        }),

        ...(links && links.length > 0 && {
          links: {
            create: links.map((link: any) => ({
              type: link.type,
              url: link.url,
              title: link.title || null,
              isActive: link.isActive !== false
            }))
          }
        }),

        ...(screeningVenues && screeningVenues.length > 0 && {
          screenings: {
            create: screeningVenues.map((sv: any) => ({
              venueId: sv.venueId,
              screeningDate: sv.screeningDate ? new Date(sv.screeningDate) : null,
              isPremiere: sv.isPremiere || false,
              isExclusive: sv.isExclusive || false
            }))
          }
        })
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
        }
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