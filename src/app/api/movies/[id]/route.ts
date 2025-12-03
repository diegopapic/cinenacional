// ==================================================
// src/app/api/movies/[id]/route.ts - CON SYNOPSIS_LOCKED CORREGIDO ✅
// ==================================================
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { movieSchema } from '@/lib/schemas'
import RedisClient from '@/lib/redis'
import { revalidatePath, revalidateTag } from 'next/cache'

// Cache en memoria como fallback
const memoryCache = new Map<string, { data: any; timestamp: number }>();
const MEMORY_CACHE_TTL = 60 * 60 * 1000; // 1 hora en ms
const REDIS_CACHE_TTL = 3600; // 1 hora en segundos

// GET /api/movies/[id] - Obtener película por ID o slug
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const idOrSlug = params.id
    const isId = /^\d+$/.test(idOrSlug)

    // Generar clave de caché única
    const cacheKey = `movie:${isId ? 'id' : 'slug'}:${idOrSlug}:v1`;

    // 1. Intentar obtener de Redis
    try {
      const redisCached = await RedisClient.get(cacheKey);

      if (redisCached) {
        console.log(`✅ Cache HIT desde Redis para película: ${idOrSlug}`);
        return NextResponse.json(
          JSON.parse(redisCached),
          {
            headers: {
              'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
              'X-Cache': 'HIT',
              'X-Cache-Source': 'redis',
              'X-Movie-Id': idOrSlug
            }
          }
        );
      }
    } catch (redisError) {
      console.error('Redis error (non-fatal):', redisError);
    }

    // 2. Verificar caché en memoria como fallback
    const now = Date.now();
    const memoryCached = memoryCache.get(cacheKey);

    if (memoryCached && (now - memoryCached.timestamp) < MEMORY_CACHE_TTL) {
      console.log(`✅ Cache HIT desde memoria para película: ${idOrSlug}`);

      // Intentar guardar en Redis para próximas requests
      RedisClient.set(cacheKey, JSON.stringify(memoryCached.data), REDIS_CACHE_TTL)
        .catch(err => console.error('Error guardando en Redis:', err));

      return NextResponse.json(memoryCached.data, {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
          'X-Cache': 'HIT',
          'X-Cache-Source': 'memory',
          'X-Movie-Id': idOrSlug
        }
      });
    }

    // 3. No hay caché, consultar base de datos
    console.log(`📄 Cache MISS - Consultando BD para película: ${idOrSlug}`);

    const movie = await prisma.movie.findUnique({
      where: isId ? { id: parseInt(idOrSlug) } : { slug: idOrSlug },
      select: {
        // Campos básicos de la película
        id: true,
        slug: true,
        title: true,
        year: true,
        releaseYear: true,
        releaseMonth: true,
        releaseDay: true,
        duration: true,
        durationSeconds: true,
        synopsis: true,
        synopsisLocked: true, // ✅ Campo synopsisLocked
        tagline: true,
        notes: true,
        posterUrl: true,
        trailerUrl: true,
        imdbId: true,
        stage: true,
        dataCompleteness: true,
        tipoDuracion: true,
        metaDescription: true,
        metaKeywords: true,
        filmingStartYear: true,
        filmingStartMonth: true,
        filmingStartDay: true,
        filmingEndYear: true,
        filmingEndMonth: true,
        filmingEndDay: true,
        soundType: true,
        rating: true,
        ratingId: true,
        createdAt: true,
        updatedAt: true,

        // Relaciones - solo traer los campos necesarios
        colorType: true,

        genres: {
          select: {
            genre: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          }
        },

        cast: {
          orderBy: { billingOrder: 'asc' },
          select: {
            characterName: true,
            billingOrder: true,
            isPrincipal: true,
            notes: true,
            person: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                slug: true,
                photoUrl: true
              }
            }
          }
        },

        crew: {
          orderBy: { billingOrder: 'asc' },
          select: {
            roleId: true,
            billingOrder: true,
            person: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                slug: true
              }
            },
            role: true
          }
        },

        movieCountries: {
          select: {
            location: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            },
            countryId: true,
            isPrimary: true

          }
        },

        productionCompanies: {
          select: {
            company: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },

        distributionCompanies: {
          select: {
            company: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },

        themes: {
          select: {
            theme: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          }
        },

        images: {
          orderBy: { displayOrder: 'asc' }
        },

        videos: {
          orderBy: { isPrimary: 'desc' }
        },

        awards: {
          include: {
            award: true,
            recipient: true
          }
        },

        links: {
          where: { isActive: true },
          orderBy: { type: 'asc' }
        },

        screenings: {
          include: {
            venue: true
          }
        }
      }
    })

    if (!movie) {
      return NextResponse.json(
        { error: 'Película no encontrada' },
        { status: 404 }
      )
    }

    // 4. Guardar en ambos cachés
    // Redis con TTL de 1 hora
    RedisClient.set(cacheKey, JSON.stringify(movie), REDIS_CACHE_TTL)
      .then(saved => {
        if (saved) {
          console.log(`✅ Película ${idOrSlug} guardada en Redis`);
        }
      })
      .catch(err => console.error('Error guardando en Redis:', err));

    // Memoria como fallback
    memoryCache.set(cacheKey, {
      data: movie,
      timestamp: now
    });

    // Limpiar caché de memoria viejo (mantener máximo 100 películas)
    if (memoryCache.size > 100) {
      const oldestKey = memoryCache.keys().next().value;
      if (oldestKey) {
        memoryCache.delete(oldestKey);
      }
    }

    return NextResponse.json(movie, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        'X-Cache': 'MISS',
        'X-Cache-Source': 'database',
        'X-Movie-Id': idOrSlug
      }
    })
  } catch (error) {
    console.error('Error fetching movie:', error)

    // Intentar servir desde caché stale si hay error
    const cacheKey = `movie:${/^\d+$/.test(params.id) ? 'id' : 'slug'}:${params.id}:v1`;
    const staleCache = memoryCache.get(cacheKey);

    if (staleCache) {
      console.log('⚠️ Sirviendo caché stale debido a error');
      return NextResponse.json(staleCache.data, {
        headers: {
          'Cache-Control': 'public, s-maxage=60',
          'X-Cache': 'STALE',
          'X-Cache-Source': 'memory-fallback'
        }
      });
    }

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
      ratingId: body.ratingId === 0 ? null : body.ratingId,
      genres: Array.isArray(body.genres)
        ? body.genres.filter((g: any) => g != null && g !== 0 && !isNaN(Number(g)))
        : [],
      countries: Array.isArray(body.countries)
        ? body.countries.filter((c: any) => c != null && c !== 0 && !isNaN(Number(c)))
        : body.countries || [],
      productionCompanies: Array.isArray(body.productionCompanies)
        ? body.productionCompanies.filter((pc: any) => pc != null && pc !== 0 && !isNaN(Number(pc)))
        : [],
      distributionCompanies: Array.isArray(body.distributionCompanies)
        ? body.distributionCompanies.filter((dc: any) => dc != null && dc !== 0 && !isNaN(Number(dc)))
        : [],
      themes: Array.isArray(body.themes)
        ? body.themes.filter((t: any) => t != null && t !== 0 && !isNaN(Number(t)))
        : [],
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

    if (validatedData.duration === 0) {
      validatedData.duration = null;
    }
    if (validatedData.durationSeconds === 0) {
      validatedData.durationSeconds = null;
    }

    // Verificar que la película existe y obtener slug para invalidar caché
    const existingMovie = await prisma.movie.findUnique({
      where: { id },
      select: { slug: true }
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
      productionCompanies,
      distributionCompanies,
      themes,
      alternativeTitles,
      links,
      screeningVenues,
      ...movieData
    } = validatedData

    // Usar transacción para actualizar todo
    const movie = await prisma.$transaction(async (tx) => {
      // 🔧 CORRECCIÓN CRÍTICA: Extraer synopsisLocked ANTES de crear movieDataClean
      const {
        colorTypeId,
        ratingId,
        releaseYear,
        releaseMonth,
        releaseDay,
        filmingStartYear,
        filmingStartMonth,
        filmingStartDay,
        filmingEndYear,
        filmingEndMonth,
        filmingEndDay,
        metaKeywords,
        synopsisLocked,  // ✅ Extraer synopsisLocked explícitamente
        ...movieDataClean
      } = movieData

      // 1. Actualizar datos básicos de la película
      const updatedMovie = await tx.movie.update({
        where: { id },
        data: {
          ...movieDataClean,
          synopsisLocked: synopsisLocked ?? false, // ✅ Usar variable directa (CORREGIDO)
          metaKeywords: Array.isArray(metaKeywords)
            ? metaKeywords
            : typeof metaKeywords === 'string'
              ? metaKeywords.split(',').map((k: string) => k.trim()).filter(Boolean)
              : [],
          releaseYear: releaseYear !== undefined ? releaseYear : null,
          releaseMonth: releaseMonth !== undefined ? releaseMonth : null,
          releaseDay: releaseDay !== undefined ? releaseDay : null,
          filmingStartYear: filmingStartYear !== undefined ? filmingStartYear : null,
          filmingStartMonth: filmingStartMonth !== undefined ? filmingStartMonth : null,
          filmingStartDay: filmingStartDay !== undefined ? filmingStartDay : null,
          filmingEndYear: filmingEndYear !== undefined ? filmingEndYear : null,
          filmingEndMonth: filmingEndMonth !== undefined ? filmingEndMonth : null,
          filmingEndDay: filmingEndDay !== undefined ? filmingEndDay : null,
          ...(ratingId !== undefined && {
            rating: (ratingId === null || ratingId === 0)
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
            data: cast.map((item, index) => ({
              movieId: id,
              personId: item.personId,
              characterName: item.characterName || null,
              billingOrder: item.billingOrder || index + 1,
              isPrincipal: item.isPrincipal || false,
              notes: item.notes || null
            }))
          })
        }
      }

      // 4. Actualizar crew
      if (crew) {
        await tx.movieCrew.deleteMany({ where: { movieId: id } })
        if (crew.length > 0) {
          await tx.movieCrew.createMany({
            data: crew.map((item, index) => ({
              movieId: id,
              personId: item.personId,
              role: item.role,
              roleId: item.roleId,
              billingOrder: item.billingOrder || index + 1
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

      // 6. Actualizar productoras
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

      // 7. Actualizar distribuidoras
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

      // 8. Actualizar temas
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

      // 9. Actualizar títulos alternativos
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

      // 10. Actualizar links oficiales
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

      // 11. Actualizar screening venues
      if (screeningVenues !== undefined) {
        await tx.movieScreening.deleteMany({ where: { movieId: id } })
        if (screeningVenues && screeningVenues.length > 0) {
          await tx.movieScreening.createMany({
            data: screeningVenues.map((sv: any) => ({
              movieId: id,
              venueId: sv.venueId,
              screeningDate: sv.screeningDate ? new Date(sv.screeningDate) : null,
              isPremiere: sv.isPremiere || false,
              isExclusive: sv.isExclusive || false
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
              location: true
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
          screenings: {
            include: {
              venue: true
            }
          },
          colorType: true,
        }
      })
    }, {
      maxWait: 10000,
      timeout: 30000,
    })

    // ⭐⭐⭐ INVALIDACIÓN COMPLETA DE CACHÉS ⭐⭐⭐
    console.log('🗑️ Invalidando cachés para película actualizada');

    // 1. Invalidar Redis
    const cacheKeysToInvalidate = [
      `movie:id:${id}:v1`,
      `movie:slug:${existingMovie.slug}:v1`,
      'home-feed:movies:v1'
    ];

    await Promise.all(
      cacheKeysToInvalidate.map(key =>
        RedisClient.del(key).catch(err =>
          console.error(`Error invalidando Redis key ${key}:`, err)
        )
      )
    );

    // 2. Invalidar caché en memoria
    cacheKeysToInvalidate.forEach(key => memoryCache.delete(key));

    // 3. Invalidar caché de Next.js (por si acaso, aunque ya no lo usamos principalmente)
    try {
      revalidateTag('movies');
      revalidateTag(`movie-${existingMovie.slug}`);
      revalidatePath(`/pelicula/${existingMovie.slug}`);
      revalidatePath('/');
      revalidatePath('/listados/peliculas');
      
      console.log(`✅ Next.js cache invalidado para: /pelicula/${existingMovie.slug}`);
    } catch (revalidateError) {
      console.log('ℹ️ Next.js revalidation skipped (using Redis cache primarily)');
    }

    console.log(`✅ Todos los cachés invalidados para película: ${existingMovie.slug}`);

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

    // Verificar que la película existe y obtener slug para invalidar caché
    const movie = await prisma.movie.findUnique({
      where: { id },
      select: { slug: true }
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

    // ⭐ INVALIDAR CACHÉS después de eliminar ⭐
    console.log('🗑️ Invalidando cachés para película eliminada');

    // 1. Invalidar Redis
    const cacheKeysToInvalidate = [
      `movie:id:${id}:v1`,
      `movie:slug:${movie.slug}:v1`,
      'home-feed:movies:v1'
    ];

    await Promise.all(
      cacheKeysToInvalidate.map(key =>
        RedisClient.del(key).catch(err =>
          console.error(`Error invalidando Redis key ${key}:`, err)
        )
      )
    );

    // 2. Invalidar en memoria
    cacheKeysToInvalidate.forEach(key => memoryCache.delete(key));

    // 3. Invalidar caché de Next.js
    try {
      revalidateTag('movies');
      revalidateTag(`movie-${movie.slug}`);
      revalidatePath(`/pelicula/${movie.slug}`);
      revalidatePath('/');
      revalidatePath('/listados/peliculas');
      
      console.log(`✅ Next.js cache invalidado para película eliminada: ${movie.slug}`);
    } catch (revalidateError) {
      console.log('ℹ️ Next.js revalidation skipped (using Redis cache primarily)');
    }

    console.log(`✅ Todos los cachés invalidados tras eliminar: ${movie.slug}`);

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